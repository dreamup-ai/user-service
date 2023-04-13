import assert from "node:assert";
import fs from "node:fs";
import crypto from "node:crypto";

const {
  COGNITO_USER_POOL_ID,
  PUBLIC_KEY_PATH,
  SD_Q_PREFIX = "sd-jobs_",
  AWS_REGION,
  AWS_DEFAULT_REGION,
  COGNITO_IDP_ENDPOINT,
  SQS_ENDPOINT,
  DYNAMODB_ENDPOINT,
  USER_TABLE,
  PORT,
} = process.env;

assert(COGNITO_USER_POOL_ID, "COGNITO_USER_POOL_ID is required");
assert(PUBLIC_KEY_PATH, "PUBLIC_KEY_PATH is required");

const rawPublicKey = fs.readFileSync(PUBLIC_KEY_PATH, "utf8");
const publicKey = crypto.createPublicKey(rawPublicKey);

const config = {
  aws: {
    region: AWS_REGION || AWS_DEFAULT_REGION || "us-east-1",
    endpoints: {
      cognito: COGNITO_IDP_ENDPOINT,
      dynamodb: DYNAMODB_ENDPOINT,
      sqs: SQS_ENDPOINT,
    },
  },
  idp: {
    cognito: {
      userPoolId: COGNITO_USER_POOL_ID,
      publicKey,
    },
  },
  db: {
    userTable: USER_TABLE || "users",
  },
  queue: {
    sd_prefix: SD_Q_PREFIX,
  },
  server: {
    port: Number(PORT || 3000),
  },
};

export default config;
