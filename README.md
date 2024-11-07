## THIS IS JUST A TEST

A web app with a local PostgreSQL database that can more or less sync with R4 and Matrix remotes.

## Ideas

- use a worker when using the db https://pglite.dev/examples/opfs
- maintain a local log of changes in a format that we can later apply to R4 supabase and/or Matrix

## Developing

```bash
npm install
npm run dev
```

## Building

To create a production version of your app:

```bash
npm run build
npm run preview
```

## Credits

- https://pglite.dev/docs/api
- https://github.com/hellogreg/firava
- https://icons.obra.studio/
- [`sv`](https://github.com/sveltejs/cli) svelte cli

## Import from v1

1. Open the Firebase console, find the realtime database and export all channels to `/static/radio4000-channels-export.json`
2. Serialize the v1 channels into v2 schema using this `jq` command. It currently filters out channels with less than 10 tracks.

```bash
jq 'to_entries | .[0:99999] | map({firebase_id: .key, created_at: .value.created, updated_at: .value.updated, slug: .value.slug, name: .value.title, description: .value.body, image: .value.image, track_count: (.value.tracks | if . then length else 0 end), track_ids: (.value.tracks | if . then (to_entries | map(.key)) else [] end) }) | map(select(.track_count > 10)) ' static/radio4000-channels-export.json > static/r5-channels.json
```
