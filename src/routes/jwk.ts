import config from "../config";
import { FastifyInstance } from "fastify";

const routes = (server: FastifyInstance, _: any, done: Function) => {
  server.get("/.well-known/session-jwks.json", (req, reply) => {
    return config.session.publicKey.export({ format: "jwk" });
  });

  server.get("/.well-known/webhook-jwks.json", (req, reply) => {
    return config.webhooks.publicKey.export({ format: "jwk" });
  });

  done();
};

export default routes;
