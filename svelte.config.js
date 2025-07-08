import * as child_process from 'node:child_process'
// import adapter from '@sveltejs/adapter-auto'
// import adapter from '@sveltejs/adapter-static'
import adapter from '@sveltejs/adapter-cloudflare'
import {vitePreprocess} from '@sveltejs/vite-plugin-svelte'

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// https://svelte.dev/docs/kit/integrations
	preprocess: vitePreprocess(),

	kit: {
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
		adapter: adapter(),

		version: {
			name: child_process.execSync('git rev-parse HEAD').toString().trim()
		}
	}
}

export default config
