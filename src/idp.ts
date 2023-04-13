import { FastifyInstance } from "fastify";
import oauthPlugin, { OAuth2Namespace } from "@fastify/oauth2";
import config from "./config";
import jwt from "jsonwebtoken";
import { IDatabaseTable } from "interfaces";
import { getUserByEmail } from "./crud";

declare module "fastify" {
  interface FastifyInstance {
    cognitoOAuth2: OAuth2Namespace;
  }
}

declare module "@fastify/oauth2" {
  interface Token {
    id_token: string;
  }
}

declare module "jsonwebtoken" {
  interface JwtPayload {
    [key: string]: any;
  }
}

const routes = async (
  server: FastifyInstance,
  {
    userTable,
  }: {
    userTable: IDatabaseTable;
  }
) => {
  server.register(oauthPlugin, {
    name: "cognitoOAuth2",
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

  server.get(
    "/login/cognito/callback",
    {
      schema: {
        querystring: {
          code: { type: "string" },
        },
      },
    },
    async (request, reply) => {
      const { token } =
        await server.cognitoOAuth2.getAccessTokenFromAuthorizationCodeFlow(
          request
        );
      const decoded = jwt.decode(token.id_token);
      if (!decoded) {
        throw new Error("Invalid token");
      }

      const { email } = decoded as jwt.JwtPayload;
      const user = await getUserByEmail({ email, userTable });

      return user;
    }
  );
};

export default routes;
