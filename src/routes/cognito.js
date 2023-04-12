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
const db_dynamo_1 = require("db-dynamo");
const queue_sqs_1 = require("queue-sqs");
const types_1 = require("../types");
const uuid_1 = require("uuid");
const fs_1 = __importDefault(require("fs"));
const node_assert_1 = __importDefault(require("node:assert"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand, } = require("@aws-sdk/client-cognito-identity-provider");
const { COGNITO_USER_POOL_ID, PUBLIC_KEY_PATH, SD_Q_PREFIX = "sd-jobs_", AWS_REGION, AWS_DEFAULT_REGION, } = process.env;
const cognito = new CognitoIdentityProviderClient({
    region: AWS_REGION || AWS_DEFAULT_REGION,
});
(0, node_assert_1.default)(COGNITO_USER_POOL_ID, "COGNITO_USER_POOL_ID is required");
(0, node_assert_1.default)(PUBLIC_KEY_PATH, "PUBLIC_KEY_PATH is required");
const publicKey = fs_1.default.readFileSync(PUBLIC_KEY_PATH);
const queueManager = new queue_sqs_1.QueueManager();
const userTable = new db_dynamo_1.DatabaseTable("users");
function routes(server) {
    return __awaiter(this, void 0, void 0, function* () {
        server.post("/user/cognito", {
            schema: {
                body: types_1.cognitoNewUserPayloadSchema,
                response: {
                    201: types_1.userSchema,
                },
            },
            preValidation: (req, res) => __awaiter(this, void 0, void 0, function* () {
                // Request must be signed
                const { "x-idp-signature": signature } = req.headers;
                if (!signature) {
                    return res.status(400).send({
                        error: "Missing signature",
                    });
                }
                // Request must be from Cognito
                const { triggerSource, userPoolId } = req.body;
                if (triggerSource !== "PostConfirmation_ConfirmSignUp") {
                    return res.status(400).send({
                        error: "Invalid trigger source",
                    });
                }
                if (userPoolId !== COGNITO_USER_POOL_ID) {
                    return res.status(400).send({
                        error: "Invalid user pool ID",
                    });
                }
                // Request must be valid
                const isVerified = node_crypto_1.default.verify("sha256", Buffer.from(JSON.stringify(req.body)), publicKey, Buffer.from(signature, "base64"));
                if (!isVerified) {
                    return res.status(401).send({
                        error: "Invalid signature",
                    });
                }
            }),
        }, (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { userPoolId, request: { userAttributes }, } = req.body;
            const { sub, email } = userAttributes;
            const user = {
                id: (0, uuid_1.v4)(),
                email,
                "idp:cognito": {
                    userPoolId,
                    userId: sub,
                },
                preferences: {},
                features: {},
            };
            try {
                const [created, queue, cog] = yield Promise.all([
                    // Create the user
                    userTable.create(user),
                    // Create the user's queue
                    queueManager.createQueue(`${SD_Q_PREFIX}${user.id}`),
                    // Update the user's attributes in the idp
                    cognito.send(new AdminUpdateUserAttributesCommand({
                        UserPoolId: userPoolId,
                        Username: sub,
                        UserAttributes: [
                            {
                                Name: "custom:dream_id",
                                Value: user.id,
                            },
                        ],
                    })),
                ]);
                return res.status(201).send(created);
            }
            catch (e) {
                return res.status(500).send({
                    error: e.message,
                });
            }
        }));
    });
}
exports.default = routes;
