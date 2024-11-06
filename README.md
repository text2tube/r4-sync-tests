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

## Tips

```
jq '[.[] | select(.track_count > 9) | . + {tracks: .tracks | to_entries | map(.key)} ]' static/radio4000-channels-export-modified.json > static/r4-v1-channels.json
```
