import Fastify, { FastifyInstance } from "fastify";
import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import cognitoRoutes from "./routes/cognito";
import userRoutes from "./routes/user";
import { IDatabaseTable, IQueueManager } from "interfaces";
import config from "./config";

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

  await server.register(cognitoRoutes, { userTable, queueManager });
  await server.register(userRoutes, { userTable, queueManager });

  return server;
};

export const start = async (server: FastifyInstance) => {
  await server.register(cognitoRoutes);
  try {
    await server.listen({ port: config.server.port });
  } catch (e) {
    server.log.error(e);
    process.exit(1);
  }
};
