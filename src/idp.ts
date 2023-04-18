import { FastifyInstance, FastifyRequest } from "fastify";
import oauthPlugin, { OAuth2Namespace } from "@fastify/oauth2";
import config from "./config";
import jwt from "jsonwebtoken";
import {
  getUserByCognitoId,
  createOrUpdateUserByEmail,
  getUserByGoogleId,
  getUserByDiscordId,
} from "./crud";
import { v4 as uuidv4 } from "uuid";
import {
  oauthQueryStringSchema,
  OAuthQueryString,
  DiscordToken,
  GoogleToken,
  CognitoToken,
} from "./types";

declare module "fastify" {
  interface FastifyInstance {
    cognitoOAuth2: OAuth2Namespace;
    googleOAuth2: OAuth2Namespace;
    discordOAuth2: OAuth2Namespace;
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
    Querystring: OAuthQueryString;
  }>(
    "/login/cognito/callback",
    {
      schema: {
        querystring: oauthQueryStringSchema,
      },
    },
    async (request, reply) => {
      const { token } =
        await server.cognitoOAuth2.getAccessTokenFromAuthorizationCodeFlow(
          request
        );
      const decoded = jwt.decode(token.id_token) as CognitoToken;
      if (!decoded || typeof decoded.sub !== "string") {
        throw new Error("Invalid token");
      }

      const { sub, email } = decoded;
      let user = await getUserByCognitoId(sub, server.log);
      if (!user) {
        try {
          user = await createOrUpdateUserByEmail(email, server.log, {
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
      const sessionToken = issueSession(user.id, uuidv4());

      // console.log(redirectUrl, sessionToken);

      // Set the session token as a cookie named dreamup_session,
      // and redirect to the redirect URL
      reply
        .setCookie(config.session.cookieName, sessionToken, {
          domain: config.session.cookieDomain,
          path: "/",
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          maxAge: 24 * 60 * 60 * 1000, // 1 day
        })
        .setCookie(config.session.idpCookieName, "cognito", {
          domain: config.session.cookieDomain,
          path: "/",
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        })
        .redirect(redirectUrl);
    }
  );

  // Set up google OAuth2
  if (config.idp.google) {
    server.register(oauthPlugin, {
      name: "googleOAuth2",
      credentials: {
        client: {
          id: config.idp.google.clientId,
          secret: config.idp.google.clientSecret,
        },
        auth: oauthPlugin.GOOGLE_CONFIGURATION,
      },
      startRedirectPath: config.idp.google.redirectPath,
      callbackUri: config.idp.google.callbackUri,
      scope: ["email", "profile"],
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
      Querystring: OAuthQueryString;
      Response: any;
    }>(
      "/login/google/callback",
      {
        schema: {
          querystring: oauthQueryStringSchema,
          response: {
            200: {
              type: "object",
              additionalProperties: {
                type: "string",
              },
            },
          },
        },
      },
      async (request, reply) => {
        const { token } =
          await server.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(
            request
          );
        const decoded = jwt.decode(token.id_token) as GoogleToken;
        if (!decoded || typeof decoded.sub !== "string") {
          throw new Error("Invalid token");
        }
        const { sub, email } = decoded;
        let user = await getUserByGoogleId(sub.toString(), server.log);
        if (!user) {
          try {
            user = await createOrUpdateUserByEmail(email, server.log, {
              "idp:google:id": sub.toString(),
            });
          } catch (err: any) {
            server.log.error(err);
            return reply.status(500).send({
              error: "Internal server error",
            });
          }
        }
        const redirectUrl = request.query.state;
        const sessionToken = issueSession(user.id, uuidv4());
        reply
          .setCookie(config.session.cookieName, sessionToken, {
            domain: config.session.cookieDomain,
            path: "/",
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000, // 1 day
          })
          .setCookie(config.session.idpCookieName, "google", {
            domain: config.session.cookieDomain,
            path: "/",
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          })
          .redirect(redirectUrl);
      }
    );
  }

  // Set up discord Oauth2
  if (config.idp.discord) {
    server.register(oauthPlugin, {
      name: "discordOAuth2",
      credentials: {
        client: {
          id: config.idp.discord.clientId,
          secret: config.idp.discord.clientSecret,
        },
        auth: oauthPlugin.DISCORD_CONFIGURATION,
      },
      startRedirectPath: config.idp.discord.redirectPath,
      callbackUri: config.idp.discord.callbackUri,
      scope: ["identify", "email"],
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
      Querystring: OAuthQueryString;
      Response: any;
    }>(
      "/login/discord/callback",
      {
        schema: {
          querystring: oauthQueryStringSchema,
          response: {
            200: {
              type: "object",
              additionalProperties: {
                type: "string",
              },
            },
          },
        },
      },
      async (request, reply) => {
        const { token } =
          (await server.discordOAuth2.getAccessTokenFromAuthorizationCodeFlow(
            request
          )) as unknown as { token: DiscordToken };
        // Fetch user info
        const userInfo = await fetch(`${config.discord.apiHost}/users/@me`, {
          headers: {
            authorization: `Bearer ${token.access_token}`,
          },
        });
        const userInfoJson = await userInfo.json();
        const { id, email } = userInfoJson;
        let user = await getUserByDiscordId(id, server.log);
        if (!user) {
          try {
            user = await createOrUpdateUserByEmail(email, server.log, {
              "idp:discord:id": id,
            });
          } catch (err: any) {
            server.log.error(err);
            return reply.status(500).send({
              error: "Internal server error",
            });
          }
        }
        const redirectUrl = request.query.state;
        const sessionToken = issueSession(user.id, uuidv4());
        reply
          .setCookie(config.session.cookieName, sessionToken, {
            domain: config.session.cookieDomain,
            path: "/",
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000, // 1 day
          })
          .setCookie(config.session.idpCookieName, "discord", {
            domain: config.session.cookieDomain,
            path: "/",
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          })
          .redirect(redirectUrl);
      }
    );
  }
};

export default routes;

export const issueSession = (userId: string, sessionId: string) => {
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
