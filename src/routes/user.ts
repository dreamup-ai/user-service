import { FastifyInstance } from "fastify";
import {
  userSchema,
  User,
  NewUserHeader,
  systemUserUpdateSchema,
  SystemUserUpdate,
} from "../types";
import { v4 as uuidv4 } from "uuid";
import { IDatabaseTable, IQueueManager } from "interfaces";
import config from "../config";
import { makeSourceValidator } from "../middleware/validate-source";
import { createUser } from "../crud";

const routes = async (
  server: FastifyInstance,
  {
    userTable,
    queueManager,
  }: { userTable: IDatabaseTable; queueManager: IQueueManager }
) => {
  /**
   * Create a new user. Only accepts input signed
   * by the dreamup private key.
   */
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
    preValidation: makeSourceValidator(
      config.webhooks.publicKey,
      config.webhooks.header
    ),
    handler: async (req, res) => {
      const { body } = req;
      const id = uuidv4();
      const user = {
        id,
        ...body,
        created: Date.now(),
        "idp:dreamup": {
          id,
        },
      };
      try {
        const created = await createUser({
          user,
          userTable,
          queueManager,
          log: server.log,
        });
        return res.status(201).send(created);
      } catch (e: any) {
        if (e.name === "UserExistsError") {
          return res.status(409).send({
            error: "User already exists",
          });
        }
        server.log.error(e);
        return res.status(500).send({
          error: "Internal server error",
        });
      }
    },
  });
};

export default routes;
