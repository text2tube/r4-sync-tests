<script>
	import {pg} from '$lib/db'
	import {setupLiveQuery} from '$lib/live-query'

	let count = $state()
	const double = $derived(count * 2)

	$effect(() => {
		return setupLiveQuery(`select counter from app_state where id = 1`, [], (stuff) => {
			console.log('app state live query from /playground ran')
			count = stuff.rows[0].counter
		})
	})

	function add() {
		throw new Error('something bad happened')
		//return pg.sql`insert into channels (name, slug) values (${'huguooo'}, ${'hugo123'})`
	}
</script>

<button onclick={add}>throw an unexpected error</button>

<p>{count} x 2 = {double}</p>
