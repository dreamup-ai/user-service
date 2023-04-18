import { FastifyInstance } from "fastify";
import { updateUserById } from "../../crud";
import {
  dreamupInternal,
  dreamupUserSession,
} from "../../middleware/audiences";
import {
  UserUpdate,
  PublicUser,
  ErrorResponse,
  userUpdateSchema,
  publicUserSchema,
  errorResponseSchema,
  SystemUserUpdate,
  RawUser,
  IdParam,
  SignatureHeader,
  systemUserUpdateSchema,
  idParamSchema,
  signatureHeaderSchema,
  rawUserSchema,
} from "../../types";

const routes = async (server: FastifyInstance) => {
  server.put<{
    Body: UserUpdate;
    Reply: PublicUser | ErrorResponse;
  }>(
    "/user/me",
    {
      schema: {
        body: userUpdateSchema,
        response: {
          200: publicUserSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
      preValidation: [dreamupUserSession],
    },
    async (req, reply) => {
      const { user } = req;
      if (!user) {
        return reply.status(401).send({ error: "Unauthorized" });
      }
      const { userId } = user;
      const { body } = req;
      try {
        const updatedUser = await updateUserById(userId, body);
        if (!updatedUser) {
          return reply.status(500).send({ error: "Unable to update user" });
        }
        return updatedUser;
      } catch (e: any) {
        server.log.error(e);
        return reply.status(500).send({
          error: "Unable to update user",
        });
      }
    }
  );

  server.put<{
    Body: SystemUserUpdate;
    Reply: RawUser | ErrorResponse;
    Params: IdParam;
    Headers: SignatureHeader;
  }>(
    "/user/:id",
    {
      schema: {
        body: systemUserUpdateSchema,
        params: idParamSchema,
        headers: signatureHeaderSchema,
        response: {
          200: rawUserSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
      preValidation: [dreamupInternal],
    },
    async (req, reply) => {
      const { id } = req.params;
      const { body } = req;
      try {
        const updatedUser = await updateUserById(id, body);
        if (!updatedUser) {
          return reply.status(404).send({ error: "User Not Found" });
        }
        return updatedUser;
      } catch (e: any) {
        server.log.error(e);
        return reply.status(500).send({
          error: "Unable to update user",
        });
      }
    }
  );
};

export default routes;
