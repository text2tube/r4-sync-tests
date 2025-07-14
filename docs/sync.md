# Sync

## Data sources

- $lib/db -> Local Postgres db
- @radio4000/sdk -> Remote Postgres via Supabase
- /r5-channels.json -> v1 Firebase export (legacy channels)

## Different typesof channels

Besides the firebase_id field, they are the same.

- v2 channels: locally stored with firebase_id = NULL
- v1 channels: locally stored with firebase_id = original Firebase ID
- v1 channels only imported if NO v2 channel exists with same slug

## Sync flow

sync()
syncV2()
pullChannels()
syncV1()
pullV1Channels()

Tracks are not included the `sync()` method, but loaded on-demand when user interacts with the channel. Then we call: `pullTracks(slug)` or `pullV1Tracks(id, firebase_id)`

# Needs update?

the `needsUpdate(channelId)` checks whether channel could use a fresh sync of its tracks. It compares (any) local tracks with (any) remote tracks.

If you process more than one channel, use `batchNeedsUpdate(channelIds)`.
