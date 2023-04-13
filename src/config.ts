import assert from "node:assert";
import fs from "node:fs";
import crypto from "node:crypto";

const {
  COGNITO_USER_POOL_ID,
  COGNITO_PUBLIC_KEY_PATH,
  SD_Q_PREFIX = "sd-jobs_",
  AWS_REGION,
  AWS_DEFAULT_REGION,
  COGNITO_IDP_ENDPOINT,
  SQS_ENDPOINT,
  DYNAMODB_ENDPOINT,
  USER_TABLE,
  PORT,
  WEBHOOK_USER_CREATE,
  WEBHOOK_PUBLIC_KEY_PATH,
  WEBHOOK_PRIVATE_KEY_PATH,
  WEBHOOK_SIG_HEADER = "x-dreamup-signature",
  COGNITO_SIG_HEADER = "x-cognito-signature",
} = process.env;

assert(COGNITO_USER_POOL_ID, "COGNITO_USER_POOL_ID is required");
assert(COGNITO_PUBLIC_KEY_PATH, "COGNITO_PUBLIC_KEY_PATH is required");
assert(WEBHOOK_PUBLIC_KEY_PATH, "WEBHOOK_PUBLIC_KEY_PATH is required");
assert(WEBHOOK_PRIVATE_KEY_PATH, "WEBHOOK_PRIVATE_KEY_PATH is required");

const rawCognitoPublicKey = fs.readFileSync(COGNITO_PUBLIC_KEY_PATH, "utf8");
const cognitoPublicKey = crypto.createPublicKey(rawCognitoPublicKey);

const rawWebhookPublicKey = fs.readFileSync(WEBHOOK_PUBLIC_KEY_PATH, "utf8");
const webhookPublicKey = crypto.createPublicKey(rawWebhookPublicKey);
const rawWebhookPrivateKey = fs.readFileSync(WEBHOOK_PRIVATE_KEY_PATH, "utf8");
const webhookPrivateKey = crypto.createPrivateKey(rawWebhookPrivateKey);

type configType = {
  aws: {
    region: string;
    endpoints: {
      cognito: string | undefined;
      dynamodb: string | undefined;
      sqs: string | undefined;
    };
  };
  idp: {
    cognito: {
      userPoolId: string;
      publicKey: crypto.KeyObject;
      header: string;
    };
  };
  db: {
    userTable: string;
  };
  queue: {
    sd_prefix: string;
  };
  server: {
    port: number;
  };
  webhooks: {
    events: {
      [x: string]: string;
    };
    publicKey: crypto.KeyObject;
    privateKey: crypto.KeyObject;
    header: string;
  };
};

const config: configType = {
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
      publicKey: cognitoPublicKey,
      header: COGNITO_SIG_HEADER,
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
  webhooks: {
    events: {},
    publicKey: webhookPublicKey,
    privateKey: webhookPrivateKey,
    header: WEBHOOK_SIG_HEADER,
  },
};

if (WEBHOOK_USER_CREATE) {
  config.webhooks.events["user.create"] = WEBHOOK_USER_CREATE;
}

export default config;
