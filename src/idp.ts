import { FastifyInstance, FastifyRequest } from "fastify";
import oauthPlugin, { OAuth2Namespace } from "@fastify/oauth2";
import config from "./config";
import jwt from "jsonwebtoken";
import { getUserByCognitoId, createUser } from "./crud";
import { v4 as uuidv4 } from "uuid";

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

const routes = async (server: FastifyInstance) => {
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
    generateStateFunction: (
      request: FastifyRequest<{ Querystring: { redirect: string } }>
    ) => {
      // get redirect from querystring
      const { redirect } = request.query;
      if (!redirect) {
        throw new Error("No redirect URL provided");
      }
      return redirect;
    },
    checkStateFunction: (returnedState: string, callback: Function) =>
      callback(),
  });

  server.get<{
    Querystring: {
      code: string;
      state: string;
    };
  }>(
    "/login/cognito/callback",
    {
      schema: {
        querystring: {
          code: { type: "string" },
          state: { type: "string" },
        },
      },
    },
    async (request, reply) => {
      const { token } =
        await server.cognitoOAuth2.getAccessTokenFromAuthorizationCodeFlow(
          request
        );
      const decoded = jwt.decode(token.id_token) as jwt.JwtPayload;
      if (!decoded || typeof decoded.sub !== "string") {
        throw new Error("Invalid token");
      }

      const { sub, email } = decoded;
      let user = await getUserByCognitoId(sub, server.log);
      if (!user) {
        try {
          user = await createUser(email, server.log, {
            "idp:cognito:id": sub,
          });
        } catch (err: any) {
          server.log.error(err);
          return reply.status(500).send({
            error: "Internal server error",
          });
        }
      }

      // Get the redirect URL from the state
      const redirectUrl = request.query.state;
      const sessionToken = await issueSession(user.id, uuidv4());

      // console.log(redirectUrl, sessionToken);

      // Set the session token as a cookie named dreamup_session,
      // and redirect to the redirect URL
      reply
        .setCookie("dreamup_session", sessionToken, {
          path: "/",
          httpOnly: true,
          secure: true,
          sameSite: "strict",
          maxAge: 24 * 60 * 60 * 1000, // 1 day
        })
        .redirect(redirectUrl);
    }
  );
};

export default routes;

export const issueSession = async (userId: string, sessionId: string) => {
  const token = jwt.sign(
    {
      userId,
      sessionId,
    },
    config.session.privateKey,
    {
      expiresIn: config.session.duration,
      algorithm: "RS256",
    }
  );
  return token;
};
