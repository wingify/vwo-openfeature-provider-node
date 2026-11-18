import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores([
    "dist/**",
    "node_modules/**"
  ]),
  {
    files: [
      "src/**/*.{js,mjs,cjs,ts,mts,cts}"
    ],
    plugins: {
      js
    },
    extends: [
      "js/recommended"
    ],
    languageOptions: {
      globals: globals.browser
    }
  },
  tseslint.configs.recommended,
]);
