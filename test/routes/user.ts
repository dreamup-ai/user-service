import { expect } from "chai";
import config from "../../src/config";
import { getServer, clearTable, sign } from "../util";
import { FastifyInstance } from "fastify";
import { issueSession } from "../../src/routes/login";
import { createOrUpdateUserByEmail } from "../../src/crud";
import { PublicUser, RawUser } from "../../src/types";
import { v4 as uuidv4 } from "uuid";

describe("GET /user/me", () => {
  let server: FastifyInstance;
  let user: RawUser;
  before(async () => {
    server = await getServer();
  });

  beforeEach(async () => {
    await clearTable();
  });

  it("should return the authorized user when sent with a cookie", async () => {
    user = await createOrUpdateUserByEmail("test@test.com", server.log);
    const response = await server.inject({
      method: "GET",
      url: "/user/me",
      cookies: {
        [config.session.cookieName]: issueSession(user.id, uuidv4()),
      },
    });
    expect(response.statusCode).to.equal(200);

    const body: PublicUser = response.json();
    expect(body).to.deep.equal({
      id: user.id,
      email: user.email,

      // These are the default preferences when none are set
      preferences: {
        height: 512,
        width: 512,
      },
      created: user.created,
      features: {},
    });
  });

  it("should return the authorized user when sent with a bearer token", async () => {
    user = await createOrUpdateUserByEmail("test@test.com", server.log);
    const response = await server.inject({
      method: "GET",
      url: "/user/me",
      headers: {
        Authorization: `Bearer ${issueSession(user.id, uuidv4())}`,
      },
    });
    expect(response.statusCode).to.equal(200);

    const body: PublicUser = response.json();
    expect(body).to.deep.equal({
      id: user.id,
      email: user.email,

      // These are the default preferences when none are set
      preferences: {
        height: 512,
        width: 512,
      },
      created: user.created,
      features: {},
    });
  });
});

describe("GET /user/:id", () => {
  let server: FastifyInstance;
  let user: RawUser;
  before(async () => {
    server = await getServer();
  });

  beforeEach(async () => {
    await clearTable();
  });

  it("should return 400 if the request has no signature", async () => {
    user = await createOrUpdateUserByEmail("test@test.com", server.log);
    const response = await server.inject({
      method: "GET",
      url: `/user/${user.id}`,
    });
    expect(response.statusCode).to.equal(400);
    expect(response.json()).to.deep.equal({
      error: "Missing signature",
    });
  });

  it("should return 401 if the request has an invalid signature", async () => {
    user = await createOrUpdateUserByEmail("test@test.com", server.log);
    const response = await server.inject({
      method: "GET",
      url: `/user/${user.id}`,
      headers: {
        [config.webhooks.signatureHeader]: "Invalid",
      },
    });
    expect(response.statusCode).to.equal(401);
    expect(response.json()).to.deep.equal({
      error: "Invalid signature",
    });
  });

  it("should return the user with a correctly signed request", async () => {
    user = await createOrUpdateUserByEmail("test@test.com", server.log);
    const response = await server.inject({
      method: "GET",
      url: `/user/${user.id}`,
      headers: {
        [config.webhooks.signatureHeader]: sign(
          JSON.stringify({ url: `/user/${user.id}`, id: user.id }),
          config.webhooks.privateKey
        ),
      },
    });
    expect(response.statusCode).to.equal(200);
    expect(response.json()).to.deep.equal({
      ...user,
      preferences: {
        height: 512,
        width: 512,
      },
    });
  });

  it("should return 404 if the user does not exist", async () => {
    user = await createOrUpdateUserByEmail("test@test.com", server.log);
    const response = await server.inject({
      method: "GET",
      url: `/user/${user.id}1`,
      headers: {
        [config.webhooks.signatureHeader]: sign(
          JSON.stringify({ url: `/user/${user.id}1`, id: `${user.id}1` }),
          config.webhooks.privateKey
        ),
      },
    });
    expect(response.statusCode).to.equal(404);
    expect(response.json()).to.deep.equal({
      error: "Not Found",
    });
  });
});

describe("GET /user/:id/cognito", () => {
  let server: FastifyInstance;
  let user: RawUser;
  before(async () => {
    server = await getServer();
  });

  beforeEach(async () => {
    await clearTable();
  });

  it("should return 400 if the request has no signature", async () => {
    user = await createOrUpdateUserByEmail("test@test.com", server.log, {
      "idp:cognito:id": "test",
    });
    const response = await server.inject({
      method: "GET",
      url: `/user/${user.id}/cognito`,
    });
    expect(response.statusCode).to.equal(400);
    expect(response.json()).to.deep.equal({
      error: "Missing signature",
    });
  });

  it("should return 401 if the request has an invalid signature", async () => {
    user = await createOrUpdateUserByEmail("test@test.com", server.log, {
      "idp:cognito:id": "test",
    });
    const response = await server.inject({
      method: "GET",
      url: `/user/${user.id}/cognito`,
      headers: {
        [config.webhooks.signatureHeader]: "Invalid",
      },
    });
    expect(response.statusCode).to.equal(401);
    expect(response.json()).to.deep.equal({
      error: "Invalid signature",
    });
  });

  it("should return the user with a correctly signed request", async () => {
    user = await createOrUpdateUserByEmail("test@test.com", server.log, {
      "idp:cognito:id": "test",
    });

    const response = await server.inject({
      method: "GET",
      url: `/user/test/cognito`,
      headers: {
        [config.webhooks.signatureHeader]: sign(
          JSON.stringify({ url: `/user/test/cognito`, id: "test" }),
          config.webhooks.privateKey
        ),
      },
    });
    expect(response.statusCode).to.equal(200);
    expect(response.json()).to.deep.equal({
      ...user,
      preferences: {
        height: 512,
        width: 512,
      },
    });
  });

  it("should return 404 if the user does not exist", async () => {
    user = await createOrUpdateUserByEmail("test@test.com", server.log, {
      "idp:cognito:id": "test",
    });
    const response = await server.inject({
      method: "GET",
      url: `/user/${user.id}1/cognito`,
      headers: {
        [config.webhooks.signatureHeader]: sign(
          JSON.stringify({
            url: `/user/${user.id}1/cognito`,
            id: `${user.id}1`,
          }),
          config.webhooks.privateKey
        ),
      },
    });
    expect(response.statusCode).to.equal(404);
    expect(response.json()).to.deep.equal({
      error: "Not Found",
    });
  });
});

