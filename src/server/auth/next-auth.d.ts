import "server-only"

import type { DefaultSession } from "next-auth"
import "next-auth"

import type { SessionUser } from "@/lib/validators/auth"

declare module "next-auth" {
  interface Session {
    user: SessionUser & DefaultSession["user"]
  }

  interface User {
    membership: SessionUser["membership"]
  }
}
