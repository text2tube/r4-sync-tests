import {query as buildQuery} from '@electric-sql/pglite/template'
import {pg} from '$lib/db'

export function liveQuery(query: string, params: unknown[] = []) {
	const state = $state({})

	pg.live.query(query, params, (data) => {
		state.value = data.rows[0]
	})

	return {
		get value() {
			return state
		}
	}
}

// SQL template literal helper
liveQuery.sql = function (strings: TemplateStringsArray, ...values: unknown[]) {
	const {query, params} = buildQuery(strings, ...values)
	return liveQuery(query, params)
}

// Usage example:
/*
// In your Svelte component:
const count = liveQuery.sql`
  SELECT counter 
  FROM app_state 
  WHERE id = 1
`

function add() {
  return pg.sql`update app_state set counter = ${count + 1}`
}
*/
