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
exports.start = exports.server = void 0;
const db_dynamo_1 = require("db-dynamo");
const queue_sqs_1 = require("queue-sqs");
const fastify_1 = __importDefault(require("fastify"));
const queueManager = new queue_sqs_1.QueueManager();
const userTable = new db_dynamo_1.DatabaseTable("users");
const { PORT } = process.env;
const port = PORT ? parseInt(PORT, 10) : 3000;
exports.server = (0, fastify_1.default)({
    logger: true,
}).withTypeProvider();
exports.server.get("/hc", () => __awaiter(void 0, void 0, void 0, function* () {
    return "OK";
}));
const start = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield exports.server.listen({ port });
    }
    catch (e) {
        exports.server.log.error(e);
        process.exit(1);
    }
});
exports.start = start;
