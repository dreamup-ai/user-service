import assert from "node:assert";
import fs from "node:fs";
import crypto from "node:crypto";

import { version } from "../package.json";

const {
  SD_Q_PREFIX = "sd-jobs_",
  AWS_REGION,
  AWS_DEFAULT_REGION,
  COGNITO_IDP_ENDPOINT,
  SQS_ENDPOINT,
  DYNAMODB_ENDPOINT,
  USER_TABLE,
  PORT,
  HOST = "localhost",
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
  SESSION_PRIVATE_KEY_PATH,
  SESSION_PUBLIC_KEY_PATH,
  SESSION_DURATION = "24h",
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_PATH = "/login/google",
  GOOGLE_CALLBACK_URI = "http://localhost:3000/login/google/callback",
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  DISCORD_REDIRECT_PATH = "/login/discord",
  DISCORD_CALLBACK_URI = "http://localhost:3000/login/discord/callback",
  DISCORD_API_HOST = "https://discord.com/api/v10",
  DREAMUP_SESSION_COOKIE_NAME = "dreamup_session",
  DREAMUP_SESSION_COOKIE_DOMAIN = "localhost",
  DREAMUP_IDP_COOKIE_NAME = "dreamup_idp",
  PUBLIC_URL = "http://localhost:3000",
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
assert(SESSION_PRIVATE_KEY_PATH, "SESSION_PRIVATE_KEY_PATH is required");
assert(SESSION_PUBLIC_KEY_PATH, "SESSION_PUBLIC_KEY_PATH is required");

const rawCognitoPublicKey = fs.readFileSync(COGNITO_PUBLIC_KEY_PATH, "utf8");
const cognitoPublicKey = crypto.createPublicKey(rawCognitoPublicKey);

const rawWebhookPublicKey = fs.readFileSync(WEBHOOK_PUBLIC_KEY_PATH, "utf8");
const webhookPublicKey = crypto.createPublicKey(rawWebhookPublicKey);
const rawWebhookPrivateKey = fs.readFileSync(WEBHOOK_PRIVATE_KEY_PATH, "utf8");
const webhookPrivateKey = crypto.createPrivateKey(rawWebhookPrivateKey);

const rawSessionPublicKey = fs.readFileSync(SESSION_PUBLIC_KEY_PATH, "utf8");
const sessionPublicKey = crypto.createPublicKey(rawSessionPublicKey);
const rawSessionPrivateKey = fs.readFileSync(SESSION_PRIVATE_KEY_PATH, "utf8");
const sessionPrivateKey = crypto.createPrivateKey(rawSessionPrivateKey);

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
    google?: {
      clientId: string;
      clientSecret: string;
      redirectPath: string;
      callbackUri: string;
    };
    discord?: {
      clientId: string;
      clientSecret: string;
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
    host: string;
    publicUrl: string;
    version: string;
  };
  webhooks: {
    events: {
      [x: string]: string[];
    };
    publicKey: crypto.KeyObject;
    privateKey: crypto.KeyObject;
    signatureHeader: string;
  };
  session: {
    publicKey: crypto.KeyObject;
    privateKey: crypto.KeyObject;
    duration: string;
    cookieName: string;
    cookieDomain: string;
    idpCookieName: string;
  };
  discord: {
    apiHost: string;
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
    host: HOST,
    publicUrl: PUBLIC_URL,
    version,
  },
  webhooks: {
    events: {},
    publicKey: webhookPublicKey,
    privateKey: webhookPrivateKey,
    signatureHeader: WEBHOOK_SIG_HEADER,
  },
  session: {
    publicKey: sessionPublicKey,
    privateKey: sessionPrivateKey,
    duration: SESSION_DURATION,
    cookieName: DREAMUP_SESSION_COOKIE_NAME,
    cookieDomain: DREAMUP_SESSION_COOKIE_DOMAIN,
    idpCookieName: DREAMUP_IDP_COOKIE_NAME,
  },
  discord: {
    apiHost: DISCORD_API_HOST,
  },
};

const userCreateHooks = Object.keys(process.env)
  .filter((x) => x.startsWith("WEBHOOK_USER_CREATE") && process.env[x])
  .map((x) => process.env[x]) as string[];
if (userCreateHooks.length > 0) {
  config.webhooks.events["user.create"] = userCreateHooks;
}

const userUpdateHooks = Object.keys(process.env)
  .filter((x) => x.startsWith("WEBHOOK_USER_UPDATE") && process.env[x])
  .map((x) => process.env[x]) as string[];
if (userUpdateHooks.length > 0) {
  config.webhooks.events["user.update"] = userUpdateHooks;
}

const userDeleteHooks = Object.keys(process.env)
  .filter((x) => x.startsWith("WEBHOOK_USER_DELETE") && process.env[x])
  .map((x) => process.env[x]) as string[];
if (userDeleteHooks.length > 0) {
  config.webhooks.events["user.delete"] = userDeleteHooks;
}

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  config.idp.google = {
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    redirectPath: GOOGLE_REDIRECT_PATH,
    callbackUri: GOOGLE_CALLBACK_URI,
  };
}

if (DISCORD_CLIENT_ID && DISCORD_CLIENT_SECRET) {
  config.idp.discord = {
    clientId: DISCORD_CLIENT_ID,
    clientSecret: DISCORD_CLIENT_SECRET,
    redirectPath: DISCORD_REDIRECT_PATH,
    callbackUri: DISCORD_CALLBACK_URI,
  };
}

export default config;
