// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      "prettier/prettier": ["error", { endOfLine: "auto" }],
    },
  },
  {
    // Plain CommonJS scripts (test/global-setup.js, k6 scripts under
    // test/performance/*.js) aren't part of any tsconfig "include", so
    // typescript-eslint's projectService parser option has nothing to
    // resolve them against — without this override, linting them at all
    // (e.g. via an editor's ESLint extension, which — unlike `npm run
    // lint`'s "{src,apps,libs,test}/**/*.ts" glob — doesn't skip .js files)
    // fails with "was not found by the project service" instead of
    // actually linting. This must stay LAST: it turns off type-aware rules
    // for .js files only, and has to win over the block above that
    // re-enables one (no-floating-promises) for every file.
    files: ['**/*.js'],
    ...tseslint.configs.disableTypeChecked,
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
