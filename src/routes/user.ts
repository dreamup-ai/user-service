import { FastifyInstance } from "fastify";
import {
  publicUserSchema,
  PublicUser,
  errorResponseSchema,
  ErrorResponse,
  RawUser,
  rawUserSchema,
  IdParam,
  idParamSchema,
  SignatureHeader,
  signatureHeaderSchema,
  CognitoNewUserPayload,
  cognitoNewUserPayloadSchema,
} from "../types";
import config from "../config";
import { makeSessionValidator } from "../middleware/validate-session";
import {
  createOrUpdateUserByEmail,
  getUserByCognitoId,
  getUserByDiscordId,
  getUserByEmail,
  getUserByGoogleId,
  getUserById,
} from "../crud";
import { makeSourceValidator } from "../middleware/validate-source";
import { AdminUpdateUserAttributesCommand } from "@aws-sdk/client-cognito-identity-provider";
import { cognito } from "../clients/cognito";

const dreamupInternal = makeSourceValidator(
  config.webhooks.publicKey,
  config.webhooks.signatureHeader
);

const routes = async (server: FastifyInstance) => {
  server.get<{
    Reply: PublicUser | ErrorResponse;
  }>(
    "/user/me",
    {
      schema: {
        response: {
          200: publicUserSchema,
          401: errorResponseSchema,
        },
      },
      preValidation: [makeSessionValidator(config.session.publicKey)],
    },
    async (request, reply) => {
      const { user } = request;
      if (!user) {
        return reply.status(401).send({ error: "Unauthorized" });
      }
      const { userId } = user;
      const userRecord = await getUserById(userId);
      if (!userRecord) {
        return reply.status(401).send({ error: "Unauthorized" });
      }
      return userRecord;
    }
  );

  /**
   * This route is used internally by the Dreamup System to fetch user data
   * by dreamup ID. It is not exposed to the public.
   */
  server.get<{
    Reply: RawUser | ErrorResponse;
    Params: IdParam;
    Headers: SignatureHeader;
  }>(
    "/user/:id",
    {
      schema: {
        params: idParamSchema,
        headers: signatureHeaderSchema,
        response: {
          200: rawUserSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preValidation: [dreamupInternal],
    },
    async (request, reply) => {
      const { id } = request.params;
      const userRecord = await getUserById(id);
      if (!userRecord) {
        return reply.status(404).send({ error: "Not Found" });
      }
      return userRecord;
    }
  );

  /**
   * This route is used internally by the Dreamup System to fetch user data
   * by cognito ID. It is not exposed to the public.
   */
  server.get<{
    Reply: RawUser | ErrorResponse;
    Headers: SignatureHeader;
    Params: IdParam;
  }>(
    "/user/:id/cognito",
    {
      schema: {
        params: idParamSchema,
        headers: signatureHeaderSchema,
        response: {
          200: rawUserSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preValidation: [dreamupInternal],
    },
    async (request, reply) => {
      const { id } = request.params;
      const userRecord = await getUserByCognitoId(id);
      if (!userRecord) {
        return reply.status(404).send({ error: "Not Found" });
      }
      return userRecord;
    }
  );

  /**
   * This route is used internally by the Dreamup System to fetch user data
   * by google ID. It is not exposed to the public.
   */
  server.get<{
    Reply: RawUser | ErrorResponse;
    Headers: SignatureHeader;
    Params: IdParam;
  }>(
    "/user/:id/google",
    {
      schema: {
        params: idParamSchema,
        headers: signatureHeaderSchema,
        response: {
          200: rawUserSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preValidation: [dreamupInternal],
    },
    async (request, reply) => {
      const { id } = request.params;
      const userRecord = await getUserByGoogleId(id);
      if (!userRecord) {
        return reply.status(404).send({ error: "Not Found" });
      }
      return userRecord;
    }
  );

  /**
   * This route is used internally by the Dreamup System to fetch user data
   * by discord ID. It is not exposed to the public.
   */
  server.get<{
    Reply: RawUser | ErrorResponse;
    Headers: SignatureHeader;
    Params: IdParam;
  }>(
    "/user/:id/discord",
    {
      schema: {
        params: idParamSchema,
        headers: signatureHeaderSchema,
        response: {
          200: rawUserSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preValidation: [dreamupInternal],
    },
    async (request, reply) => {
      const { id } = request.params;
      const userRecord = await getUserByDiscordId(id);
      if (!userRecord) {
        return reply.status(404).send({ error: "Not Found" });
      }
      return userRecord;
    }
  );

  /**
   * This route is used internally by the Dreamup System to fetch user data
   * by email. It is not exposed to the public.
   */
  server.get<{
    Reply: RawUser | ErrorResponse;
    Params: IdParam;
  }>(
    "/user/:id/email",
    {
      schema: {
        params: idParamSchema,
        response: {
          200: rawUserSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preValidation: [dreamupInternal],
    },
    async (request, reply) => {
      const { id } = request.params;
      const userRecord = await getUserByEmail(id);
      if (!userRecord) {
        return reply.status(404).send({ error: "Not Found" });
      }
      return userRecord;
    }
  );

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
};

export default routes;
