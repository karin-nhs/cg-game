CLINICAL GOVERNANCE GAME ROOM — V1.1

What changed from v1:
- Fixed the wheel geometry: it now uses a true circular conic-gradient wheel rather than distorted CSS triangles.
- Added a broadcast "hello"/heartbeat fallback alongside Supabase Presence.
- Participants should now appear in the facilitator's Connected list even if Presence sync is delayed.
- Facilitator removes a participant after ~16 seconds without a heartbeat.
- Added visible connection status to both facilitator and participant views.
- Participant movement can be cleared by dropping the token back in the centre/outside the wheel.

DEPLOY
Replace index.html, styles.css, app.js and config.js in your GitHub repo with these files, commit/push, and let Render redeploy.

TEST
1. Facilitator creates a room.
2. Participant joins with the same 5-character room code.
3. Within a few seconds, participant name should appear under Connected.
4. Launch question.
5. Participant drags ME token onto a segment.
6. Facilitator sees anonymous dot and positioned count.
7. Lock answers -> initials/name become available.
8. Reveal -> correct segment is highlighted.

No database table is created. Live state remains Realtime-only.
