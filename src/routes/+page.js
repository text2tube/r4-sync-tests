export const ssr = false

/** @type {import('./$types').PageLoad} */
export async function load({url}) {
	return {
		display: url.searchParams.get('display')
	}
}
