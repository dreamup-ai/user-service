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
const server_1 = require("../../src/server");
const cognito_1 = require("../../src/routes/cognito");
const util_1 = require("../util");
const cognito_payload_json_1 = __importDefault(require("../fixtures/cognito-payload.json"));
const sinon_1 = __importDefault(require("sinon"));
const config_1 = __importDefault(require("../../src/config"));
const sandbox = sinon_1.default.createSandbox();
const db_dynamo_1 = require("db-dynamo");
const queue_sqs_1 = require("queue-sqs");
const userTable = new db_dynamo_1.DatabaseTable(config_1.default.db.userTable);
const queueManager = new queue_sqs_1.QueueManager();
const payload = () => {
    return JSON.parse(JSON.stringify(Object.assign(Object.assign({}, cognito_payload_json_1.default), { userPoolId: config_1.default.idp.cognito.userPoolId })));
};
describe("POST /user/cognito", () => {
    let server;
    let cognitoStub;
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
        sandbox.restore();
        cognitoStub = sandbox.stub(cognito_1.cognito, "send").resolves();
    }));
    afterEach(() => {
        sandbox.restore();
    });
    it("should return 400 if missing signature", () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield server.inject({
            method: "POST",
            url: "/user/cognito",
            payload: payload(),
        });
        (0, chai_1.expect)(response.statusCode).to.equal(400);
        (0, chai_1.expect)(response.json()).to.deep.equal({
            error: "Missing signature",
        });
    }));
    it("should return 400 if invalid trigger source", () => __awaiter(void 0, void 0, void 0, function* () {
        const body = payload();
        body.triggerSource = "Invalid";
        const response = yield server.inject({
            method: "POST",
            url: "/user/cognito",
            headers: {
                [config_1.default.idp.cognito.signatureHeader]: (0, util_1.sign)(JSON.stringify(body)),
            },
            payload: body,
        });
        (0, chai_1.expect)(response.statusCode).to.equal(400);
        (0, chai_1.expect)(response.json()).to.deep.equal({
            error: "Invalid trigger source",
        });
    }));
    it("should return 400 if invalid user pool ID", () => __awaiter(void 0, void 0, void 0, function* () {
        const body = payload();
        body.userPoolId = "Invalid";
        const response = yield server.inject({
            method: "POST",
            url: "/user/cognito",
            headers: {
                [config_1.default.idp.cognito.signatureHeader]: (0, util_1.sign)(JSON.stringify(body)),
            },
            payload: body,
        });
        (0, chai_1.expect)(response.statusCode).to.equal(400);
        (0, chai_1.expect)(response.json()).to.deep.equal({
            error: "Invalid user pool ID",
        });
    }));
    it("should return 401 if invalid signature", () => __awaiter(void 0, void 0, void 0, function* () {
        const body = payload();
        const response = yield server.inject({
            method: "POST",
            url: "/user/cognito",
            headers: {
                [config_1.default.idp.cognito.signatureHeader]: "Invalid",
            },
            payload: body,
        });
        (0, chai_1.expect)(response.statusCode).to.equal(401);
        (0, chai_1.expect)(response.json()).to.deep.equal({
            error: "Invalid signature",
        });
    }));
    it("should return 201 if valid request", () => __awaiter(void 0, void 0, void 0, function* () {
        const body = payload();
        const response = yield server.inject({
            method: "POST",
            url: "/user/cognito",
            headers: {
                [config_1.default.idp.cognito.signatureHeader]: (0, util_1.sign)(JSON.stringify(body)),
            },
            payload: body,
        });
        const respBody = response.json();
        (0, chai_1.expect)(response.statusCode).to.equal(201);
        (0, chai_1.expect)(respBody).to.have.property("id");
        (0, chai_1.expect)(respBody.created).to.be.a("number");
        (0, chai_1.expect)(respBody.email).to.equal(body.request.userAttributes.email);
        (0, chai_1.expect)(respBody["idp:cognito"]).to.deep.equal({
            userPoolId: body.userPoolId,
            userId: body.request.userAttributes.sub,
        });
        (0, chai_1.expect)(respBody.preferences).to.deep.equal({ width: 512, height: 512 });
        (0, chai_1.expect)(respBody.features).to.deep.equal({});
        (0, chai_1.expect)(cognitoStub.calledOnce).to.be.true;
    }));
    it("should return 400 if user already exists", () => __awaiter(void 0, void 0, void 0, function* () {
        const body = payload();
        const initResp = yield server.inject({
            method: "POST",
            url: "/user/cognito",
            headers: {
                [config_1.default.idp.cognito.signatureHeader]: (0, util_1.sign)(JSON.stringify(body)),
            },
            payload: body,
        });
        (0, chai_1.expect)(initResp.statusCode).to.equal(201);
        const response = yield server.inject({
            method: "POST",
            url: "/user/cognito",
            headers: {
                [config_1.default.idp.cognito.signatureHeader]: (0, util_1.sign)(JSON.stringify(body)),
            },
            payload: body,
        });
        (0, chai_1.expect)(response.statusCode).to.equal(409);
        (0, chai_1.expect)(response.json()).to.deep.equal({
            error: "User already exists",
        });
    }));
});
