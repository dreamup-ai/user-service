"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const { COGNITO_USER_POOL_ID, PUBLIC_KEY_PATH, SD_Q_PREFIX = "sd-jobs_", AWS_REGION, AWS_DEFAULT_REGION, COGNITO_IDP_ENDPOINT, SQS_ENDPOINT, DYNAMODB_ENDPOINT, USER_TABLE, PORT, } = process.env;
(0, node_assert_1.default)(COGNITO_USER_POOL_ID, "COGNITO_USER_POOL_ID is required");
(0, node_assert_1.default)(PUBLIC_KEY_PATH, "PUBLIC_KEY_PATH is required");
const rawPublicKey = node_fs_1.default.readFileSync(PUBLIC_KEY_PATH, "utf8");
const publicKey = node_crypto_1.default.createPublicKey(rawPublicKey);
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
exports.default = config;
