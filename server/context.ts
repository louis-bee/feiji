import type { FastifyInstance } from "fastify";
import type { openDatabase } from "./database";

export type Store = ReturnType<typeof openDatabase>;

export interface RouteContext {
  app: FastifyInstance;
  store: Store;
  mediaDir: string;
}
