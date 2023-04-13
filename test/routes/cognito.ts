import { expect } from "chai";
import { build } from "../../src/server";
import { cognito } from "../../src/routes/cognito";
import { sign, createTable, deleteTable, clearTable } from "../util";
import { FastifyInstance } from "fastify";
import cognitoPayload from "../fixtures/cognito-payload.json";
import sinon from "sinon";
import config from "../../src/config";

const sandbox = sinon.createSandbox();

import { DatabaseTable } from "db-dynamo";
import { QueueManager } from "queue-sqs";

const userTable = new DatabaseTable(config.db.userTable);
const queueManager = new QueueManager();

const payload = () => {
  return JSON.parse(
    JSON.stringify({
      ...cognitoPayload,
      userPoolId: config.idp.cognito.userPoolId,
    })
  );
};

describe("POST /user/cognito", () => {
  let server: FastifyInstance;
  let cognitoStub: sinon.SinonStub;

  before(async () => {
    await userTable.connect();
    server = await build(userTable, queueManager);
    try {
      await createTable();
    } catch (e: any) {
      if (e.code !== "ResourceInUseException") {
        throw e;
      }
    }
  });
  after(async () => {
    await deleteTable();
  });

  beforeEach(async () => {
    await clearTable();
    sandbox.restore();
    cognitoStub = sandbox.stub(cognito, "send").resolves();
  });

  afterEach(() => {
    sandbox.restore();
  });
  it("should return 400 if missing signature", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/user/cognito",
      payload: payload(),
    });
    expect(response.statusCode).to.equal(400);
    expect(response.json()).to.deep.equal({
      error: "Missing signature",
    });
  });

  it("should return 400 if invalid trigger source", async () => {
    const body = payload();
    body.triggerSource = "Invalid";
    const response = await server.inject({
      method: "POST",
      url: "/user/cognito",
      headers: {
        [config.idp.cognito.header]: sign(JSON.stringify(body)),
      },
      payload: body,
    });
    expect(response.statusCode).to.equal(400);
    expect(response.json()).to.deep.equal({
      error: "Invalid trigger source",
    });
  });

  it("should return 400 if invalid user pool ID", async () => {
    const body = payload();
    body.userPoolId = "Invalid";
    const response = await server.inject({
      method: "POST",
      url: "/user/cognito",
      headers: {
        [config.idp.cognito.header]: sign(JSON.stringify(body)),
      },
      payload: body,
    });
    expect(response.statusCode).to.equal(400);
    expect(response.json()).to.deep.equal({
      error: "Invalid user pool ID",
    });
  });

  it("should return 401 if invalid signature", async () => {
    const body = payload();
    const response = await server.inject({
      method: "POST",
      url: "/user/cognito",
      headers: {
        [config.idp.cognito.header]: "Invalid",
      },
      payload: body,
    });
    expect(response.statusCode).to.equal(401);
    expect(response.json()).to.deep.equal({
      error: "Invalid signature",
    });
  });

  it("should return 201 if valid request", async () => {
    const body = payload();
    const response = await server.inject({
      method: "POST",
      url: "/user/cognito",
      headers: {
        [config.idp.cognito.header]: sign(JSON.stringify(body)),
      },
      payload: body,
    });
    const respBody = response.json();
    expect(response.statusCode).to.equal(201);

    expect(respBody).to.have.property("id");
    expect(respBody.created).to.be.a("number");
    expect(respBody.email).to.equal(body.request.userAttributes.email);
    expect(respBody["idp:cognito"]).to.deep.equal({
      userPoolId: body.userPoolId,
      userId: body.request.userAttributes.sub,
    });
    expect(respBody.preferences).to.deep.equal({ width: 512, height: 512 });
    expect(respBody.features).to.deep.equal({});

    expect(cognitoStub.calledOnce).to.be.true;
  });

  it("should return 400 if user already exists", async () => {
    const body = payload();
    const initResp = await server.inject({
      method: "POST",
      url: "/user/cognito",
      headers: {
        [config.idp.cognito.header]: sign(JSON.stringify(body)),
      },
      payload: body,
    });
    expect(initResp.statusCode).to.equal(201);

    const response = await server.inject({
      method: "POST",
      url: "/user/cognito",
      headers: {
        [config.idp.cognito.header]: sign(JSON.stringify(body)),
      },
      payload: body,
    });
    expect(response.statusCode).to.equal(409);
    expect(response.json()).to.deep.equal({
      error: "User already exists",
    });
  });
});
