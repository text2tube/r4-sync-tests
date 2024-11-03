<script>
	let {id = '', alt = '', size = 250} = $props()

	/**
	 * @param {string} id - from cloudinary image
	 * @param {string} format -
	 */
	export function createImage(id, format = 'webp') {
		const baseUrl = 'https://res.cloudinary.com/radio4000/image/upload'
		const dimensions = `w_${size},h_${size}`
		const crop = 'c_thumb,q_60'
		return `${baseUrl}/${dimensions},${crop},fl_awebp/${id}.${format}`
	}
</script>

{#if id}
	<img src={createImage(id)} {alt} />
{/if}

<style>
	img {
		display: block;
		border-radius: var(--border-radius);
	}
</style>
