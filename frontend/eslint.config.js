import javascript from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import typescript from "typescript-eslint";

export default typescript.config(
  { ignores: ["dist", "dev-dist"] },
  javascript.configs.recommended,
  ...typescript.configs.recommended,
  reactHooks.configs.flat["recommended-latest"],
  {
    languageOptions: { globals: { ...globals.browser, ...globals.serviceworker } },
  },
);
