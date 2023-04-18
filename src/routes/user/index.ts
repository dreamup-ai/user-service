import { FastifyInstance } from "fastify";
import deleteRoutes from "./delete";
import getRoutes from "./get";
import postRoutes from "./post";
import putRoutes from "./put";

const routes = (server: FastifyInstance, _: any, done: Function) => {
  server.register(getRoutes);
  server.register(postRoutes);
  server.register(putRoutes);
  server.register(deleteRoutes);

  done();
};

export default routes;
