"use client"

import { db } from "../../../../src/server/db"

export default function ForbiddenClientPage() {
  return <main>{String(Boolean(db))}</main>
}
