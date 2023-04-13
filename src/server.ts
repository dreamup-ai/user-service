import Fastify, { FastifyInstance } from "fastify";
import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import cognitoRoutes from "./routes/cognito";
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

  await server.register(cognitoRoutes, { userTable, queueManager });

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
