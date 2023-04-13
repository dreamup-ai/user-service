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
const chai_1 = require("chai");
// import { build } from "../../src/server";
const util_1 = require("../util");
// import { FastifyInstance } from "fastify";
const config_1 = __importDefault(require("../../src/config"));
const db_dynamo_1 = require("db-dynamo");
const queue_sqs_1 = require("queue-sqs");
const server_1 = require("../../src/server");
// import { clearTable, createTable, deleteTable } from "../util";
const userTable = new db_dynamo_1.DatabaseTable(config_1.default.db.userTable);
const queueManager = new queue_sqs_1.QueueManager();
const payload = () => {
    return {
        email: "testuser@testing.com",
    };
};
describe("POST /user", () => {
    let server;
    before(() => __awaiter(void 0, void 0, void 0, function* () {
        yield userTable.connect();
        server = yield (0, server_1.build)(userTable, queueManager);
        try {
            yield (0, util_1.createTable)();
        }
        catch (e) {
            if (e.code !== "ResourceInUseException") {
                throw e;
            }
        }
    }));
    after(() => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, util_1.deleteTable)();
    }));
    beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, util_1.clearTable)();
    }));
    it("should return 400 if missing signature", () => __awaiter(void 0, void 0, void 0, function* () {
        const body = payload();
        const response = yield server.inject({
            method: "POST",
            url: "/user",
            payload: body,
        });
        (0, chai_1.expect)(response.statusCode).to.equal(400);
        (0, chai_1.expect)(response.json()).to.deep.equal({
            error: "Missing signature",
        });
    }));
    it("should return 401 if the signature is invalid", () => __awaiter(void 0, void 0, void 0, function* () {
        const body = payload();
        const response = yield server.inject({
            method: "POST",
            url: "/user",
            payload: body,
            headers: {
                [config_1.default.webhooks.header]: "invalid",
            },
        });
        (0, chai_1.expect)(response.statusCode).to.equal(401);
        (0, chai_1.expect)(response.json()).to.deep.equal({
            error: "Invalid signature",
        });
    }));
    it("should return 201 if the user is created", () => __awaiter(void 0, void 0, void 0, function* () {
        const body = payload();
        const response = yield server.inject({
            method: "POST",
            url: "/user",
            payload: body,
            headers: {
                [config_1.default.webhooks.header]: (0, util_1.sign)(JSON.stringify(body), config_1.default.webhooks.privateKey),
            },
        });
        (0, chai_1.expect)(response.statusCode).to.equal(201);
        const resp = response.json();
        (0, chai_1.expect)(resp.id).to.be.a("string");
        (0, chai_1.expect)(resp.email).to.equal(body.email);
        (0, chai_1.expect)(resp.created).to.be.a("number");
    }));
    it("should return 409 if the user already exists", () => __awaiter(void 0, void 0, void 0, function* () {
        const body = payload();
        const initResponse = yield server.inject({
            method: "POST",
            url: "/user",
            payload: body,
            headers: {
                [config_1.default.webhooks.header]: (0, util_1.sign)(JSON.stringify(body), config_1.default.webhooks.privateKey),
            },
        });
        (0, chai_1.expect)(initResponse.statusCode).to.equal(201);
        const response = yield server.inject({
            method: "POST",
            url: "/user",
            payload: body,
            headers: {
                [config_1.default.webhooks.header]: (0, util_1.sign)(JSON.stringify(body), config_1.default.webhooks.privateKey),
            },
        });
        (0, chai_1.expect)(response.statusCode).to.equal(409);
        (0, chai_1.expect)(response.json()).to.deep.equal({
            error: "User already exists",
        });
    }));
    it("should return 400 if body is missing required fields", () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield server.inject({
            method: "POST",
            url: "/user",
            payload: {},
            headers: {
                [config_1.default.webhooks.header]: (0, util_1.sign)(JSON.stringify({}), config_1.default.webhooks.privateKey),
            },
        });
        (0, chai_1.expect)(response.statusCode).to.equal(400);
        (0, chai_1.expect)(response.json()).to.deep.equal({
            error: "body must have required property 'email'",
        });
    }));
});
