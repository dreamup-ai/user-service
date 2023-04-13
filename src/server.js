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
exports.start = exports.build = void 0;
const fastify_1 = __importDefault(require("fastify"));
const cognito_1 = __importDefault(require("./routes/cognito"));
const config_1 = __importDefault(require("./config"));
const build = (userTable, queueManager) => __awaiter(void 0, void 0, void 0, function* () {
    const server = (0, fastify_1.default)({
        logger: true,
    }).withTypeProvider();
    server.get("/hc", {
        schema: {
            response: {
                200: {
                    type: "string",
                },
            },
        },
    }, () => __awaiter(void 0, void 0, void 0, function* () {
        return "OK";
    }));
    yield server.register(cognito_1.default, { userTable, queueManager });
    return server;
});
exports.build = build;
const start = (server) => __awaiter(void 0, void 0, void 0, function* () {
    yield server.register(cognito_1.default);
    try {
        yield server.listen({ port: config_1.default.server.port });
    }
    catch (e) {
        server.log.error(e);
        process.exit(1);
    }
});
exports.start = start;
