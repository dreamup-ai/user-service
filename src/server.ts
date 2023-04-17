import Fastify, { FastifyInstance } from "fastify";
import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import cognitoRoutes from "./routes/cognito";
import userRoutes from "./routes/user";
import identityProviders from "./idp";
import { IDatabaseTable, IQueueManager } from "interfaces";
import config from "./config";
// import type { FastifyCookieOptions } from "@fastify/cookie";
import cookie from "@fastify/cookie";

export const build = async (
  userTable: IDatabaseTable,
  queueManager: IQueueManager
) => {
  const server = Fastify({
    logger: true,
  }).withTypeProvider<JsonSchemaToTsProvider>();

  server.get(
    "/hc",
    {
      schema: {
        response: {
          200: {
            type: "string",
          },
        },
      },
    },
    async () => {
      return "OK";
    }
  );
  server.setErrorHandler((error, request, reply) => {
    const { message, statusCode, validation, validationContext } = error;
    if (validation) {
      reply.status(400).send({
        error: message,
      });
    } else {
      reply.status(statusCode || 500).send({
        error: message,
      });
    }
  });

  await server.register(cookie);

  await server.register(identityProviders);
  await server.register(cognitoRoutes, { userTable, queueManager });
  await server.register(userRoutes, { userTable, queueManager });

  return server;
};

export const start = async (server: FastifyInstance) => {
  try {
    await server.listen({ port: config.server.port });
  } catch (e) {
    server.log.error(e);
    process.exit(1);
  }
};
