import { expect } from "chai";
import config from "../../../src/config";
import { FastifyInstance } from "fastify";
import { createOrUpdateUserByEmail } from "../../../src/crud";
import { RawUser } from "../../../src/types";
import { getServer, clearTable, sign } from "../../util";
import { v4 as uuidv4 } from "uuid";

describe("DELETE /user/:id", () => {
  let server: FastifyInstance;
  let user: RawUser;

  before(async () => {
    server = await getServer();
  });

  beforeEach(async () => {
    await clearTable();
    user = await createOrUpdateUserByEmail("test@test.com", server.log);
  });

  it("should return 200 if user is deleted", async () => {
    const response = await server.inject({
      method: "DELETE",
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
      deleted: true,
      id: user.id
    })
  });
});
