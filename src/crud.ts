import config from "./config";
import { RawUser } from "./types";
import { sendWebhook } from "./webhooks";
import { FastifyBaseLogger } from "fastify";
import { client as dynamodb } from "./clients/dynamo";
import {
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
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
  const existingUser = await getUserByEmail(email, log);
  if (existingUser) {
    const updateParams = {
      TableName: userTable,
      Key: {
        id: { S: existingUser.id },
      },
      UpdateExpression: `SET ${Object.keys(extras)
        .map((_, i) => `#K${i} = :val${i}`)
        .join(",")}`,
      ExpressionAttributeNames: {} as any,
      ExpressionAttributeValues: {} as any,
      ReturnValues: "ALL_NEW",
    };
    Object.keys(extras).forEach((key, i) => {
      updateParams.ExpressionAttributeNames[`#K${i}`] = key;
      updateParams.ExpressionAttributeValues[`:val${i}`] = Item.fromObject(
        extras[key]
      );
    });
    const updateCmd = new UpdateItemCommand(updateParams);
    const { Attributes } = await dynamodb.send(updateCmd);
    const user: RawUser = Item.toObject(Attributes);
    sendWebhook("user.updated", user, log);
    return user;
  }
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
  const item = Item.fromObject(user);
  if (item["idp:google:id"]?.N) {
    item["idp:google:id"] = { S: item["idp:google:id"].N };
  }
  const command = new PutItemCommand({
    TableName: userTable,
    Item: item,
  });
  try {
    await dynamodb.send(command);

    // Only create the queue if the user doesn't already exist
    try {
      await queueManager.createQueue(user._queue);
    } catch (e: any) {
      console.log(e);
    }
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

export const getUserByGoogleId = async (id: string, log: FastifyBaseLogger) => {
  const queryCmd = new QueryCommand({
    TableName: userTable,
    IndexName: "google_id",
    KeyConditionExpression: "#id = :id",
    ExpressionAttributeNames: {
      "#id": "idp:google:id",
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

export const getUserByEmail = async (email: string, log: FastifyBaseLogger) => {
  const queryCmd = new QueryCommand({
    TableName: userTable,
    IndexName: "email",
    KeyConditionExpression: "#email = :email",
    ExpressionAttributeNames: {
      "#email": "email",
    },
    ExpressionAttributeValues: {
      ":email": { S: email },
    },
  });
  const { Items } = await dynamodb.send(queryCmd);
  if (Items && Items.length > 0) {
    return Item.toObject(Items[0]);
  }
  return null;
};
