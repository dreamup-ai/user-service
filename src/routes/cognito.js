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
exports.cognito = void 0;
const types_1 = require("../types");
const uuid_1 = require("uuid");
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
const config_1 = __importDefault(require("../config"));
const validate_source_1 = require("../middleware/validate-source");
const crud_1 = require("../crud");
exports.cognito = new client_cognito_identity_provider_1.CognitoIdentityProviderClient({
    region: config_1.default.aws.region,
    endpoint: config_1.default.aws.endpoints.cognito,
});
function routes(server, { userTable, queueManager, }) {
    return __awaiter(this, void 0, void 0, function* () {
        server.post("/user/cognito", {
            schema: {
                body: types_1.cognitoNewUserPayloadSchema,
                response: {
                    201: types_1.userSchema,
                    400: types_1.errorResponseSchema,
                    401: types_1.errorResponseSchema,
                    409: types_1.errorResponseSchema,
                    500: types_1.errorResponseSchema,
                },
            },
            preValidation: [
                (0, validate_source_1.makeSourceValidator)(config_1.default.idp.cognito.publicKey, config_1.default.idp.cognito.header),
                (req, res) => __awaiter(this, void 0, void 0, function* () {
                    // Request must be from Cognito
                    const { triggerSource, userPoolId } = req.body;
                    if (triggerSource !== "PostConfirmation_ConfirmSignUp") {
                        return res.status(400).send({
                            error: "Invalid trigger source",
                        });
                    }
                    if (userPoolId !== config_1.default.idp.cognito.userPoolId) {
                        return res.status(400).send({
                            error: "Invalid user pool ID",
                        });
                    }
                }),
            ],
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
                created: Date.now(),
            };
            try {
                const [created, cog] = yield Promise.all([
                    (0, crud_1.createUser)({
                        user,
                        userTable,
                        queueManager,
                        log: server.log,
                    }),
                    // Update the user's attributes in the idp
                    exports.cognito.send(new client_cognito_identity_provider_1.AdminUpdateUserAttributesCommand({
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
                if (e.name === "UserExistsError") {
                    return res.status(409).send({ error: e.message });
                }
                server.log.error(e);
                return res.status(500).send({
                    error: e.message,
                });
            }
        }));
    });
}
exports.default = routes;
