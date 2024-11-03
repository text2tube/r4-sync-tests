<script>
	import {pg} from '$lib/db'

	let count = $state(0)

	pg.sql`select counter from app_state where id = 1`
		.then((data) => {
			if (data.rows?.length) count = data.rows[0].counter
			console.log('counter test initial state', data.rows[0])
		})
		.catch(console.warn)

	async function inc() {
		count = count + 1
		await pg.sql`update app_state set counter = ${count} where id = 1`
	}
</script>

<button onclick={inc}>R{count}</button>
