import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import react from "eslint-plugin-react";

export default [
  { ignores: ["dist", "node_modules", "android", "ios"] },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      // ESLint empfohlene Regeln
      ...js.configs.recommended.rules,

      // React Hooks Regeln (wichtig!)
      ...reactHooks.configs.recommended.rules,
      // set-state-in-effect auf warn setzen - Pattern wird für Prop-zu-State-Sync verwendet
      "react-hooks/set-state-in-effect": "warn",

      // React Refresh für Vite HMR
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],

      // Angepasste Regeln für dieses Projekt
      "no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      }],
      "no-console": "off", // Console.log erlauben (für Debugging)
      "react/prop-types": "off", // Keine PropTypes erforderlich (kein TypeScript)
      "react/react-in-jsx-scope": "off", // React 17+ braucht kein import React
    },
  },
];
