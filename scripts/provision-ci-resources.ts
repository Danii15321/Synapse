import { cp, lstat, mkdir } from "node:fs/promises"
import path from "node:path"

import {
  createResourceProject,
  removeResourceProject,
} from "../tests/fixtures/resource-import-test-utils"

async function pathExists(candidate: string): Promise<boolean> {
  try {
    await lstat(candidate)
    return true
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return false
    }
    throw error
  }
}

async function main(): Promise<void> {
  if (process.env.CI !== "true") {
    throw new Error("Ce provisionnement synthétique est réservé à la CI.")
  }

  const target = path.join(process.cwd(), "ressources", "PROMPTS")
  if (await pathExists(target)) {
    throw new Error(
      `Refus d'écraser un dossier de ressources existant: ${target}`,
    )
  }

  const fixture = await createResourceProject()
  try {
    await mkdir(path.dirname(target), { recursive: true })
    await cp(fixture.promptsDirectory, target, {
      errorOnExist: true,
      force: false,
      recursive: true,
    })
    process.stdout.write(
      "69 ressources Prompts synthétiques et éphémères provisionnées pour la CI.\n",
    )
  } finally {
    await removeResourceProject(fixture)
  }
}

void main().catch((error: unknown) => {
  const reason = error instanceof Error ? error.message : "Erreur inconnue"
  process.stderr.write(`${reason}\n`)
  process.exitCode = 1
})
