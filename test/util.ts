import crypto from "node:crypto";
import fs from "node:fs";
import assert from "node:assert";
import {
  CreateTableCommand,
  DeleteTableCommand,
} from "@aws-sdk/client-dynamodb";
import { Cache } from "dynamo-tools";
import { build } from "../src/server";
import { FastifyInstance } from "fastify";

const { COGNITO_PRIVATE_KEY_PATH, AWS_REGION, DYNAMODB_ENDPOINT, USER_TABLE } =
  process.env;

const cache = new Cache({
  region: AWS_REGION,
  endpoint: DYNAMODB_ENDPOINT,
});

export const createTable = async () => {
  await cache.client.send(
    new CreateTableCommand({
      TableName: USER_TABLE,
      AttributeDefinitions: [
        {
          AttributeName: "id",
          AttributeType: "S",
        },
        {
          AttributeName: "email",
          AttributeType: "S",
        },
      ],
      KeySchema: [
        {
          AttributeName: "id",
          KeyType: "HASH",
        },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "email",
          KeySchema: [
            {
              AttributeName: "email",
              KeyType: "HASH",
            },
          ],
          Projection: {
            ProjectionType: "ALL",
          },
        },
      ],
      BillingMode: "PAY_PER_REQUEST",
    })
  );
};

export const deleteTable = async () => {
  await cache.client.send(
    new DeleteTableCommand({
      TableName: USER_TABLE,
    })
  );
};

export const clearTable = async () => {
  await cache.deleteAll({ table: USER_TABLE });
};

assert(COGNITO_PRIVATE_KEY_PATH, "PRIVATE_KEY_PATH is required");

const rawPrivateKey = fs
  .readFileSync(COGNITO_PRIVATE_KEY_PATH)
  .toString("utf8");
const cognitoPrivateKey = crypto.createPrivateKey(rawPrivateKey);

export function sign(
  payload: string,
  privateKey: crypto.KeyObject = cognitoPrivateKey
) {
  const signature = crypto.sign("sha256", Buffer.from(payload), privateKey);
  return signature.toString("base64");
}

let server: FastifyInstance;
export const getServer = async () => {
  if (!server) {
    server = await build();
  }
  return server;
};
