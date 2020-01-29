# stealth-fight-nodejs

Turn-wise online strategy game (currently for 2-6 players) with elements of bluff, hidden information and diplomacy

Built using NodeJS and Socket.io

Currently under development, all rights reserved

## Rules

Each player controls a number of men (right now set to 3-4). Each man occupies a unique (but initially unknown) position on a warped 2d grid. Objective of the game is to be the player with the last man standing.

Game proceeds turn-wise but in simultaneous fashion. In each turn, all players submit one move per man they control. All moves are executed simultaneously at the end of the turn.

### View system

Each man can only see a certain distance around him. Moreover, the identities of the other men he can see are not known, making it hard to identify who is friend and who is foe. Absolute positions of men on the game grid are also unknown, though the warped nature of the grid means that these positions aren't as important.

### Health system

Each man has a health bar and an energy bar. Energy is consumed in all moves (except "rest"), some more than others. Health is lost only when other men deal damage. Energy can be regained rapidly using "rest" moves, health can be regained but at a much slower rate. A man's health places an upper limit on how much energy he can store in his energy bar, making health a more precious resource. Health can be consumed in place of energy if a man's energy hits zero.

A man dies permanently when his health hits zero, and no longer occupies a position on the grid. A player is eliminated from the game when all his men are dead.

This system has been designed to feel more realistic as well as prevent players from fighting or avoiding fights endlessly

### Move and combat system

Each man gets one move per turn. Moves are currently of the following types, listed and executed in order of precedence

1. Dash - Energy intensive move to move one step in any of the 4 directions
2. Charge - Energy intensive move to move one step in any of the 4 directions and deal damage to man on that tile
3. Move - Move one step in any of the 4 directions, without consuming a lot of energy
4. Rest - To regain energy and a little health, but any damage dealt by other men is increased in this state

Collisions between men generally deal damage as well. You can deal damage to your own men as well (since identities of men are unknown).

Health and energy of immediately nearby men may be made visible in a future update.

### Tips

1. Try identifying the relative positions of your men relatively early on in the game. Keep track of moves your men make and look for them in other men's views.
2. Try to get your men close to each other as much as possible to avoid getting ganged up on.
3. Isolate and surround opponent men to eliminate them while losing minimal health yourself. Ganging up is more cost-effective than 1v1 fights.
4. Watch out for your energy bar. Balance moves with rest to ensure you don't end up in fights without energy.
5. Do not use health in place of energy unless absolutely necessary.
6. Ally with trustworthy players and form pacts to not fight each other's men. Share information and destroy common enemies, before finally turning on each other.
7. A lot of partial information is available throughout the game, don't ignore it just because you are unable to make complete deductions. Incomplete information may turn out useful later on.
8. Feel free to strategically lie and betray your allies, and get their men into situations they can't escape. This however can have an effect on your trustworthiness for the rest of the game (or future games, if you're playing with the same people).
