import config from "../config";
import { makeSessionValidator } from "./validate-session";
import { makeSourceValidator } from "./validate-source";

export const dreamupInternal = makeSourceValidator(
  config.webhooks.publicKey,
  config.webhooks.signatureHeader
);

export const dreamupUserSession = makeSessionValidator(
  config.session.publicKey
);

export const cognitoNewUserLambda = makeSourceValidator(
  config.idp.cognito.publicKey,
  config.idp.cognito.signatureHeader
);
