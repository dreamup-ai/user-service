import Fastify, { FastifyInstance } from "fastify";
import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import cognitoRoutes from "./routes/cognito";

const { PORT } = process.env;
const port = PORT ? parseInt(PORT, 10) : 3000;

export const build = async () => {
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

  await server.register(cognitoRoutes);

  return server;
};

export const start = async (server: FastifyInstance) => {
  await server.register(cognitoRoutes);
  try {
    await server.listen({ port });
  } catch (e) {
    server.log.error(e);
    process.exit(1);
  }
};
