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
    res: FastifyReply
  ) {
    // Auth token can be in a cookie, or in the Authorization header as a bearer token
    const { authorization } = req.headers;
    let token;
    if (authorization) {
      const [authType, authToken] = authorization?.split(" ") ?? [null, null];
      if (authType.toLowerCase() !== "bearer") {
        return res.redirect(401, `/login/cognito?redirect=${req.url}`);
      }
      token = authToken;
    } else {
      const { [config.session.cookieName]: cookieToken } = req.cookies;
      if (!cookieToken) {
        console.log("No cookie token");
        console.log(req.cookies);
        return res.redirect(401, `/login/cognito?redirect=${req.url}`);
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
      console.error(e);
      return res.redirect(401, `/login/cognito?redirect=${req.url}`);
    }
  };
};
