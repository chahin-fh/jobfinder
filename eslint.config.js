import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';

export default ts.config(
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs['flat/recommended'],
	{
		// Svelte 5 rune stores live in `.svelte.ts` files - still plain TypeScript.
		files: ['**/*.svelte.ts'],
		languageOptions: { parser: ts.parser }
	},
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node }
		},
		rules: {
			// Supabase responses are untyped in this project, so `any` is expected
			// at the API boundary.
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
			],
			// These SvelteKit 2 rules are opinionated requests for a style this codebase
			// predates. Enabling them would mean rewriting every link and keyed each
			// block for no behaviour change, so they stay off on purpose.
			'svelte/no-navigation-without-resolve': 'off',
			'svelte/require-each-key': 'off',
			'svelte/prefer-svelte-reactivity': 'off'
		}
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parserOptions: { parser: ts.parser }
		}
	},
	{
		ignores: ['.svelte-kit/', 'build/', '.vercel/', 'node_modules/', 'static/']
	}
);
