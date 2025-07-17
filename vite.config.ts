import devtoolsJson from 'vite-plugin-devtools-json'
import {sveltekit} from '@sveltejs/kit/vite'
import {defineConfig} from 'vite'

export default defineConfig({
	plugins: [sveltekit(), devtoolsJson()],
	optimizeDeps: {
		// https://pglite.dev/docs/bundler-support#vite
		exclude: ['@electric-sql/pglite']
	},
	worker: {
		format: 'es'
	},
	build: {
		target: 'esnext'
	}
})
