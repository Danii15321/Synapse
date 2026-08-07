import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTypescript from "eslint-config-next/typescript"

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([
    ".next/**",
    "**/.next/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
  ]),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": "error",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../../*", "../../../*", "../../../../*"],
              message: "Utiliser l'alias @/* pour les imports profonds.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["tests/**/*.ts", "tests/**/*.tsx"],
    rules: {
      "@next/next/no-assign-module-variable": "off",
    },
  },
  {
    files: ["tests/fixtures/client-server-boundary/app/page.tsx"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
])

export default eslintConfig
