<script>
	import {pg} from '$lib/db'
	import {liveQuery} from '$lib/live-query.svelte'

	// const {value} = liveQuery(`select * from app_state`)
	const {state} = liveQuery(`select * from app_state`)

	$inspect(state)
	// const count = $derived(state?.counter || 0)

	function add() {
		// console.log(`incrementing ${count} to ${count + 1}`)
		// return pg.sql`update app_state set counter = ${count + 1}`
	}
</script>

<!-- <p>oskar: {value}</p> -->
<p>a: {state.counter}</p>
<p>b: {state?.value?.counter}</p>
<!-- <button onclick={add}>Increment {count}</button> -->

<pre>
	{JSON.stringify(state, null, 2)}
</pre>
