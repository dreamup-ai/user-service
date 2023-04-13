import { FastifyInstance } from "fastify";
import oauthPlugin from "@fastify/oauth2";
import config from "./config";

const routes = async (server: FastifyInstance) => {
  server.register(oauthPlugin, {
    name: "cognito",
    credentials: {
      client: {
        id: config.idp.cognito.clientId,
        secret: config.idp.cognito.clientSecret,
      },
      auth: {
        tokenHost: config.idp.cognito.tokenHost,
        tokenPath: config.idp.cognito.tokenPath,
        authorizePath: config.idp.cognito.authPath,
        authorizeHost: config.idp.cognito.authHost,
      },
    },
    startRedirectPath: config.idp.cognito.redirectPath,
    callbackUri: config.idp.cognito.callbackUri,
    scope: ["email openid profile"],
  });
};

export default routes;
