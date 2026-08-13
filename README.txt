CLINICAL GOVERNANCE GAME ROOM — V1.2 CONNECTION HOTFIX

Changes:
- Realtime room topic is forced to lower-case.
- Broadcast config now matches the known-good diagnostics test (self: true).
- Exact Supabase subscription error is displayed under the connection status.
- Full subscription error is also written to the browser console.
- Existing v1.1 wheel and session mechanics retained.

Deploy all four web files again through GitHub/Render.

If the facilitator still says "Connection problem", copy the small yellow error message displayed immediately underneath it. That is now the actual Supabase error rather than a generic status.
