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
const oauth2_1 = __importDefault(require("@fastify/oauth2"));
const config_1 = __importDefault(require("./config"));
const routes = (server, { userTable, queueManager, }) => __awaiter(void 0, void 0, void 0, function* () {
    server.register(oauth2_1.default, {
        name: "cognito",
        credentials: {
            client: {
                id: config_1.default.idp.cognito.clientId,
                secret: config_1.default.idp.cognito.clientSecret,
            },
            auth: {
                tokenHost: config_1.default.idp.cognito.tokenHost,
                tokenPath: config_1.default.idp.cognito.tokenPath,
                authorizePath: config_1.default.idp.cognito.authPath,
                authorizeHost: config_1.default.idp.cognito.authHost,
            },
        },
        startRedirectPath: config_1.default.idp.cognito.redirectPath,
        callbackUri: config_1.default.idp.cognito.callbackUri,
        scope: ["email openid profile"],
    });
});
