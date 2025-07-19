# R5

A prototype exploring the future of radio4000. Local-first music player with client-side PostgreSQL that syncs with radio4000.

The `main` branch deploys to https://pg.radio4000.com for now.

## Developing

```bash
bun install
bun run dev
```

## Credits

- https://pglite.dev/docs/api
- https://github.com/hellogreg/firava
- https://icons.obra.studio/
- [`sv`](https://github.com/sveltejs/cli) svelte cli

## Import from v1

1. Open the Firebase console, find the realtime database and export all channels to `/static/radio4000-channels-export.json`
2. Serialize the v1 channels into v2 schema using this `jq` command. It currently filters out channels with less than 10 tracks. This generates the data files like `static/r5-channels.json`.

```bash
jq 'to_entries | .[0:99999] | map({firebase_id: .key, created_at: .value.created, updated_at: .value.updated, slug: .value.slug, name: .value.title, description: .value.body, image: .value.image, track_count: (.value.tracks | if . then length else 0 end), track_ids: (.value.tracks | if . then (to_entries | map(.key)) else [] end) }) | map(select(.track_count > 10)) ' static/radio4000-channels-export.json > static/r5-channels.json
```
