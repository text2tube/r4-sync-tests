<script>
	import Client from './client.svelte'

	let {id} = $props()

	let clients = $state([{id: 0, deviceId: id}])
	let online = $state(true)

	// this.clients = [new Client(0, id)]

	function addClient() {
		clients.push({id: clients.length, deviceId: id})
	}
</script>

<div class="device {online ? '' : 'offline'}" id="device-{id}">
	<div>Device {id}</div>
	<menu>
		<button onclick={() => (online = !online)}>
			{online ? 'Go Offline' : 'Go Online'}
		</button>
		<button onclick={addClient}> Add Client </button>
	</menu>
	{#each clients as client}
		<Client {online} {client} />
	{/each}
</div>
