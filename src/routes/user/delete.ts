import { FastifyInstance } from "fastify";
import {
  DeletedResponse,
  IdParam,
  SignatureHeader,
  deletedResponseSchema,
  errorResponseSchema,
  idParamSchema,
  signatureHeaderSchema,
} from "../../types";
import { dreamupInternal } from "../../middleware/audiences";
import { deleteUserById } from "../../crud";

const routes = (server: FastifyInstance, _: any, done: Function) => {
  server.delete<{
    Reply: DeletedResponse;
    Headers: SignatureHeader;
    Params: IdParam;
  }>(
    "/user/:id",
    {
      schema: {
        params: idParamSchema,
        headers: signatureHeaderSchema,
        response: {
          200: deletedResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
      preValidation: [dreamupInternal],
    },
    async (req, reply) => {
      const { id } = req.params;
      try {
        const user = await deleteUserById(id, server.log);
        if (!user) {
          return reply.status(404).send({ error: "User not found" });
        }
        return { deleted: true, id };
      } catch (e: any) {
        server.log.error(e);
        return reply.status(500).send({ error: "Unable to delete user" });
      }
    }
  );

  done();
};

export default routes;
