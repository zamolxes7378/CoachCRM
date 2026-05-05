import js from '@eslint/js'
import reactPlugin from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  // Base JS recommended rules
  js.configs.recommended,

  // React files
  {
    files: ['**/*.{js,jsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        FormData: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        history: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        IntersectionObserver: 'readonly',
        AbortController: 'readonly',
        TextEncoder: 'readonly',
        crypto: 'readonly',
        // Vite
        'import.meta': 'readonly',
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // React rules — errors for things that break renders
      ...reactPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off', // Not needed with React 17+ JSX transform
      'react/prop-types': 'off',         // No PropTypes in this codebase
      'react/no-unescaped-entities': 'off', // Allow unescaped apostrophes in French text

      // Hooks rules — exhaustive-deps as warn so existing code isn't blocked
      ...reactHooks.configs.recommended.rules,
      'react-hooks/exhaustive-deps': 'warn',

      // react-refresh: warn only — doesn't affect correctness
      'react-refresh/only-export-components': 'warn',

      // JS quality — warn rather than error to avoid blocking other tracks
      'no-unused-vars': 'warn',
      'no-console': 'off',              // This codebase uses console.error throughout
    },
  },

  // Test files — relax rules for test utilities
  {
    files: ['src/__tests__/**/*.{js,jsx}', '**/*.test.{js,jsx}', '**/*.spec.{js,jsx}'],
    languageOptions: {
      globals: {
        // Vitest globals (enabled via config globals: true)
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
    },
  },

  // Ignored paths
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'supabase/_archive/**',
      'therapeute_docs/**',
      '*.config.js'
    ],
  },
]
