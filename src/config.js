"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const { COGNITO_USER_POOL_ID, COGNITO_PUBLIC_KEY_PATH, SD_Q_PREFIX = "sd-jobs_", AWS_REGION, AWS_DEFAULT_REGION, COGNITO_IDP_ENDPOINT, SQS_ENDPOINT, DYNAMODB_ENDPOINT, USER_TABLE, PORT, WEBHOOK_USER_CREATE, WEBHOOK_PUBLIC_KEY_PATH, WEBHOOK_PRIVATE_KEY_PATH, WEBHOOK_SIG_HEADER = "x-dreamup-signature", COGNITO_SIG_HEADER = "x-cognito-signature", } = process.env;
(0, node_assert_1.default)(COGNITO_USER_POOL_ID, "COGNITO_USER_POOL_ID is required");
(0, node_assert_1.default)(COGNITO_PUBLIC_KEY_PATH, "COGNITO_PUBLIC_KEY_PATH is required");
(0, node_assert_1.default)(WEBHOOK_PUBLIC_KEY_PATH, "WEBHOOK_PUBLIC_KEY_PATH is required");
(0, node_assert_1.default)(WEBHOOK_PRIVATE_KEY_PATH, "WEBHOOK_PRIVATE_KEY_PATH is required");
const rawCognitoPublicKey = node_fs_1.default.readFileSync(COGNITO_PUBLIC_KEY_PATH, "utf8");
const cognitoPublicKey = node_crypto_1.default.createPublicKey(rawCognitoPublicKey);
const rawWebhookPublicKey = node_fs_1.default.readFileSync(WEBHOOK_PUBLIC_KEY_PATH, "utf8");
const webhookPublicKey = node_crypto_1.default.createPublicKey(rawWebhookPublicKey);
const rawWebhookPrivateKey = node_fs_1.default.readFileSync(WEBHOOK_PRIVATE_KEY_PATH, "utf8");
const webhookPrivateKey = node_crypto_1.default.createPrivateKey(rawWebhookPrivateKey);
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
exports.default = config;
