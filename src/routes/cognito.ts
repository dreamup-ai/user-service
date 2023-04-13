import { FastifyInstance } from "fastify";
import {
  userSchema,
  User,
  CognitoNewUserPayload,
  NewUserHeader,
  cognitoNewUserPayloadSchema,
} from "../types";
import { v4 as uuidv4 } from "uuid";
import crypto from "node:crypto";
import { IDatabaseTable, IQueueManager } from "interfaces";
const {
  CognitoIdentityProviderClient,
  AdminUpdateUserAttributesCommand,
} = require("@aws-sdk/client-cognito-identity-provider");
import config from "../config";

export const cognito = new CognitoIdentityProviderClient({
  region: config.aws.region,
  endpoint: config.aws.endpoints.cognito,
});

async function routes(
  server: FastifyInstance,
  {
    userTable,
    queueManager,
  }: { userTable: IDatabaseTable; queueManager: IQueueManager }
) {
  server.post<{
    Body: CognitoNewUserPayload;
    Headers: NewUserHeader;
    Response: User;
  }>(
    "/user/cognito",
    {
      schema: {
        body: cognitoNewUserPayloadSchema,
        response: {
          201: userSchema,
        },
      },
      preValidation: async (req, res) => {
        // Request must be signed
        const { "x-idp-signature": signature } = req.headers;
        if (!signature) {
          return res.status(400).send({
            error: "Missing signature",
          });
        }

        // Request must be from Cognito
        const { triggerSource, userPoolId } = req.body;
        if (triggerSource !== "PostConfirmation_ConfirmSignUp") {
          return res.status(400).send({
            error: "Invalid trigger source",
          });
        }
        if (userPoolId !== config.idp.cognito.userPoolId) {
          return res.status(400).send({
            error: "Invalid user pool ID",
          });
        }

        // Request must be valid
        const isVerified = crypto.verify(
          "sha256",
          Buffer.from(JSON.stringify(req.body)),
          config.idp.cognito.publicKey,
          Buffer.from(signature, "base64")
        );
        if (!isVerified) {
          return res.status(401).send({
            error: "Invalid signature",
          });
        }
      },
    },

    async (req, res) => {
      const {
        userPoolId,
        request: { userAttributes },
      } = req.body;

      const { sub, email } = userAttributes;
      const user = {
        id: uuidv4(),
        email,
        "idp:cognito": {
          userPoolId,
          userId: sub,
        },
        preferences: {},
        features: {},
        created: Date.now(),
      };
      try {
        const [created, queue, cog] = await Promise.all([
          // Create the user
          userTable.create(user),

          // Create the user's queue
          queueManager.createQueue(`${config.queue.sd_prefix}${user.id}`),

          // Update the user's attributes in the idp
          cognito.send(
            new AdminUpdateUserAttributesCommand({
              UserPoolId: userPoolId,
              Username: sub,
              UserAttributes: [
                {
                  Name: "custom:dream_id",
                  Value: user.id,
                },
              ],
            })
          ),
        ]);

        return res.status(201).send(created);
      } catch (e: any) {
        console.error(e);
        return res.status(500).send({
          error: e.message,
        });
      }
    }
  );
}

export default routes;
