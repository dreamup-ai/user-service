require("../env");
const crypto = require("crypto");
const fs = require("fs");

const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

const { PUBLIC_KEY_PATH, PRIVATE_KEY_PATH } = process.env;

fs.writeFileSync(
  PUBLIC_KEY_PATH,
  publicKey.export({
    type: "pkcs1",
    format: "pem",
  }),
  { encoding: "utf8" }
);
fs.writeFileSync(
  PRIVATE_KEY_PATH,
  privateKey.export({
    type: "pkcs1",
    format: "pem",
  }),
  { encoding: "utf8" }
);
