import { FastifyInstance } from "fastify";
import {
  DeletedResponse,
  IdParam,
  SignatureHeader,
  deletedResponseSchema,
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
        },
      },
      preValidation: [dreamupInternal],
    },
    async (req, reply) => {
      const { id } = req.params;
      try {
        await deleteUserById(id);
        return { deleted: true };
      } catch (e: any) {
        server.log.error(e);
        return reply.status(500).send({ error: "Unable to delete user" });
      }
    }
  );

  done();
};

export default routes;
