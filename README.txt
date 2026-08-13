CLINICAL GOVERNANCE GAME ROOM — V1

This is the first deployable multiplayer prototype.

FILES
- index.html
- styles.css
- app.js
- config.js

DEPLOY ON RENDER
1. Replace the files in your existing GitHub/Render test repo with these four files.
2. Commit and push.
3. Let Render redeploy the Static Site.
4. Open the Render URL in one browser and choose "I'm facilitating".
5. Create a room.
6. Open the same Render URL on another browser/device and choose "I'm participating".
7. Enter the room code and a display name or nickname.
8. Launch the question from the facilitator screen.
9. Drag the participant token onto a wheel segment.
10. The facilitator should see an anonymous dot. Lock answers to reveal initials, then reveal the answer.

PRIVACY / DATA
This prototype does not create a Supabase database table.
Live names, presence, game state and answers are transmitted through Supabase Realtime.
They are intended as ephemeral session state, not a permanent learner record.

IMPORTANT V1 LIMITATIONS
- The facilitator browser is the authority for the room. If it closes, the room is effectively lost.
- Room codes are convenience identifiers, not security credentials.
- Public Realtime channels are being used for this prototype.
- There is no facilitator authentication yet.
- A participant joining late requests current state from the host.
- This is a prototype, not yet an organisation-approved production service.
