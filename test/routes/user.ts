import { expect } from "chai";
import config from "../../src/config";
import { getServer, clearTable, sign } from "../util";
import { FastifyInstance } from "fastify";
import { issueSession } from "../../src/routes/login";
import { createOrUpdateUserByEmail, getUserById } from "../../src/crud";
import { PublicUser, RawUser } from "../../src/types";
import { v4 as uuidv4 } from "uuid";
import cognitoPayload from "../fixtures/cognito-payload.json";
import sinon from "sinon";
import { cognito } from "../../src/clients/cognito";

const sandbox = sinon.createSandbox();

const getCognitoPayload = () => {
  return JSON.parse(
    JSON.stringify({
      ...cognitoPayload,
      userPoolId: config.idp.cognito.userPoolId,
    })
  );
};

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

describe("GET /user/:id/email", () => {
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
      url: `/user/${user.email}/email`,
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
      url: `/user/${user.email}/email`,
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
      url: `/user/test@test.com/email`,
      headers: {
        [config.webhooks.signatureHeader]: sign(
          JSON.stringify({
            url: `/user/test@test.com/email`,
            id: "test@test.com",
          }),
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
      url: `/user/${user.email}1/email`,
      headers: {
        [config.webhooks.signatureHeader]: sign(
          JSON.stringify({
            url: `/user/${user.email}1/email`,
            id: `${user.email}1`,
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

describe("POST /user/cognito", () => {
  let server: FastifyInstance;
  let cognitoStub: sinon.SinonStub;

  before(async () => {
    server = await getServer();
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
      payload: getCognitoPayload(),
    });
    expect(response.statusCode).to.equal(400);
    expect(response.json()).to.deep.equal({
      error: "Missing signature",
    });
  });

  it("should return 400 if invalid trigger source", async () => {
    const body = getCognitoPayload();
    body.triggerSource = "Invalid";
    const response = await server.inject({
      method: "POST",
      url: "/user/cognito",
      headers: {
        [config.idp.cognito.signatureHeader]: sign(JSON.stringify(body)),
      },
      payload: body,
    });
    expect(response.statusCode).to.equal(400);
    expect(response.json()).to.deep.equal({
      error: "Invalid trigger source",
    });
  });

  it("should return 400 if invalid user pool ID", async () => {
    const body = getCognitoPayload();
    body.userPoolId = "Invalid";
    const response = await server.inject({
      method: "POST",
      url: "/user/cognito",
      headers: {
        [config.idp.cognito.signatureHeader]: sign(JSON.stringify(body)),
      },
      payload: body,
    });
    expect(response.statusCode).to.equal(400);
    expect(response.json()).to.deep.equal({
      error: "Invalid user pool ID",
    });
  });

  it("should return 401 if invalid signature", async () => {
    const body = getCognitoPayload();
    const response = await server.inject({
      method: "POST",
      url: "/user/cognito",
      headers: {
        [config.idp.cognito.signatureHeader]: "Invalid",
      },
      payload: body,
    });
    expect(response.statusCode).to.equal(401);
    expect(response.json()).to.deep.equal({
      error: "Invalid signature",
    });
  });

  it("should return 201 if valid request", async () => {
    const body = getCognitoPayload();
    const response = await server.inject({
      method: "POST",
      url: "/user/cognito",
      headers: {
        [config.idp.cognito.signatureHeader]: sign(JSON.stringify(body)),
      },
      payload: body,
    });
    const respBody = response.json();
    expect(response.statusCode).to.equal(201);

    expect(respBody).to.have.property("id");
    expect(respBody.created).to.be.a("number");
    expect(respBody.email).to.equal(body.request.userAttributes.email);
    expect(respBody.preferences).to.deep.equal({ width: 512, height: 512 });
    expect(respBody.features).to.deep.equal({});

    expect(cognitoStub.calledOnce).to.be.true;
  });
});

describe("PUT /user/me", () => {
  let server: FastifyInstance;
  let user: PublicUser;

  before(async () => {
    server = await getServer();
  });

  beforeEach(async () => {
    await clearTable();
    user = await createOrUpdateUserByEmail("test@test.com", server.log);
  });

  it("should return the updated user if request is submitted with a valid cookie", async () => {
    const response = await server.inject({
      method: "PUT",
      url: "/user/me",

      payload: {
        preferences: {
          width: 1024,
          height: 1024,
        },
        username: "test-sweet",
      },

      cookies: {
        [config.session.cookieName]: issueSession(user.id, uuidv4()),
      },
    });
    expect(response.statusCode).to.equal(200);
    delete user._queue;
    expect(response.json()).to.deep.equal({
      ...user,
      preferences: {
        width: 1024,
        height: 1024,
      },
      username: "test-sweet",
    });
  });

  it("should return the updated user if request is submitted with a valid auth header", async () => {
    const response = await server.inject({
      method: "PUT",
      url: "/user/me",

      payload: {
        preferences: {
          width: 1024,
          height: 1024,
        },
        username: "test-sweet",
      },

      headers: {
        Authorization: `Bearer ${issueSession(user.id, uuidv4())}`,
      },
    });
    expect(response.statusCode).to.equal(200);
    delete user._queue;
    expect(response.json()).to.deep.equal({
      ...user,
      preferences: {
        width: 1024,
        height: 1024,
      },
      username: "test-sweet",
    });
  });

  it("should return 302 if request is submitted with an invalid cookie", async () => {
    const response = await server.inject({
      method: "PUT",
      url: "/user/me",

      payload: {
        preferences: {
          width: 1024,
          height: 1024,
        },
        username: "test-sweet",
      },

      cookies: {
        [config.session.cookieName]: "invalid",
      },
    });
    expect(response.statusCode).to.equal(302);
  });

  it("should return 401 if request is submitted with an invalid auth header", async () => {
    const response = await server.inject({
      method: "PUT",
      url: "/user/me",

      payload: {
        preferences: {
          width: 1024,
          height: 1024,
        },
        username: "test-sweet",
      },

      headers: {
        Authorization: "Bearer invalid",
      },
    });
    expect(response.statusCode).to.equal(401);
    expect(response.json()).to.deep.equal({
      error: "jwt malformed",
    });
  });

  it("should return 500 if presented with a valid session for a non-existent user", async () => {
    const response = await server.inject({
      method: "PUT",
      url: "/user/me",

      payload: {
        preferences: {
          width: 1024,
          height: 1024,
        },
        username: "test-sweet",
      },

      cookies: {
        [config.session.cookieName]: issueSession(uuidv4(), uuidv4()),
      },
    });
    expect(response.statusCode).to.equal(500);
    expect(response.json()).to.deep.equal({
      error: "Unable to update user",
    });
  });

  it("ignores disallowed fields in the request body", async () => {
    const response = await server.inject({
      method: "PUT",
      url: "/user/me",

      payload: {
        iceCreamFlavor: "chocolate",
        preferences: {
          width: 1024,
          height: 1024,
        },
        username: "test-sweet",
      },

      cookies: {
        [config.session.cookieName]: issueSession(user.id, uuidv4()),
      },
    });

    expect(response.statusCode).to.equal(200);
    delete user._queue;
    expect(response.json()).to.deep.equal({
      ...user,
      preferences: {
        width: 1024,
        height: 1024,
      },
      username: "test-sweet",
    });

    const updatedUser = await getUserById(user.id);
    expect(updatedUser).to.not.have.property("iceCreamFlavor");
  });

  it("should return 400 if the username is invalid", async () => {
    const response = await server.inject({
      method: "PUT",
      url: "/user/me",

      payload: {
        username: "test$%^!sweet",
      },

      cookies: {
        [config.session.cookieName]: issueSession(user.id, uuidv4()),
      },
    });

    expect(response.statusCode).to.equal(400);
    expect(response.json()).to.deep.equal({
      error: 'body/username must match pattern "^[a-zA-Z0-9_\\-.]+$"',
    });
  });
});

describe("PUT /user/:id", () => {
  let server: FastifyInstance;
  let user: RawUser;

  before(async () => {
    server = await getServer();
  });

  beforeEach(async () => {
    await clearTable();
    user = await createOrUpdateUserByEmail("test@test.com", server.log);
  });

  it("should return the updated user if request is signed by dreamup internal", async () => {
    const payload = {
      preferences: {
        width: 1024,
        height: 1024,
      },
      username: "test-sweet",
      features: {
        "test-feature": true,
      },
    };
    const response = await server.inject({
      method: "PUT",
      url: `/user/${user.id}`,
      payload,
      headers: {
        [config.webhooks.signatureHeader]: sign(
          JSON.stringify(payload),
          config.webhooks.privateKey
        ),
      },
    });
    expect(response.statusCode).to.equal(200);
    expect(response.json()).to.deep.equal({
      ...user,
      preferences: {
        width: 1024,
        height: 1024,
      },
      username: "test-sweet",
      features: {
        "test-feature": true,
      },
    });
  });

  it("should return 400 if request is not signed", async () => {
    const response = await server.inject({
      method: "PUT",
      url: `/user/${user.id}`,
      payload: {
        preferences: {
          width: 1024,
          height: 1024,
        },
        username: "test-sweet",
      },
    });
    expect(response.statusCode).to.equal(400);
    expect(response.json()).to.deep.equal({
      error: "Missing signature",
    });
  });

  it("should return 401 if request is signed with an invalid signature", async () => {
    const response = await server.inject({
      method: "PUT",
      url: `/user/${user.id}`,
      payload: {
        preferences: {
          width: 1024,
          height: 1024,
        },
        username: "test-sweet",
      },
      headers: {
        [config.webhooks.signatureHeader]: "invalid",
      },
    });
    expect(response.statusCode).to.equal(401);
    expect(response.json()).to.deep.equal({
      error: "Invalid signature",
    });
  });

  it("should return 400 if the username is invalid", async () => {
    const response = await server.inject({
      method: "PUT",
      url: `/user/${user.id}`,
      payload: {
        username: "test$%^!sweet",
      },
      headers: {
        [config.webhooks.signatureHeader]: sign(
          JSON.stringify({
            username: "test$%^!sweet",
          }),
          config.webhooks.privateKey
        ),
      },
    });

    expect(response.statusCode).to.equal(400);
    expect(response.json()).to.deep.equal({
      error: 'body/username must match pattern "^[a-zA-Z0-9_\\-.]+$"',
    });
  });

  it("should return 404 if the user does not exist", async () => {
    const response = await server.inject({
      method: "PUT",
      url: `/user/${uuidv4()}`,
      payload: {
        username: "test-sweet",
      },
      headers: {
        [config.webhooks.signatureHeader]: sign(
          JSON.stringify({
            username: "test-sweet",
          }),
          config.webhooks.privateKey
        ),
      },
    });

    expect(response.statusCode).to.equal(404);
    expect(response.json()).to.deep.equal({
      error: "User Not Found",
    });
  });
});
