import { FastifyReply, FastifyRequest } from "fastify";
import crypto, { KeyObject } from "node:crypto";

export const makeSourceValidator = (publicKey: KeyObject, header: string) => {
  return async function sourceValidator(
    req: FastifyRequest,
    res: FastifyReply
  ) {
    const { [header]: signature } = req.headers;
    if (!signature) {
      return res.status(400).send({
        error: "Missing signature",
      });
    }
    if (Array.isArray(signature)) {
      return res.status(400).send({
        error: "Only Include One Signature",
      });
    }
    // Request must be valid
    const isVerified = crypto.verify(
      "sha256",
      Buffer.from(
        JSON.stringify(req.body || { url: req.url, ...(req.params || {}) })
      ),
      publicKey,
      Buffer.from(signature, "base64")
    );
    if (!isVerified) {
      return res.status(401).send({
        error: "Invalid signature",
      });
    }
  };
};
