import { FastifyBaseLogger } from "fastify";
import config from "./config";
import crypto from "node:crypto";

function sign(payload: string) {
  const signature = crypto.sign(
    "sha256",
    Buffer.from(payload),
    config.webhooks.privateKey
  );
  return signature.toString("base64");
}

export const sendWebhook = async (
  event: string,
  data: any,
  log: FastifyBaseLogger
) => {
  if (!config.webhooks.events[event]) {
    return;
  }
  try {
    const body = JSON.stringify({ event, payload: data });
    const signature = sign(body);
    const response = await fetch(config.webhooks.events[event], {
      method: "POST",
      body,
      headers: {
        "Content-Type": "application/json",
        [config.webhooks.signatureHeader]: signature,
      },
    });
    if (!response.ok) {
      throw new Error(
        `Webhook "${event}" failed with status ${response.status}: ${response.statusText}`
      );
    }
  } catch (e: any) {
    log.error(`Webhook "${event}" failed: ${e.message}`);
  }
};
