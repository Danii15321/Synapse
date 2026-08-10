import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import path from "node:path"

const SERVER_SEED_PROCESS = "SYNAPSE_SERVER_SEED_PROCESS"

function reportLine(
  rubric: string,
  distribution: Readonly<{ FREE: number; PREMIUM: number }>,
): string {
  return `${rubric} — FREE: ${distribution.FREE} — PREMIUM: ${distribution.PREMIUM}`
}

async function seed(): Promise<void> {
  const { PrismaClient } = await import("@prisma/client")
  const { synchronizePromptCatalogWithClient } =
    await import("../src/server/repositories/resource-import-repository")
  const { importPromptResources } =
    await import("../src/server/services/resource-import-service")
  const db = new PrismaClient()
  const report = await importPromptResources(
    { directory: path.join(process.cwd(), "ressources", "PROMPTS") },
    {
      synchronizePromptCatalog: (prompts) =>
        synchronizePromptCatalogWithClient(db, prompts),
    },
  ).finally(async () => db.$disconnect())
  const lines = [
    `Importés: ${report.imported}`,
    `Mis à jour: ${report.updated}`,
    `Rejetés: ${report.rejected}`,
    reportLine("Prompts", report.distribution.prompts),
    reportLine("Formations", report.distribution.formations),
    reportLine("Opportunités", report.distribution.opportunites),
    reportLine("Jeux", report.distribution.jeux),
  ]
  process.stdout.write(`${lines.join("\n")}\n`)
}

function runIsolatedServerSeed(): number {
  const result = spawnSync(
    process.execPath,
    [
      "--conditions=react-server",
      "--import",
      "tsx",
      fileURLToPath(import.meta.url),
    ],
    {
      env: { ...process.env, [SERVER_SEED_PROCESS]: "1" },
      stdio: "inherit",
    },
  )

  if (result.error) throw result.error
  return result.status ?? 1
}

if (process.env[SERVER_SEED_PROCESS] === "1") {
  void seed().catch((error: unknown) => {
    const reason = error instanceof Error ? error.message : "Erreur inconnue"
    process.stderr.write(`Rejeté: 1\nMotif: ${reason}\n`)
    process.exitCode = 1
  })
} else {
  process.exitCode = runIsolatedServerSeed()
}
