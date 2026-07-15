import type { PermissionKey, RoleKey } from "@falcon/shared";
import type { ApiEnv } from "@falcon/config";
import type { AnyDb } from "@falcon/database";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  roles: RoleKey[];
  permissions: Set<PermissionKey>;
  totpEnabled: boolean;
  mustChangePassword: boolean;
}

export interface AuthSessionRef {
  id: string;
  tokenHash: string;
}

declare module "fastify" {
  interface FastifyInstance {
    env: ApiEnv;
    db: AnyDb;
  }
  interface FastifyRequest {
    authUser: AuthUser | null;
    authSession: AuthSessionRef | null;
  }
}
