import * as dotenv from "dotenv";
dotenv.config({ override: true, path: `./.env.${process.env.APP_ENV}` });
import config from "./config";

import Fastify, { FastifyInstance } from "fastify";
import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import userRoutes from "./routes/user";
import loginRoutes from "./routes/login";
import cookie from "@fastify/cookie";

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
  server.setErrorHandler((error, request, reply) => {
    const { message, statusCode, validation, validationContext } = error;
    if (validation) {
      reply.status(400).send({
        error: message,
      });
    } else {
      if (process.env.NODE_ENV === "production") {
        server.log.error(error);
      } else {
        console.error(error);
      }
      reply.status(statusCode || 500).send({
        error: message,
      });
    }
  });

  await server.register(cookie);

  await server.register(loginRoutes);
  await server.register(userRoutes);

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
