import "server-only"

import { PrismaAdapter } from "@auth/prisma-adapter"
import NextAuth from "next-auth"
import { z } from "zod"

import { membershipSchema } from "@/lib/validators/auth"
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from "@/server/auth/session-cookie"
import { config as appConfig } from "@/server/config"
import { db } from "@/server/db"

const adapterSessionUserSchema = z
  .object({
    email: z.string().email(),
    id: z.string().min(1),
    membership: membershipSchema,
  })
  .passthrough()

export const { auth, handlers, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  secret: appConfig.AUTH_SECRET,
  trustHost: true,
  session: {
    maxAge: 30 * 24 * 60 * 60,
    strategy: "database",
    updateAge: 24 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      name: SESSION_COOKIE_NAME,
      options: SESSION_COOKIE_OPTIONS,
    },
  },
  providers: [],
  callbacks: {
    session({ session, user }) {
      const currentUser = adapterSessionUserSchema.parse(user)
      session.user.id = currentUser.id
      session.user.email = currentUser.email
      session.user.membership = currentUser.membership
      return {
        expires: new Date(session.expires).toISOString(),
        user: {
          email: session.user.email,
          id: session.user.id,
          membership: session.user.membership,
        },
      }
    },
  },
})
