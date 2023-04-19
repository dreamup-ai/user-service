import config from "../config";
import { FastifyInstance } from "fastify";

const sessionJWK = config.session.publicKey.export({ format: "jwk" });
const webhookJWK = config.webhooks.publicKey.export({ format: "jwk" });

const routes = (server: FastifyInstance, _: any, done: Function) => {
  server.get("/.well-known/session-jwks.json", (req, reply) => {
    return sessionJWK;
  });

  server.get("/.well-known/webhook-jwks.json", (req, reply) => {
    return webhookJWK;
  });

  done();
};

export default routes;
