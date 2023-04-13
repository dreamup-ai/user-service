"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sign = exports.clearTable = exports.deleteTable = exports.createTable = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_assert_1 = __importDefault(require("node:assert"));
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const dynamo_tools_1 = require("dynamo-tools");
const { COGNITO_PRIVATE_KEY_PATH, AWS_REGION, DYNAMODB_ENDPOINT, USER_TABLE } = process.env;
const cache = new dynamo_tools_1.Cache({
    region: AWS_REGION,
    endpoint: DYNAMODB_ENDPOINT,
});
const createTable = () => __awaiter(void 0, void 0, void 0, function* () {
    yield cache.client.send(new client_dynamodb_1.CreateTableCommand({
        TableName: USER_TABLE,
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
                IndexName: "email-index",
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
    }));
});
exports.createTable = createTable;
const deleteTable = () => __awaiter(void 0, void 0, void 0, function* () {
    yield cache.client.send(new client_dynamodb_1.DeleteTableCommand({
        TableName: USER_TABLE,
    }));
});
exports.deleteTable = deleteTable;
const clearTable = () => __awaiter(void 0, void 0, void 0, function* () {
    yield cache.deleteAll({ table: USER_TABLE });
});
exports.clearTable = clearTable;
(0, node_assert_1.default)(COGNITO_PRIVATE_KEY_PATH, "PRIVATE_KEY_PATH is required");
const rawPrivateKey = node_fs_1.default
    .readFileSync(COGNITO_PRIVATE_KEY_PATH)
    .toString("utf8");
const privateKey = node_crypto_1.default.createPrivateKey(rawPrivateKey);
function sign(payload) {
    const signature = node_crypto_1.default.sign("sha256", Buffer.from(payload), privateKey);
    return signature.toString("base64");
}
exports.sign = sign;
