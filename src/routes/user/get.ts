import { FastifyInstance } from "fastify";
import {
  getUserByCognitoId,
  getUserByDiscordId,
  getUserByEmail,
  getUserByGoogleId,
  getUserById,
} from "../../crud";
import {
  PublicUser,
  ErrorResponse,
  publicUserSchema,
  errorResponseSchema,
  IdParam,
  RawUser,
  SignatureHeader,
  idParamSchema,
  rawUserSchema,
  signatureHeaderSchema,
} from "../../types";
import {
  dreamupInternal,
  dreamupUserSession,
} from "../../middleware/audiences";

const routes = (server: FastifyInstance, _: any, done: Function) => {
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
      preValidation: [dreamupUserSession],
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

  done();
};

export default routes;
