import { FastifyReply, FastifyRequest } from "fastify";
import { KeyObject } from "node:crypto";
import config from "../config";
import jwt from "jsonwebtoken";

declare module "fastify" {
  interface FastifyRequest {
    user?: {
      userId: string;
      sessionId: string;
    };
  }
}

export const makeSessionValidator = (publicKey: KeyObject) => {
  return async function sourceValidator(
    req: FastifyRequest,
    reply: FastifyReply
  ) {
    // Auth token can be in a cookie, or in the Authorization header as a bearer token
    const { authorization } = req.headers;

    // We set a cookie with what idp the user last signed in with.
    // We use this to redirect a user to the correct login flow
    const { [config.session.idpCookieName]: idpCookie = "cognito" } =
      req.cookies;
    let token: string;
    let code: number = 307;
    if (authorization) {
      // If the user is using the API, we don't want to redirect them to the login page
      code = 401;
      const [authType, authToken] = authorization?.split(" ") ?? [null, null];
      if (authType.toLowerCase() !== "bearer") {
        return reply.status(code).send({ error: "Invalid authorization type" });
      }
      token = authToken;
    } else {
      const { [config.session.cookieName]: cookieToken } = req.cookies;
      if (!cookieToken) {
        return reply.redirect(code, `/login/${idpCookie}?redirect=${req.url}`);
      }
      token = cookieToken;
    }

    // Token must be valid
    try {
      const decoded = jwt.verify(token, publicKey, {
        algorithms: ["RS256"],
      }) as jwt.JwtPayload;
      const { userId, sessionId } = decoded as {
        userId: string;
        sessionId: string;
      };

      // Set the user ID and session ID on the request
      req.user = { userId, sessionId };
    } catch (e: any) {
      if (code === 401) {
        return reply.status(code).send({ error: e.message });
      }
      return reply.redirect(code, `/login/${idpCookie}?redirect=${req.url}`);
    }
  };
};
