We have a remote PostgreSQL database on Supabase. This is the source of truth.

We have a local PostgreSQL database in the browser via PGLite. We pull data from the remote into this.

Write are done remote. Most reads are local, with on-demand pulling (syncing) in many cases.
