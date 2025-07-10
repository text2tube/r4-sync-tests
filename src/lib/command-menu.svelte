<script>

	/*
	 We want the github command menu. a search input that by default seaches  titles and descriptions from channels AND tracks
	 results are grouped by type, channels first. limit to 10 for each.


		 handle @mentions to channels
		 handle #hashtags to track descriptions
		 if there is a mention to a channel, limit tracks to that channel
	 */
	

	function search() {

	}

</script>

<form onsubmit={search}>
<input type="search">
<button type="submit">Search</button>
</form>

