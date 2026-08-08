import { randomUUID } from "node:crypto"

import { NextResponse } from "next/server"

import { promptListQuerySchema } from "@/lib/validators/prompt"
import { mapDomainError, RateLimitedError } from "@/server/errors"
import { writeLog } from "@/server/logger"
import { getPrompts } from "@/server/services/prompt-service"

const GENERIC_ERROR_MESSAGE = "La requête n'a pas pu être traitée."

export async function GET(request: Request): Promise<NextResponse> {
  const startedAt = Date.now()

  try {
    const rawQuery = Object.fromEntries(new URL(request.url).searchParams)
    const parsedQuery = promptListQuerySchema.safeParse(rawQuery)
    if (!parsedQuery.success) {
      return NextResponse.json(
        { message: GENERIC_ERROR_MESSAGE },
        { status: 400 },
      )
    }

    const prompts = await getPrompts(parsedQuery.data)

    return NextResponse.json(prompts)
  } catch (error) {
    const errorId = randomUUID()
    const { status } = mapDomainError(error)
    const route = new URL(request.url).pathname

    writeLog({
      durationMs: Date.now() - startedAt,
      error:
        error instanceof Error
          ? { message: error.message, name: error.name, stack: error.stack }
          : { message: String(error) },
      errorId,
      method: request.method,
      route,
      status,
    })

    const response = NextResponse.json(
      { errorId, message: GENERIC_ERROR_MESSAGE },
      { status },
    )
    if (error instanceof RateLimitedError) {
      response.headers.set("Retry-After", String(error.retryAfterSeconds))
    }

    return response
  }
}
