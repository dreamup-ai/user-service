const dotenv = require("dotenv");
dotenv.config({ override: true, path: `./.env.test` });
const crypto = require("crypto");
const fs = require("fs");

const { privateKey: cognitoPrivateKey, publicKey: cognitoPublicKey } =
  crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });

const { privateKey: webhookPrivateKey, publicKey: webhookPublicKey } =
  crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });

const { privateKey: sessionPrivateKey, publicKey: sessionPublicKey } =
  crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });

const {
  COGNITO_PUBLIC_KEY_PATH,
  COGNITO_PRIVATE_KEY_PATH,
  WEBHOOK_PUBLIC_KEY_PATH,
  WEBHOOK_PRIVATE_KEY_PATH,
  SESSION_PUBLIC_KEY_PATH,
  SESSION_PRIVATE_KEY_PATH,
} = process.env;

fs.writeFileSync(
  COGNITO_PUBLIC_KEY_PATH,
  cognitoPublicKey.export({
    type: "pkcs1",
    format: "pem",
  }),
  { encoding: "utf8" }
);
fs.writeFileSync(
  COGNITO_PRIVATE_KEY_PATH,
  cognitoPrivateKey.export({
    type: "pkcs1",
    format: "pem",
  }),
  { encoding: "utf8" }
);

fs.writeFileSync(
  WEBHOOK_PUBLIC_KEY_PATH,
  webhookPublicKey.export({
    type: "pkcs1",
    format: "pem",
  }),
  { encoding: "utf8" }
);
fs.writeFileSync(
  WEBHOOK_PRIVATE_KEY_PATH,
  webhookPrivateKey.export({
    type: "pkcs1",
    format: "pem",
  }),
  { encoding: "utf8" }
);

fs.writeFileSync(
  SESSION_PUBLIC_KEY_PATH,
  sessionPublicKey.export({
    type: "pkcs1",
    format: "pem",
  }),
  { encoding: "utf8" }
);
fs.writeFileSync(
  SESSION_PRIVATE_KEY_PATH,
  sessionPrivateKey.export({
    type: "pkcs1",
    format: "pem",
  }),
  { encoding: "utf8" }
);
