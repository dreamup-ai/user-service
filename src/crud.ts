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

export const createOrUpdateUserByEmail = async (
  email: string,
  log: FastifyBaseLogger,
  extras: any = {}
) => {
  const existingUser = await getUserByEmail(email);
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
  // Convert any idp id number values to strings
  Object.keys(item)
    .filter((key) => /^idp:\w+:id$/.test(key))
    .filter((key) => !!item[key].N)
    .forEach((key) => {
      item[key] = { S: item[key].N };
    });
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
  id: string
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

export const getUserById = async (id: string): Promise<RawUser | null> => {
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

export const getUserByGoogleId = async (id: string) => {
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

export const getUserByEmail = async (email: string) => {
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

export const getUserByDiscordId = async (id: string) => {
  const queryCmd = new QueryCommand({
    TableName: userTable,
    IndexName: "discord_id",
    KeyConditionExpression: "#id = :id",
    ExpressionAttributeNames: {
      "#id": "idp:discord:id",
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

/**
 * Returns an object with the UpdateExpression, ExpressionAttributeNames, and ExpressionAttributeValues
 * for an arbitrarily nested update. This is useful for updating nested objects in DynamoDB.
 *
 * Example:
 * { some: { deeply: { nested: { value: 1 } } } }
 *
 * Will return:
 * {
 *  UpdateExpression: SET #K0.#K1.#K2.#K3 = :val0,
 *  ExpressionAttributeNames: { "#K0": "some", "#K1": "deeply", "#K2": "nested", "#K3": "value" },
 *  ExpressionAttributeValues: { ":val0": { N: "1" } }
 * }
 *
 * @param data
 * @returns
 */
export const getUpdateExpressionForArbitrarilyNestedUpdate = (data: any) => {
  let UpdateExpression: string = "";
  const ExpressionAttributeNames: any = {};
  const ExpressionAttributeValues: any = {};
  const subExpressions: string[] = [];

  const recurse = (obj: any, path: string[] = []) => {
    Object.keys(obj).forEach((key) => {
      const value = obj[key];
      const i = Object.keys(ExpressionAttributeNames).length;
      const keyVar = `#K${i}`;
      ExpressionAttributeNames[keyVar] = key;

      if (typeof value === "object") {
        /**
         * Recurse into the nested object, keeping a path like
         * ["#K0", "#K1", "#K2", "#K3"]
         */
        recurse(value, [...path, keyVar]);
      } else {
        const i = Object.keys(ExpressionAttributeValues).length;
        ExpressionAttributeValues[`:val${i}`] = Item.fromObject(value);

        /**
         * The update expression includes the full nested path, e.g.
         * #K0.#K1.#K2.#K3 = :val0
         * */
        subExpressions.push(`${[...path, keyVar].join(".")} = :val${i}`);
      }
    });
  };
  recurse(data);

  UpdateExpression = `SET ${subExpressions.join(", ")}`;

  return {
    UpdateExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
  };
};

export const updateUserById = async (id: string, data: any) => {
  const updateParams = {
    TableName: userTable,
    Key: {
      id: { S: id },
    },
    ...getUpdateExpressionForArbitrarilyNestedUpdate(data),
    ReturnValues: "ALL_NEW",
    ConditionExpression: "attribute_exists(id)",
  };

  const updateCmd = new UpdateItemCommand(updateParams);
  try {
    const { Attributes } = await dynamodb.send(updateCmd);
    return Item.toObject(Attributes);
  } catch (e: any) {
    if (e.name === "ConditionalCheckFailedException") {
      return null;
    }
    throw e;
  }
};
