import { expect } from "chai";
import config from "../../../src/config";
import { FastifyInstance } from "fastify";
import { cognito } from "../../../src/clients/cognito";
import { getServer, clearTable, sign } from "../../util";
import cognitoPayload from "../../fixtures/cognito-payload.json";
import sinon from "sinon";

const sandbox = sinon.createSandbox();

const getCognitoPayload = () => {
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
