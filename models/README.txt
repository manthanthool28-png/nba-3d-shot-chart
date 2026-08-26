Drop 3D models (.glb) in this folder and the app picks them up
automatically — no code changes needed.

ARENA ENVIRONMENT:
  models/arena.glb — loaded into the main 3D scene around the court.
  Auto-scaled to ~300 ft wide and centered on the full court. If the model
  sits misaligned, adjust the three constants at the top of
  src/scene/arena.js (ARENA_WIDTH_FT, ARENA_CENTER, ARENA_ROTATION_Y).

PLAYER FIGURES (shown in the player card, right side):

Lookup order (first match wins):
  1. models/<player_slug>.glb   e.g. luka_doncic.glb, anthony_edwards.glb
     (player name lowercased, diacritics stripped, spaces -> underscores)
  2. models/player.glb          generic fallback used for every player
  3. built-in procedural figure (team-colored, jersey number)

Notes:
- GLB (binary glTF) only. If a model ships as .gltf + textures, convert or
  re-export it as a single .glb.
- Rigged models with animations work: the first animation clip auto-plays.
- The model is auto-scaled and grounded, so any reasonable export size works.
- Only use models you have the rights to (purchased, CC-licensed with
  attribution, or downloadable on Sketchfab with a license).

