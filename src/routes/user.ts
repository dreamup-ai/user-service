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
} from "../types";
import config from "../config";
import { makeSessionValidator } from "../middleware/validate-session";
import {
  getUserByCognitoId,
  getUserByDiscordId,
  getUserByEmail,
  getUserByGoogleId,
  getUserById,
} from "../crud";
import { makeSourceValidator } from "../middleware/validate-source";

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
    Params: IdParam;
  }>(
    "/user/:id/cognito",
    {
      schema: {
        params: idParamSchema,
        response: {
          200: rawUserSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preValidation: [],
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
    Params: IdParam;
  }>(
    "/user/:id/google",
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
    Params: IdParam;
  }>(
    "/user/:id/discord",
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
};

export default routes;
