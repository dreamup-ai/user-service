import * as dotenv from "dotenv";
dotenv.config({ override: true, path: `./.env.${process.env.APP_ENV}` });
import config from "./config";

import { DatabaseTable } from "db-dynamo";
import { QueueManager } from "queue-sqs";

const userTable = new DatabaseTable(config.db.userTable);
const queueManager = new QueueManager();

import { start, build } from "./server";

userTable
  .connect()
  .then(() => build(userTable, queueManager))
  .then((server) => {
    start(server);
  })
  .catch((e: any) => {
    console.error(e);
    process.exit(1);
  });
