import * as dotenv from "dotenv";
dotenv.config({ override: true, path: `./.env.${process.env.APP_ENV}` });
import config from "./config";

import Fastify, { FastifyInstance, FastifyServerOptions } from "fastify";
import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import userRoutes from "./routes/user";
import loginRoutes from "./routes/login";
import cookie from "@fastify/cookie";

export const build = async (opts: FastifyServerOptions) => {
  const server = Fastify(opts).withTypeProvider<JsonSchemaToTsProvider>();

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

  server.register(cookie);

  server.register(loginRoutes);
  server.register(userRoutes);

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
