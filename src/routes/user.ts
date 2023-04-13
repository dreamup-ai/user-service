import { FastifyInstance } from "fastify";
import {
  userSchema,
  User,
  CognitoNewUserPayload,
  NewUserHeader,
  cognitoNewUserPayloadSchema,
  systemUserUpdateSchema,
  SystemUserUpdate,
} from "../types";
import { v4 as uuidv4 } from "uuid";
import crypto from "node:crypto";
import { IDatabaseTable, IQueueManager } from "interfaces";

import config from "../config";
import { sendWebhook } from "../webhooks";

const routes = async (
  server: FastifyInstance,
  {
    userTable,
    queueManager,
  }: { userTable: IDatabaseTable; queueManager: IQueueManager }
) => {
  server.post<{
    Body: SystemUserUpdate;
    Headers: NewUserHeader;
    Response: User;
  }>("/user", {
    schema: {
      body: systemUserUpdateSchema,
      response: {
        201: userSchema,
      },
    },
    preValidation: async (req, res) => {},
    handler: async (req, res) => {},
  });
};
