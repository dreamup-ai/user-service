import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import config from "../config";

export const cognito = new CognitoIdentityProviderClient({
  region: config.aws.region,
  endpoint: config.aws.endpoints.cognito,
});
