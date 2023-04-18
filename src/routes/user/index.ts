import { FastifyInstance } from "fastify";
import getRoutes from "./get";
import postRoutes from "./post";
import putRoutes from "./put";

const routes = async (server: FastifyInstance) => {
  await server.register(getRoutes);
  await server.register(postRoutes);
  await server.register(putRoutes);
};

export default routes;
