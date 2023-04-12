import { DatabaseTable } from "db-dynamo";
import { QueueManager } from "queue-sqs";
import { FastifyInstance } from "fastify";
import {
  systemUserUpdateSchema,
  userSchema,
  SystemUserUpdate,
  User,
} from "../types";
import { v4 as uuidv4 } from "uuid";

const queueManager = new QueueManager();
const userTable = new DatabaseTable("users");

const createUserOpts = {
  schema: {
    body: systemUserUpdateSchema,
    response: {
      200: userSchema,
    },
  },
};

async function routes(server: FastifyInstance) {
  server.post<{
    Body: SystemUserUpdate;
    Response: User;
  }>("/users", createUserOpts, async (req, res) => {
    const { body } = req;
    const id = uuidv4();
    const user = {
      ...body,
      id,
    };
    try {
      // Create the user in the db
      const created = await userTable.create(user);

      // Create the user's job queue
      await queueManager.createQueue(id);
      return created;
    } catch (e: any) {
      server.log.error(e);
      return res.status(500).send({ error: e.message });
    }
  });
}

export default routes;
