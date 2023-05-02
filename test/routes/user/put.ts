import { expect } from "chai";
import config from "../../../src/config";
import { FastifyInstance } from "fastify";
import { createOrUpdateUserByEmail, getUserById } from "../../../src/crud";
import { issueSession } from "../../../src/routes/login";
import { PublicUser, RawUser } from "../../../src/types";
import { getServer, clearTable, sign } from "../../util";
import { v4 as uuidv4 } from "uuid";

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

  it("should return 307 if request is submitted with an invalid cookie", async () => {
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
    expect(response.statusCode).to.equal(307);
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
