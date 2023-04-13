"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_dynamo_1 = require("db-dynamo");
const queue_sqs_1 = require("queue-sqs");
const userTable = new db_dynamo_1.DatabaseTable(process.env.USER_TABLE || "users");
const queueManager = new queue_sqs_1.QueueManager();
const server_1 = require("./server");
userTable
    .connect()
    .then(() => (0, server_1.build)(userTable, queueManager))
    .then((server) => {
    (0, server_1.start)(server);
})
    .catch((e) => {
    console.error(e);
    process.exit(1);
});