describe("GET /user/:id/google", () => {
  let server: FastifyInstance;
  let user: RawUser;
  before(async () => {
    server = await getServer();
  });

  beforeEach(async () => {
    await clearTable();
  });

  it("should return 400 if the request has no signature", async () => {
    user = await createOrUpdateUserByEmail("test@test.com", server.log, {
      "idp:google:id": "test",
    });
    const response = await server.inject({
      method: "GET",
      url: `/user/${user.id}/google`,
    });
    expect(response.statusCode).to.equal(400);
    expect(response.json()).to.deep.equal({
      error: "Missing signature",
    });
  });

  it("should return 401 if the request has an invalid signature", async () => {
    user = await createOrUpdateUserByEmail("test@test.com", server.log, {
      "idp:google:id": "test",
    });
    const response = await server.inject({
      method: "GET",
      url: `/user/${user.id}/google`,
      headers: {
        [config.webhooks.signatureHeader]: "Invalid",
      },
    });
    expect(response.statusCode).to.equal(401);
    expect(response.json()).to.deep.equal({
      error: "Invalid signature",
    });
  });

  it("should return the user with a correctly signed request", async () => {
    user = await createOrUpdateUserByEmail("test@test.com", server.log, {
      "idp:google:id": "test",
    });
    const response = await server.inject({
      method: "GET",
      url: `/user/test/google`,
      headers: {
        [config.webhooks.signatureHeader]: sign(
          JSON.stringify({ url: `/user/test/google`, id: "test" }),
          config.webhooks.privateKey
        ),
      },
    });
    expect(response.statusCode).to.equal(200);
    expect(response.json()).to.deep.equal({
      ...user,
      preferences: {
        height: 512,
        width: 512,
      },
    });
  });

  it("should return 404 if the user does not exist", async () => {
    user = await createOrUpdateUserByEmail("test@test.com", server.log, {
      "idp:google:id": "test",
    });
    const response = await server.inject({
      method: "GET",
      url: `/user/${user.id}1/google`,
      headers: {
        [config.webhooks.signatureHeader]: sign(
          JSON.stringify({
            url: `/user/${user.id}1/google`,
            id: `${user.id}1`,
          }),
          config.webhooks.privateKey
        ),
      },
    });
    expect(response.statusCode).to.equal(404);
    expect(response.json()).to.deep.equal({
      error: "Not Found",
    });
  });
});

describe("GET /user/:id/discord", () => {
  let server: FastifyInstance;
  let user: RawUser;
  before(async () => {
    server = await getServer();
  });

  beforeEach(async () => {
    await clearTable();
  });

  it("should return 400 if the request has no signature", async () => {
    user = await createOrUpdateUserByEmail("test@test.com", server.log, {
      "idp:discord:id": "test",
    });
    const response = await server.inject({
      method: "GET",
      url: `/user/${user.id}/discord`,
    });
    expect(response.statusCode).to.equal(400);
    expect(response.json()).to.deep.equal({
      error: "Missing signature",
    });
  });

  it("should return 401 if the request has an invalid signature", async () => {
    user = await createOrUpdateUserByEmail("test@test.com", server.log, {
      "idp:discord:id": "test",
    });
    const response = await server.inject({
      method: "GET",
      url: `/user/${user.id}/discord`,
      headers: {
        [config.webhooks.signatureHeader]: "Invalid",
      },
    });
    expect(response.statusCode).to.equal(401);
    expect(response.json()).to.deep.equal({
      error: "Invalid signature",
    });
  });

  it("should return the user with a correctly signed request", async () => {
    user = await createOrUpdateUserByEmail("test@test.com", server.log, {
      "idp:discord:id": "test",
    });
    const response = await server.inject({
      method: "GET",
      url: `/user/test/discord`,
      headers: {
        [config.webhooks.signatureHeader]: sign(
          JSON.stringify({ url: `/user/test/discord`, id: "test" }),
          config.webhooks.privateKey
        ),
      },
    });
    expect(response.statusCode).to.equal(200);
    expect(response.json()).to.deep.equal({
      ...user,
      preferences: {
        height: 512,
        width: 512,
      },
    });
  });

  it("should return 404 if the user does not exist", async () => {
    user = await createOrUpdateUserByEmail("test@test.com", server.log, {
      "idp:discord:id": "test",
    });
    const response = await server.inject({
      method: "GET",
      url: `/user/${user.id}1/discord`,
      headers: {
        [config.webhooks.signatureHeader]: sign(
          JSON.stringify({
            url: `/user/${user.id}1/discord`,
            id: `${user.id}1`,
          }),
          config.webhooks.privateKey
        ),
      },
    });
    expect(response.statusCode).to.equal(404);
    expect(response.json()).to.deep.equal({
      error: "Not Found",
    });
  });
});
