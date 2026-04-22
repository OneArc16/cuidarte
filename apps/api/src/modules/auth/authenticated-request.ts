import { type AuthUser } from "@cuidarte/contracts";
import { type FastifyRequest } from "fastify";

export type AuthenticatedRequest = FastifyRequest & {
  currentUser: AuthUser;
};

export type MaybeAuthenticatedRequest = FastifyRequest & {
  currentUser?: AuthUser;
};
