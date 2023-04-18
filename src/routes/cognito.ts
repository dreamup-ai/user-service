import { FastifyInstance } from "fastify";
import {
  publicUserSchema,
  PublicUser,
  CognitoNewUserPayload,
  SignatureHeader,
  cognitoNewUserPayloadSchema,
  ErrorResponse,
  errorResponseSchema,
  signatureHeaderSchema,
} from "../types";

import { AdminUpdateUserAttributesCommand } from "@aws-sdk/client-cognito-identity-provider";
import config from "../config";
import { makeSourceValidator } from "../middleware/validate-source";
import { createOrUpdateUserByEmail } from "../crud";
import { cognito } from "../clients/cognito";

async function routes(server: FastifyInstance) {
  server.post<{
    Body: CognitoNewUserPayload;
    Headers: SignatureHeader;
    Response: PublicUser | ErrorResponse;
  }>(
    "/user/cognito",
    {
      schema: {
        body: cognitoNewUserPayloadSchema,
        headers: signatureHeaderSchema,
        response: {
          201: publicUserSchema,
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
    async (req, reply) => {
      const {
        request: { userAttributes },
      } = req.body;

      const { sub, email } = userAttributes;
      try {
        const user = await createOrUpdateUserByEmail(email, server.log, {
          "idp:cognito:id": sub,
        });

        // Update user attributes in cognito with our user ID
        const updateCommand = new AdminUpdateUserAttributesCommand({
          UserPoolId: config.idp.cognito.userPoolId,
          Username: sub,
          UserAttributes: [
            {
              Name: "custom:dreamup_id",
              Value: user.id,
            },
          ],
        });
        await cognito.send(updateCommand);

        return reply.status(201).send(user);
      } catch (e: any) {
        server.log.error(e);
        return reply.status(500).send({
          error: "Unable to create user",
        });
      }
    }
  );
}

export default routes;
