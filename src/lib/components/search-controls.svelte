<script>
	import {goto} from '$app/navigation'
	import {page} from '$app/stores'
	
	let {search = '', order = 'created', onSearchChange, onOrderChange} = $props()
	
	let searchValue = $state(search)
	let orderValue = $state(order)
	let debounceTimer
	
	// Update internal state when props change
	$effect(() => {
		searchValue = search
		orderValue = order
	})
	
	function handleSearchInput(event) {
		searchValue = event.target.value
		clearTimeout(debounceTimer)
		debounceTimer = setTimeout(() => {
			updateURL()
		}, 300)
	}
	
	function handleOrderChange(event) {
		orderValue = event.target.value
		updateURL()
	}
	
	function updateURL() {
		const params = new URLSearchParams()
		if (searchValue) params.set('search', searchValue)
		if (orderValue !== 'created') params.set('order', orderValue)
		
		const queryString = params.toString()
		const newUrl = `${$page.url.pathname}${queryString ? `?${queryString}` : ''}`
		goto(newUrl, {replaceState: true})
	}
	
	function clearSearch() {
		searchValue = ''
		updateURL()
	}
</script>

<form>
	<input 
		type="search" 
		placeholder="Search tracks..." 
		value={searchValue}
		oninput={handleSearchInput}
	>
	{#if searchValue}
		<button type="button" onclick={clearSearch}>×</button>
	{/if}
	
	<label>
		Sort by:
		<select value={orderValue} onchange={handleOrderChange}>
			<option value="created">Newest first</option>
			<option value="created_asc">Oldest first</option>
			<option value="title">Title A-Z</option>
		</select>
	</label>
</form>

<style>
	form {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
		align-items: center;
		flex-wrap: wrap;
	}
	
	input[type="search"] {
		flex: 1;
		min-width: 200px;
		padding: 0.5rem;
	}
	
	button {
		background: none;
		border: none;
		font-size: 1.2rem;
		cursor: pointer;
	}
	
	label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	
	select {
		padding: 0.5rem;
	}
</style>