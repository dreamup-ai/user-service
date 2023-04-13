import { expect } from "chai";
// import { build } from "../../src/server";
import { sign, createTable, deleteTable, clearTable } from "../util";
// import { FastifyInstance } from "fastify";
import config from "../../src/config";

import { DatabaseTable } from "db-dynamo";
import { QueueManager } from "queue-sqs";
import { FastifyInstance } from "fastify";
import { build } from "../../src/server";
// import { clearTable, createTable, deleteTable } from "../util";

const userTable = new DatabaseTable(config.db.userTable);
const queueManager = new QueueManager();

const payload = () => {
  return {
    email: "testuser@testing.com",
  };
};

describe("POST /user", () => {
  let server: FastifyInstance;

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
  });

  it("should return 400 if missing signature", async () => {
    const body = payload();
    const response = await server.inject({
      method: "POST",
      url: "/user",
      payload: body,
    });
    expect(response.statusCode).to.equal(400);
    expect(response.json()).to.deep.equal({
      error: "Missing signature",
    });
  });

  it("should return 401 if the signature is invalid", async () => {
    const body = payload();
    const response = await server.inject({
      method: "POST",
      url: "/user",
      payload: body,
      headers: {
        [config.webhooks.signatureHeader]: "invalid",
      },
    });
    expect(response.statusCode).to.equal(401);
    expect(response.json()).to.deep.equal({
      error: "Invalid signature",
    });
  });

  it("should return 201 if the user is created", async () => {
    const body = payload();
    const response = await server.inject({
      method: "POST",
      url: "/user",
      payload: body,
      headers: {
        [config.webhooks.signatureHeader]: sign(
          JSON.stringify(body),
          config.webhooks.privateKey
        ),
      },
    });
    expect(response.statusCode).to.equal(201);

    const resp = response.json();
    expect(resp.id).to.be.a("string");
    expect(resp.email).to.equal(body.email);
    expect(resp.created).to.be.a("number");
  });

  it("should return 409 if the user already exists", async () => {
    const body = payload();
    const initResponse = await server.inject({
      method: "POST",
      url: "/user",
      payload: body,
      headers: {
        [config.webhooks.signatureHeader]: sign(
          JSON.stringify(body),
          config.webhooks.privateKey
        ),
      },
    });

    expect(initResponse.statusCode).to.equal(201);

    const response = await server.inject({
      method: "POST",
      url: "/user",
      payload: body,
      headers: {
        [config.webhooks.signatureHeader]: sign(
          JSON.stringify(body),
          config.webhooks.privateKey
        ),
      },
    });
    expect(response.statusCode).to.equal(409);
    expect(response.json()).to.deep.equal({
      error: "User already exists",
    });
  });

  it("should return 400 if body is missing required fields", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/user",
      payload: {},
      headers: {
        [config.webhooks.signatureHeader]: sign(
          JSON.stringify({}),
          config.webhooks.privateKey
        ),
      },
    });
    expect(response.statusCode).to.equal(400);
    expect(response.json()).to.deep.equal({
      error: "body must have required property 'email'",
    });
  });
});
