// @todo importing this breaks svelte because of ssr i dont get it,
// since it is disabled. It's something with the `pg` variable at the root.
// import {pg} from '$lib/db'

export const ssr = false

/** @type {import('./$types').PageLoad} */
export async function load({url}) {
	return {
		display: url.searchParams.get('display')
	}
}
