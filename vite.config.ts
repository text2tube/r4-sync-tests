import {sveltekit} from '@sveltejs/kit/vite'
import {defineConfig} from 'vite'

export default defineConfig({
	plugins: [sveltekit()],

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

// import PGWorker from './worker.js?worker'

// export const pglite = new PGliteWorker(
//   new PGWorker({
//     type: 'module',
//       name: 'pglite-worker',
//     }),
//     {
//       // ...your options here
//     }
//   },
// )
