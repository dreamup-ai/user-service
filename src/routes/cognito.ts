import { FastifyInstance } from "fastify";
import {
  userSchema,
  User,
  CognitoNewUserPayload,
  NewUserHeader,
  cognitoNewUserPayloadSchema,
  ErrorResponse,
  errorResponseSchema,
} from "../types";
import { v4 as uuidv4 } from "uuid";
import { IDatabaseTable, IQueueManager } from "interfaces";
import {
  CognitoIdentityProviderClient,
  AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import config from "../config";
import { makeSourceValidator } from "../middleware/validate-source";
import { createUser } from "../crud";

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
    Response: User | ErrorResponse;
  }>(
    "/user/cognito",
    {
      schema: {
        body: cognitoNewUserPayloadSchema,
        response: {
          201: userSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          409: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
      preValidation: [
        makeSourceValidator(
          config.idp.cognito.publicKey,
          config.idp.cognito.signatureHeader
        ),
        async (req, res) => {
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
        },
      ],
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
        const [created, cog] = await Promise.all([
          createUser({
            user,
            userTable,
            queueManager,
            log: server.log,
          }),
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
        if (e.name === "UserExistsError") {
          return res.status(409).send({ error: e.message });
        }
        server.log.error(e);
        return res.status(500).send({
          error: e.message,
        });
      }
    }
  );
}

export default routes;
