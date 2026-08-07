import { spawnSync } from "node:child_process"
import { join } from "node:path"

import { expect, it } from "vitest"

function scenario(name: string, given: string, when: string, then: string): string {
  return `${name} — ce qui est vérifié\nGIVEN : ${given}\nWHEN  : ${when}\nTHEN  : ${then}`
}

it(
  scenario(
    "Un composant client ne peut pas importer la base serveur",
    "un projet Next fixture dont un composant use client importe src/server/db.ts",
    "un build de production est lancé sur cette fixture",
    "le build échoue explicitement sur la frontière server-only, et non pour une erreur sans rapport",
  ),
  () => {
    const fixture = join(process.cwd(), "tests/fixtures/client-server-boundary")
    const result = spawnSync("npm", ["exec", "next", "build", fixture], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        DATABASE_URL: "postgresql://synapse:example@localhost:5432/synapse",
      },
      shell: process.platform === "win32",
      timeout: 120_000,
    })
    const output = `${result.stdout}\n${result.stderr}`

    expect(result.status).not.toBe(0)
    expect(output).toMatch(/server-only|Client Component|cannot be imported.*client/i)
  },
  130_000,
)
