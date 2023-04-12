import { start, build } from "./server";
build().then((server) => {
  start(server);
});
