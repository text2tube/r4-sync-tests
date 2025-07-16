<script>
	import { base } from '$app/paths';
	import { createEventDispatcher } from 'svelte';
	import L from 'leaflet';

	const {
		mapId = Date.now().toString(),
		markers = [],
		center = [0, 0],
		zoom,
		selectMode = false
	} = $props();

	const dispatch = createEventDispatcher();
	let map;
	let markerGroup;
	let newMarker;

	// Derive only the valid markers
	const validMarkers = $derived(markers.filter((m) => m.latitude && m.longitude && m.title));

	function getCssVar(name) {
		return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
	}

	function createIcon(color) {
		const svg =
			`<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\">` +
			`<circle cx=\"12\" cy=\"12\" r=\"10\" fill=\"${color}\" stroke=\"white\" stroke-width=\"2\"/>` +
			`</svg>`;
		return L.icon({
			iconUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
			iconSize: [24, 24],
			iconAnchor: [12, 12]
		});
	}

	function setup(node) {
		const fill = getCssVar('--c-fg');
		const fillNew = getCssVar('--c-link');

		map = L.map(node)

		map.on('moveend', handleChange);
		map.on('zoomend', handleChange);

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; OpenStreetMap contributors',
			className: 'Map-tiles'
		}).addTo(map);

		// Create an empty feature group container
		markerGroup = L.featureGroup().addTo(map);

		// Click-to-select marker logic
		if (selectMode) {
			map.on('click', (e) => {
				const { lat: latitude, lng: longitude } = e.latlng;
				dispatch('mapClick', { latitude, longitude });
				if (newMarker) map.removeLayer(newMarker);
				newMarker = L.marker([latitude, longitude], {
					icon: createIcon(fillNew),
					title: 'New Position'
				})
					.addTo(map)
					.bindPopup(`${latitude}, ${longitude}`)
					.openPopup();
			});
		}

		if (center) {
			map.setView(center, zoom);
		}

		return {
			destroy() {
				map.remove();
			}
		};
	}

	function handleChange() {
		const newCenter = map.getCenter();
		const newZoom = map.getZoom();
		dispatch('change', {
			latitude: newCenter.lat,
			longitude: newCenter.lng,
			zoom: newZoom
		});
	}

	// Redraw markers whenever validMarkers change
	$effect(() => {
		if (!map) return;

		markerGroup.clearLayers();

		const fill = getCssVar('--c-link');
		for (const {
			latitude,
			longitude,
			title,
			href
		} of validMarkers) {
			const popup = href ? `<a href="${base}/${href}">${title}</a>` : title;
			L.marker([latitude, longitude], { icon: createIcon(fill), title })
				.addTo(markerGroup)
				.bindPopup(popup);
		}

		if (validMarkers.length === 1) {
			const {latitude, longitude} = validMarkers[0];
			map.setView([latitude, longitude], 13);
		} else if (validMarkers.length > 1) {
			map.fitBounds(markerGroup.getBounds().pad(0.2));
		}
    });

    $effect(() => {
        if (map) {
            map.setZoom(zoom);
        }
    });

    // Expose method to clear the temporary new marker
    export function clearNewMarker() {
        if (newMarker) {
            map.removeLayer(newMarker);
            newMarker = null;
        }
    }
</script>

<div id={mapId} class="Map" use:setup></div>

<style>
	.Map {
		--map-tiles-filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3)
			brightness(0.7);
		width: 100%;
		height: 100%;
		z-index: 1;
		border: 1px solid var(--c-border);
		border-radius: var(--border-radius);
		:global(.leaflet-container) {
			background-color: transparent;
		}
		:global(.leaflet-popup-content a) {
			color: var(--c-link);
		}
		:global(.leaflet-popup-content) {
			color: var(--c-fg);
		}
		:global(.leaflet-popup-content-wrapper, .leaflet-popup-tip) {
			background: var(--c-bg);
		}
		:global(.leaflet-popup a.leaflet-popup-close-button) {
			color: var(--c-fg);
		}
		@media (prefers-color-scheme: dark) {
			:global(.Map-tiles) {
				filter: var(--map-tiles-filter, none);
			}
		}
	}
</style>
