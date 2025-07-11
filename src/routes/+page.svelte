<script>
	import Channels from '$lib/components/channels.svelte'
	import {pg} from '$lib/db'
	import {totalSync} from '$lib/sync'

	let channelCount = $state(0)
	let syncing = $state(false)

	// Query channel count on load
	pg.query(`SELECT COUNT(*) as count FROM channels`).then((result) => {
		channelCount = result.rows[0]?.count || 0
	})

	async function pullRadios() {
		syncing = true
		try {
			await totalSync()
		} finally {
			syncing = false
		}
	}
</script>

{#if channelCount === 0}
	<p>
		<button onclick={pullRadios} disabled={syncing}>
			{syncing ? 'Pulling radios...' : 'Pull radios from radio4000.com'}
		</button>
	</p>
{/if}

<Channels />
