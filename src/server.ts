import * as dotenv from "dotenv";
dotenv.config({ override: true, path: `./.env.${process.env.APP_ENV}` });
import config from "./config";

import Fastify, { FastifyInstance, FastifyServerOptions } from "fastify";
import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import cookie from "@fastify/cookie";
import userRoutes from "./routes/user";
import loginRoutes from "./routes/login";
import keyRoutes from "./routes/jwk";
import { rawUserSchema } from "./types";

export const build = async (opts: FastifyServerOptions) => {
  const server = Fastify(opts).withTypeProvider<JsonSchemaToTsProvider>();

  await server.register(require("@fastify/swagger"), {
    routePrefix: "/docs",
    exposeRoute: true,
    mode: "dynamic",
    openapi: {
      openapi: "3.0.3",
      info: {
        title: "Dreamup User API",
        description: "API for Dreamup User Management",
        version: config.server.version,
      },
      webhooks: {
        "user.created": {
          description: "User created",
          post: {
            requestBody: {
              description: "User created",
              content: {
                "application/json": {
                  schema: rawUserSchema,
                },
              },
            },
            responses: {
              "200": {
                description: "Return a 200 status to acknowledge the webhook",
              },
            },
          },
        },
        "user.updated": {
          description: "User updated",
          post: {
            requestBody: {
              description: "Updated User",
              content: {
                "application/json": {
                  schema: rawUserSchema,
                },
              },
            },
            responses: {
              "200": {
                description: "Return a 200 status to acknowledge the webhook",
              },
            },
          },
        },
        "user.deleted": {
          description: "User deleted",
          post: {
            requestBody: {
              description: "Deleted User",
              content: {
                "application/json": {
                  schema: rawUserSchema,
                },
              },
            },
            responses: {
              "200": {
                description: "Return a 200 status to acknowledge the webhook",
              },
            },
          },
        },
      },

      servers: [{ url: config.server.publicUrl }],
    },
    hideUntagged: false,
  });
  await server.register(require("@fastify/swagger-ui"), {
    routePrefix: "/docs",
    exposeRoute: true,
  });

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
  server.register(keyRoutes);

  await server.ready();
  return server;
};

export const start = async (server: FastifyInstance) => {
  try {
    await server.listen({ port: config.server.port, host: config.server.host });
  } catch (e) {
    server.log.error(e);
    process.exit(1);
  }
};
