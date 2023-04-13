import * as dotenv from "dotenv";
dotenv.config({ override: true, path: `./.env.${process.env.APP_ENV}` });

import {
  DynamoDBClient,
  CreateTableCommand,
  DeleteTableCommand,
} from "@aws-sdk/client-dynamodb";
import config from "./src/config";

const dynamo = new DynamoDBClient({
  region: config.aws.region,
  endpoint: config.aws.endpoints.dynamodb,
});

export const deleteTable = async () => {
  await dynamo.send(
    new DeleteTableCommand({
      TableName: config.db.userTable,
    })
  );
};

export const createTable = async () => {
  try {
    await dynamo.send(
      new CreateTableCommand({
        TableName: config.db.userTable,
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
  } catch (e: any) {
    if (e.name === "ResourceInUseException") {
      console.log("Table already exists, deleting");
      await deleteTable();
      console.log("Try again");
    }
  }
};

createTable().then(() => console.log("done"));
