# batch editing

channels have thousands of tracks. descriptions are chaos. tags need cleanup.

malleable data interface. think emacs + git + spreadsheet.

select tracks by any criteria. chain operations naturally. preview before applying. multiple views of same data. escape hatches for power users.

## core loop

```
select → edit → draft → preview → apply
```

human-friendly language: "draft changes" not "staging". "preview" not "diff". "apply" not "commit". "discard" not "rollback".

route: `/{slug}/batch-edit`

## how it works

```sql
CREATE TABLE track_edits (
  track_id UUID REFERENCES tracks(id),
  field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

edits accumulate here. apply commits them all atomically.
single user, local pglite. simple.

## build it

1. table + virtual scrolling (use @humanspeak/svelte-virtual-list)
2. selection system (click, drag, filter)
3. inline editing → draft to track_edits
4. preview/apply/discard
5. tagcloud view
6. bulk tag operations
7. composable transforms

pglite is fast locally. use batcher.js for heavy lifting.

## api sketch

```js
export async function stageEdit(trackId, field, oldValue, newValue) {
  // upsert - replace existing edit for same track/field
  await pg.sql`
    INSERT INTO track_edits (track_id, field, old_value, new_value)
    VALUES (${trackId}, ${field}, ${oldValue}, ${newValue})
    ON CONFLICT (track_id, field) DO UPDATE SET
      new_value = EXCLUDED.new_value,
      created_at = CURRENT_TIMESTAMP
  `
}

export async function commitEdits() {
  const edits = await pg.sql`SELECT * FROM track_edits`
  
  await pg.transaction(async (tx) => {
    for (const edit of edits.rows) {
      await tx.sql`UPDATE tracks SET ${edit.field} = ${edit.new_value} WHERE id = ${edit.track_id}`
    }
    await tx.sql`DELETE FROM track_edits`
  })
}

export async function rollbackEdits() {
  await pg.sql`DELETE FROM track_edits`
}
```

## interaction ideas

drag to select ranges. click tag to filter. hover shows preview. right-click for context menu.

the tag problem: tagcloud reveals chaos like `#electronic #electronica #electro #Electronic`. bulk rename/merge to clean taxonomy. extract structured tags from freeform descriptions.

composable workflow:
```
select tracks containing "#electronic"
→ rename tag to "#electronica" 
→ preview affected tracks
→ apply changes
```

multiple views: spreadsheet for direct data editing, tagcloud for taxonomy management, timeline for temporal patterns. all backed by same staging system.

## questions

selection feedback: how to show selected tracks across different views?

undo granularity: per operation or entire chains?

mobile: spreadsheet doesn't work. focus on tag management?

validation: as you type vs at apply time?

escape hatches: power users have pglite-repl + dev console. good enough?

integration: how does this play with existing sync system?

entry point: button on channel page? separate navigation?

keyboard: spreadsheet users expect tab/enter/ctrl+c workflows.

testing: need real messy channels to validate tag extraction patterns.
