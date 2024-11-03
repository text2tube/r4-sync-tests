import {defineConfig} from 'drizzle-kit'

// We're not really using this because we only use pglite
export default defineConfig({
	dialect: 'postgresql',
	schema: './src/lib/db/schema.ts'
})
