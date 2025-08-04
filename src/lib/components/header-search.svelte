<script>
	import {goto} from '$app/navigation'
	import {onMount} from 'svelte'
	import {pg} from '$lib/db'
	import {toggleTheme, toggleQueuePanel} from '$lib/api'
	import SearchInput from '$lib/components/search-input.svelte'

	let searchQuery = $state('')
	let debounceTimer = $state()
	let allChannels = $state([])

	// Sync search input with URL  
	$effect(() => {
		const urlSearch = page.url.searchParams.get('search')
		if (urlSearch !== null && urlSearch !== searchQuery) {
			searchQuery = urlSearch
		} else if (urlSearch === null && searchQuery && page.url.pathname === '/search') {
			searchQuery = ''
		}
	})

	// Filtered channels for @mention autocomplete
	let filteredChannels = $derived.by(() => {
		if (!searchQuery.includes('@')) return allChannels.slice(0, 5)
		const mentionQuery = searchQuery.slice(searchQuery.lastIndexOf('@') + 1)
		if (mentionQuery.length < 1) return allChannels.slice(0, 5)
		return allChannels
			.filter(
				(c) =>
					c.slug.includes(mentionQuery.toLowerCase()) ||
					c.name.toLowerCase().includes(mentionQuery.toLowerCase())
			)
			.slice(0, 5)
	})

	const commands = $derived.by(() => {
		return [
			{id: 'settings', title: 'Go to Settings', type: 'link', target: '/settings'},
			{id: 'toggle-theme', title: 'Toggle theme', type: 'command', action: toggleTheme},
			{id: 'toggle-queue', title: 'Toggle queue panel', type: 'command', action: toggleQueuePanel}
		]
	})

	onMount(() => {
		queryChannels()
	})

	async function queryChannels() {
		try {
			const result = await pg.query('SELECT id, name, slug FROM channels ORDER BY name')
			allChannels = result.rows
		} catch (error) {
			console.error('Failed to load channels:', error)
		}
	}

	function debouncedSearch() {
		clearTimeout(debounceTimer)
		debounceTimer = setTimeout(() => {
			if (searchQuery.trim()) {
				const params = new URLSearchParams({search: searchQuery.trim()})
				goto(`/search?${params}`)
			}
		}, 300)
	}

	function handleSubmit(event) {
		event.preventDefault()
		if (searchQuery.trim()) {
			const params = new URLSearchParams({search: searchQuery.trim()})
			goto(`/search?${params}`)
		}
	}

	function handleKeydown(event) {
		if (event.key === 'Escape' && !searchQuery.trim()) {
			goto('/')
		}
	}
</script>

<form onsubmit={handleSubmit}>
	<SearchInput
		bind:value={searchQuery}
		placeholder="Search or jump to…"
		oninput={debouncedSearch}
		onkeydown={handleKeydown}
		list="command-suggestions"
	/>
	<datalist id="command-suggestions">
		{#each commands as command (command.id)}
			<option value="/{command.id}">/{command.title}</option>
		{/each}
		{#each filteredChannels as channel (channel.id)}
			<option value="@{channel.slug}">@{channel.slug} - {channel.name}</option>
		{/each}
	</datalist>
</form>
