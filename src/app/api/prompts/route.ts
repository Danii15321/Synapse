import { NextResponse } from "next/server"

import { getPrompts } from "@/server/services/prompt-service"

export async function GET(): Promise<NextResponse> {
  const prompts = await getPrompts()

  return NextResponse.json(prompts)
}
