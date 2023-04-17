import config from "./config";
import { RawUser } from "./types";
import { sendWebhook } from "./webhooks";
import { FastifyBaseLogger } from "fastify";
import { client as dynamodb } from "./clients/dynamo";
import { GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { Item } from "dynamo-tools";
import { queueManager } from "./clients/queue";
import { QueryCommand } from "@aws-sdk/client-dynamodb";

const { userTable } = config.db;

export const createUser = async (
  email: string,
  log: FastifyBaseLogger,
  extras: any = {}
) => {
  const id = uuidv4();
  const user: RawUser = {
    id,
    email,
    created: Date.now(),
    preferences: {},
    features: {},
    _queue: `${config.queue.sd_prefix}${id}`,
    ...extras,
  };
  const command = new PutItemCommand({
    TableName: userTable,
    Item: Item.fromObject(user),
    ConditionExpression: "attribute_not_exists(email)",
  });
  try {
    await dynamodb.send(command);

    // Only create the queue if the user doesn't already exist
    await queueManager.createQueue(user._queue);
  } catch (err: any) {
    if (err.code === "ConditionalCheckFailedException") {
      log.warn(`User ${email} already exists in database, skipping creation`);
    } else {
      throw err;
    }
  }
  sendWebhook("user.created", user, log);
  return user;
};

export const getUserByCognitoId = async (
  id: string,
  log: FastifyBaseLogger
): Promise<RawUser | null> => {
  const queryCmd = new QueryCommand({
    TableName: userTable,
    IndexName: "cognito_id",
    KeyConditionExpression: "#id = :id",
    ExpressionAttributeNames: {
      "#id": "idp:cognito:id",
    },
    ExpressionAttributeValues: {
      ":id": { S: id },
    },
  });
  const { Items } = await dynamodb.send(queryCmd);
  if (Items && Items.length > 0) {
    return Item.toObject(Items[0]);
  }
  return null;
};

export const getUserById = async (
  id: string,
  log: FastifyBaseLogger
): Promise<RawUser | null> => {
  const getCmd = new GetItemCommand({
    TableName: userTable,
    Key: Item.fromObject({ id }),
  });
  const { Item: item } = await dynamodb.send(getCmd);
  if (item) {
    return Item.toObject(item);
  }
  return null;
};
