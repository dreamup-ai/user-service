import { FastifyInstance } from "fastify";
import {
  publicUserSchema,
  PublicUser,
  errorResponseSchema,
  ErrorResponse,
} from "../types";
import config from "../config";
import { makeSessionValidator } from "../middleware/validate-session";
import { getUserById } from "../crud";

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
      const userRecord = await getUserById(userId, server.log);
      if (!userRecord) {
        return reply.status(401).send({ error: "Unauthorized" });
      }
      return userRecord;
    }
  );
};

export default routes;
