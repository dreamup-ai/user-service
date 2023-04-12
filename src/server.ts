import { DatabaseTable } from "db-dynamo";
import { QueueManager } from "queue-sqs";
import Fastify from "fastify";
import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";

const queueManager = new QueueManager();
const userTable = new DatabaseTable("users");
const { PORT } = process.env;
const port = PORT ? parseInt(PORT, 10) : 3000;

export const server = Fastify({
  logger: true,
}).withTypeProvider<JsonSchemaToTsProvider>();

server.get("/hc", async () => {
  return "OK";
});

export const start = async () => {
  try {
    await server.listen({ port });
  } catch (e) {
    server.log.error(e);
    process.exit(1);
  }
};
