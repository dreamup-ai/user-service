import { DatabaseTable } from "db-dynamo";
import { QueueManager } from "queue-sqs";
import Fastify from "fastify";
import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";

const queueManager = new QueueManager();
const userTable = new DatabaseTable("users");
const { PORT } = process.env;
const port = PORT ? parseInt(PORT, 10) : 3000;

const server = Fastify({
  logger: true,
}).withTypeProvider<JsonSchemaToTsProvider>();

server.get("/hc", async () => {
  return "OK";
});

server.listen({ port }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});
