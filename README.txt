CLINICAL GOVERNANCE GAME ROOM — V1.3

This version changes the Realtime architecture deliberately.

WHY
The standalone Supabase diagnostics page connects successfully, while the game-created channel was failing with a transport error.

WHAT V1.3 DOES
- Opens ONE global Supabase Broadcast channel immediately when the page loads.
- Uses the exact known-good diagnostics channel name.
- Does not use Presence at all.
- Does not create a new Supabase channel when a facilitator creates a room.
- Room codes are carried inside Broadcast payloads and messages are filtered client-side.
- Facilitator/Participant buttons remain disabled until the known-good Realtime channel reports SUBSCRIBED.
- Participant list is maintained by ephemeral hello/heartbeat Broadcast messages.
- No database table is used.

TEST
1. Deploy all files.
2. Open the home page.
3. Confirm the page changes from Connecting... to Connected BEFORE choosing Facilitator or Participant.
4. Create a room in one browser.
5. Join that room from another browser/device.
6. Participant should appear in Connected within a few seconds.
7. Launch a question and test token movement.

This is intentionally a prototype transport architecture. It proves the game mechanics without storing session data.
