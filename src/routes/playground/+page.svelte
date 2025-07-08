<script>
	import {pg} from '$lib/db'

	let count = $state()
	const double = $derived(count * 2)

	$effect(async () => {
		const data = await pg.live.query(`select counter from app_state where id = 1`, [], (stuff) => {
			count = stuff.rows[0].counter
		})
	})

	function add() {
		return pg.sql`insert into channels (name, slug) values (${'huguooo'}, ${'hugo123'})`
	}
</script>

<button onclick={add}>increment {count}</button>
