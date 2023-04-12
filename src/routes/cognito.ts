import { DatabaseTable } from "db-dynamo";
import { QueueManager } from "queue-sqs";
import { FastifyInstance } from "fastify";
import {
  userSchema,
  User,
  CognitoNewUserPayload,
  NewUserHeader,
} from "../types";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import assert from "node:assert";
import crypto from "node:crypto";

const {
  COGNITO_USER_POOL_ID,
  PUBLIC_KEY_PATH,
  SD_Q_PREFIX = "sd-jobs_",
} = process.env;

assert(COGNITO_USER_POOL_ID, "COGNITO_USER_POOL_ID is required");
assert(PUBLIC_KEY_PATH, "PUBLIC_KEY_PATH is required");

const publicKey = fs.readFileSync(PUBLIC_KEY_PATH);

const queueManager = new QueueManager();
const userTable = new DatabaseTable("users");

async function routes(server: FastifyInstance) {
  server.post<{
    Body: CognitoNewUserPayload;
    Headers: NewUserHeader;
    Response: User;
  }>(
    "/user/cognito",
    {
      schema: {
        body: {
          type: "string",
        },
        response: {
          201: userSchema,
        },
      },
      preValidation: async (req, res) => {
        // Request must be signed
        const { "x-idp-signature": signature } = req.headers;
        if (!signature) {
          return res.status(400).send({
            error: "Missing signature",
          });
        }

        // Request must be from Cognito
        const { triggerSource, userPoolId } = req.body;
        if (triggerSource !== "PostConfirmation_ConfirmSignUp") {
          return res.status(400).send({
            error: "Invalid trigger source",
          });
        }
        if (userPoolId !== COGNITO_USER_POOL_ID) {
          return res.status(400).send({
            error: "Invalid user pool ID",
          });
        }

        // Request must be valid
        const isVerified = crypto.verify(
          "sha256",
          Buffer.from(JSON.stringify(req.body)),
          publicKey,
          Buffer.from(signature, "base64")
        );
        if (!isVerified) {
          return res.status(401).send({
            error: "Invalid signature",
          });
        }
      },
    },

    async (req, res) => {
      const {
        userPoolId,
        request: { userAttributes },
      } = req.body;

      const { sub, email } = userAttributes;
      const user = {
        id: uuidv4(),
        email,
        "idp:cognito": {
          userPoolId,
          userId: sub,
        },
        preferences: {},
        features: {},
      };
      try {
        const created = await userTable.create(user);
        await queueManager.createQueue(`${SD_Q_PREFIX}${user.id}`);
        return res.status(201).send(created);
      } catch (e: any) {
        return res.status(500).send({
          error: e.message,
        });
      }
    }
  );
}

export default routes;
