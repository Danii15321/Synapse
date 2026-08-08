import { randomUUID } from "node:crypto"

import { NextResponse } from "next/server"

import { writeLog } from "@/server/logger"
import { getHomePageData } from "@/server/services/home-service"

const GENERIC_ERROR_MESSAGE = "Une erreur rend l'accueil indisponible."

export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json(await getHomePageData())
  } catch (error) {
    const errorId = randomUUID()
    writeLog({
      error:
        error instanceof Error
          ? { message: error.message, name: error.name }
          : { message: String(error) },
      errorId,
      method: "GET",
      route: "/api/home",
      status: 500,
    })
    return NextResponse.json(
      { errorId, message: GENERIC_ERROR_MESSAGE },
      { status: 500 },
    )
  }
}
