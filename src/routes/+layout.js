// Disable server-side rendering for all routes by default. Otherwise we can't use pglite + indexeddb.
export const ssr = false

import {sdk} from '@radio4000/sdk'
import {browser} from '$app/environment'
import {pg} from '$lib/db'

// @ts-expect-error just for debugging
if (browser) window.r5 = {pg, sdk}
