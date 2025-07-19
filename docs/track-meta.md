In order to source meta data from external providers and make it reusable,
we've created a `create_track_meta` table migration.

it's basically {ytid, musicbrainz_data, youtube_data}.

To pull this info we have @lib/sync/{musicbrainz,youtube}.js.

- pull data
- upsert local track_meta table

To include the info and make queries easier inside the app,
there's a new `tracks_with_meta` PostgreSQL view which joins the tracks
on both channel and track_meta so it's all available on one.

Now, it's important to note that all this is stored locally. Ideally
we want to push via @radio4000/sdk. but who can update track_meta, if we have remotely? do we want to? Right now any user pulling this data doesn't benefit anyone else.
