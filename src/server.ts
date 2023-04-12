import Fastify from "fastify";
import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import routes from "./routes/create-user";

const { PORT } = process.env;
const port = PORT ? parseInt(PORT, 10) : 3000;

export const server = Fastify({
  logger: true,
}).withTypeProvider<JsonSchemaToTsProvider>();

const hcOpts = {
  schema: {
    response: {
      200: {
        type: "string",
      },
    },
  },
};

server.get("/hc", hcOpts, async () => {
  return "OK";
});

export const start = async () => {
  await server.register(routes);
  try {
    await server.listen({ port });
  } catch (e) {
    server.log.error(e);
    process.exit(1);
  }
};
