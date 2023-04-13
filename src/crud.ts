import { IDatabaseTable, IQueueManager, SortDirection } from "interfaces";
import config from "./config";
import { User } from "./types";
import { sendWebhook } from "./webhooks";
import { FastifyBaseLogger } from "fastify";

export const createUser = async ({
  user,
  userTable,
  queueManager,
  log,
}: {
  user: User;
  userTable: IDatabaseTable;
  queueManager: IQueueManager;
  log: FastifyBaseLogger;
}) => {
  const { items: existingUsers } = await userTable.query({
    query: { email: user.email },
    pageSize: 1,
    sortKey: "created",
    sortDir: SortDirection.DESC,
  });
  if (existingUsers.length > 0) {
    const e = new Error("User already exists");
    e.name = "UserExistsError";
    throw e;
  }
  const [created, queue] = await Promise.all([
    // Create the user
    userTable.create(user),

    // Create the user's queue
    queueManager.createQueue(`${config.queue.sd_prefix}${user.id}`),
  ]);
  sendWebhook("user.created", created, log);
  return created;
};
