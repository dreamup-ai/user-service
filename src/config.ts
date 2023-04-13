import assert from "node:assert";
import fs from "node:fs";
import crypto from "node:crypto";

const {
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
  COGNITO_USER_POOL_ID,
  COGNITO_PUBLIC_KEY_PATH,
  COGNITO_CLIENT_ID,
  COGNITO_CLIENT_SECRET,
  COGNITO_AUTH_HOST,
  COGNITO_TOKEN_HOST,
  COGNITO_AUTH_PATH,
  COGNITO_TOKEN_PATH,
  COGNITO_REDIRECT_PATH = "/login/cognito",
  COGNITO_CALLBACK_URI = "http://localhost:3000/login/cognito/callback",
} = process.env;

assert(COGNITO_USER_POOL_ID, "COGNITO_USER_POOL_ID is required");
assert(COGNITO_PUBLIC_KEY_PATH, "COGNITO_PUBLIC_KEY_PATH is required");
assert(WEBHOOK_PUBLIC_KEY_PATH, "WEBHOOK_PUBLIC_KEY_PATH is required");
assert(WEBHOOK_PRIVATE_KEY_PATH, "WEBHOOK_PRIVATE_KEY_PATH is required");
assert(COGNITO_CLIENT_ID, "COGNITO_CLIENT_ID is required");
assert(COGNITO_CLIENT_SECRET, "COGNITO_CLIENT_SECRET is required");
assert(COGNITO_AUTH_HOST, "COGNITO_AUTH_HOST is required");
assert(COGNITO_TOKEN_HOST, "COGNITO_TOKEN_HOST is required");
assert(COGNITO_AUTH_PATH, "COGNITO_AUTH_PATH is required");
assert(COGNITO_TOKEN_PATH, "COGNITO_TOKEN_PATH is required");

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
      signatureHeader: string;
      clientId: string;
      clientSecret: string;
      authHost: string;
      tokenHost: string;
      authPath: string;
      tokenPath: string;
      redirectPath: string;
      callbackUri: string;
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
    signatureHeader: string;
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
      signatureHeader: COGNITO_SIG_HEADER,
      clientId: COGNITO_CLIENT_ID,
      clientSecret: COGNITO_CLIENT_SECRET,
      authHost: COGNITO_AUTH_HOST,
      tokenHost: COGNITO_TOKEN_HOST,
      authPath: COGNITO_AUTH_PATH,
      tokenPath: COGNITO_TOKEN_PATH,
      redirectPath: COGNITO_REDIRECT_PATH,
      callbackUri: COGNITO_CALLBACK_URI,
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
    signatureHeader: WEBHOOK_SIG_HEADER,
  },
};

if (WEBHOOK_USER_CREATE) {
  config.webhooks.events["user.create"] = WEBHOOK_USER_CREATE;
}

export default config;
