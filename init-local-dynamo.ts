import * as dotenv from "dotenv";
dotenv.config({ override: true, path: `./.env.${process.env.APP_ENV}` });

import { DynamoDBClient, CreateTableCommand } from "@aws-sdk/client-dynamodb";
import config from "./src/config";

const dynamo = new DynamoDBClient({
  region: config.aws.region,
  endpoint: config.aws.endpoints.dynamodb,
});

export const createTable = async () => {
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
};

createTable().then(() => console.log("done"));
