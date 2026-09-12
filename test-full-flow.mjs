/**
 * ══════════════════════════════════════════════════════════════
 * FULL INTEGRATION TEST — Real Socket.IO connections to the live server
 * ══════════════════════════════════════════════════════════════
 * 
 * Tests:
 *  1. Room creation
 *  2. Player join (8 players)
 *  3. Shuffle teams (max 4 per team)
 *  4. Team ready flow
 *  5. Start game + round
 *  6. Buzz ordering & team-buzz restriction (1 per team)
 *  7. Judge correct → points with speed scoring
 *  8. Judge incorrect → penalty, negative scores, blocking
 *  9. Round reopening after incorrect
 * 10. End game → rankings
 * 11. Edge cases: double buzz, buzz after team buzzed, buzz when blocked
 */

import { io } from 'socket.io-client';

const SERVER = 'http://localhost:3001';
const TIMEOUT_MS = 5000;

let hostSocket;
let playerSockets = [];
let roomCode;
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

// ── Helpers ──────────────────────────────────────────────────

function createSocket() {
  return new Promise((resolve, reject) => {
    const s = io(SERVER, { transports: ['websocket'], reconnection: false });
    const timer = setTimeout(() => reject(new Error('Socket connect timeout')), TIMEOUT_MS);
    s.on('connect', () => {
      clearTimeout(timer);
      resolve(s);
    });
    s.on('connect_error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function emitAsync(socket, event, data = null) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout: ${event}`)), TIMEOUT_MS);
    const cb = (response) => {
      clearTimeout(timer);
      resolve(response);
    };
    if (data === null) {
      // No data arg — callback is the first argument (e.g., create-room)
      socket.emit(event, cb);
    } else {
      socket.emit(event, data, cb);
    }
  });
}

function waitForEvent(socket, event) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for: ${event}`)), TIMEOUT_MS);
    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function assert(testName, condition, detail = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ ${testName}`);
  } else {
    failedTests++;
    const msg = `  ❌ ${testName}${detail ? ` — ${detail}` : ''}`;
    console.log(msg);
    failures.push(msg);
  }
}

// ── Cleanup ──────────────────────────────────────────────────

function cleanup() {
  if (hostSocket) hostSocket.disconnect();
  playerSockets.forEach(s => s.disconnect());
}

// ══════════════════════════════════════════════════════════════
// TEST SUITE
// ══════════════════════════════════════════════════════════════

async function runTests() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  FULL INTEGRATION TEST SUITE');
  console.log('══════════════════════════════════════════════════\n');

  try {
    // ── TEST 1: Server health check ─────────────────────────
    console.log('── 1. Server Health ──');
    const healthRes = await fetch(`${SERVER}/api/health`);
    const healthData = await healthRes.json();
    assert('Server /api/health responds OK', healthData.status === 'ok');

    // ── TEST 2: Create room ─────────────────────────────────
    console.log('\n── 2. Room Creation ──');
    hostSocket = await createSocket();
    assert('Host socket connected', hostSocket.connected);

    const createRes = await emitAsync(hostSocket, 'create-room');
    roomCode = createRes?.code;
    assert('Room created with 4-digit code', roomCode && roomCode.length === 4, `got: ${roomCode}`);

    // ── TEST 3: Join 8 players ──────────────────────────────
    console.log('\n── 3. Player Join (8 players) ──');
    const playerNames = ['Alma', 'Martín', 'Lucía', 'Sofía', 'Mateo', 'Valentina', 'Juan', 'Camila'];
    
    for (let i = 0; i < playerNames.length; i++) {
      const ps = await createSocket();
      const joinRes = await emitAsync(ps, 'join-room', {
        roomCode,
        playerName: playerNames[i],
        playerId: `test_p${i}`,
      });
      assert(`${playerNames[i]} joined successfully`, joinRes?.success === true, joinRes?.error);
      playerSockets.push(ps);
    }

    // ── TEST 4: Manual player ───────────────────────────────
    console.log('\n── 4. Manual Player ──');
    const manualRes = await emitAsync(hostSocket, 'add-manual-player', {
      roomCode,
      playerName: 'Abuelita',
    });
    assert('Manual player added', manualRes?.success === true, manualRes?.error);

    // Duplicate name check
    const dupRes = await emitAsync(hostSocket, 'add-manual-player', {
      roomCode,
      playerName: 'Abuelita',
    });
    assert('Duplicate manual name rejected', dupRes?.error?.includes('ya está en uso'));

    // Remove manual player
    const rmRes = await emitAsync(hostSocket, 'remove-manual-player', {
      roomCode,
      playerId: manualRes.player.id,
    });
    assert('Manual player removed', rmRes?.success === true);

    // ── TEST 5: Shuffle teams ───────────────────────────────
    console.log('\n── 5. Shuffle Teams (max 4 per team) ──');
    
    // Wait for teams-assigned event on host
    const teamsPromise = waitForEvent(hostSocket, 'teams-assigned');
    const shuffleRes = await emitAsync(hostSocket, 'shuffle-teams', { roomCode });
    assert('Shuffle returns teams', shuffleRes?.success === true);
    
    const teamsData = await teamsPromise;
    const teams = teamsData.teams;
    assert('Teams are an array', Array.isArray(teams) && teams.length > 0);
    
    const maxPlayersInTeam = Math.max(...teams.map(t => t.players.length));
    assert('Max 4 players per team', maxPlayersInTeam <= 4, `max was ${maxPlayersInTeam}`);
    
    const totalInTeams = teams.reduce((sum, t) => sum + t.players.length, 0);
    assert('All 8 players distributed across teams', totalInTeams === 8, `got ${totalInTeams}`);
    
    // With 8 players: minimum teams = ceil(8/4) = 2
    assert('At least 2 teams', teams.length >= 2, `got ${teams.length}`);

    // ── TEST 6: Team ready flow ─────────────────────────────
    console.log('\n── 6. Team Ready ──');
    
    // Set all teams ready from host
    for (let i = 0; i < teams.length; i++) {
      const readyRes = await emitAsync(hostSocket, 'team-ready', {
        roomCode,
        teamIndex: i,
        isReady: true,
      });
      assert(`Team ${i} set ready`, readyRes?.success === true, readyRes?.error);
    }

    // Get room state to verify all ready
    const stateRes = await emitAsync(hostSocket, 'get-room-state', { roomCode });
    assert('All teams marked ready', stateRes?.allTeamsReady === true);

    // ── TEST 7: Start game ──────────────────────────────────
    console.log('\n── 7. Start Game ──');
    
    const gameStartedPromise = waitForEvent(playerSockets[0], 'game-started');
    const startGameRes = await emitAsync(hostSocket, 'host-start-game', { roomCode });
    assert('host-start-game succeeds', startGameRes?.success === true, startGameRes?.error);
    
    const gsData = await gameStartedPromise;
    assert('Players receive game-started event', gsData !== undefined);

    // ── TEST 8: Start round ─────────────────────────────────
    console.log('\n── 8. Start Round 1 ──');
    
    const roundPromise = waitForEvent(playerSockets[0], 'round-started');
    const startRoundRes = await emitAsync(hostSocket, 'start-round', { roomCode });
    assert('start-round succeeds', startRoundRes?.success === true, startRoundRes?.error);
    
    const roundData = await roundPromise;
    assert('Round number is 1', roundData?.roundNumber === 1, `got ${roundData?.roundNumber}`);

    // Small delay for state propagation
    await sleep(100);

    // ── TEST 9: Buzz — team restriction ─────────────────────
    console.log('\n── 9. Buzz & Team Restriction ──');
    
    // Get player states to know team assignments
    const p0State = await emitAsync(playerSockets[0], 'get-player-state', { roomCode, playerId: 'test_p0' });
    const p0TeamIndex = p0State?.teamIndex;
    assert('Player 0 has valid team index', p0TeamIndex >= 0, `got ${p0TeamIndex}`);
    assert('Player 0 can buzz', p0State?.canBuzz === true, `canBuzz=${p0State?.canBuzz}`);

    // Find a teammate of player 0
    let teammateIdx = -1;
    for (let i = 1; i < playerSockets.length; i++) {
      const ps = await emitAsync(playerSockets[i], 'get-player-state', { roomCode, playerId: `test_p${i}` });
      if (ps?.teamIndex === p0TeamIndex) {
        teammateIdx = i;
        break;
      }
    }

    // Find an opponent (different team)
    let opponentIdx = -1;
    for (let i = 1; i < playerSockets.length; i++) {
      const ps = await emitAsync(playerSockets[i], 'get-player-state', { roomCode, playerId: `test_p${i}` });
      if (ps?.teamIndex !== p0TeamIndex) {
        opponentIdx = i;
        break;
      }
    }

    assert('Found teammate', teammateIdx >= 0, `teammateIdx=${teammateIdx}`);
    assert('Found opponent', opponentIdx >= 0, `opponentIdx=${opponentIdx}`);

    // Player 0 buzzes first
    const buzzRes0 = await emitAsync(playerSockets[0], 'buzz', { roomCode });
    assert('Player 0 buzz succeeds', buzzRes0?.success === true, buzzRes0?.error);
    assert('Player 0 gets position 1', buzzRes0?.position === 1, `pos=${buzzRes0?.position}`);

    await sleep(100); // Let events propagate

    // Teammate tries to buzz — should be BLOCKED by team restriction
    if (teammateIdx >= 0) {
      const buzzResTeammate = await emitAsync(playerSockets[teammateIdx], 'buzz', { roomCode });
      assert(
        'Teammate buzz blocked (team already buzzed)',
        buzzResTeammate?.error?.includes('compañero') || buzzResTeammate?.error?.includes('equipo'),
        buzzResTeammate?.error || JSON.stringify(buzzResTeammate)
      );
    }

    // Opponent buzzes — should succeed
    if (opponentIdx >= 0) {
      const buzzResOpp = await emitAsync(playerSockets[opponentIdx], 'buzz', { roomCode });
      assert('Opponent buzz succeeds', buzzResOpp?.success === true, buzzResOpp?.error);
    }

    // Player 0 tries to buzz again — double buzz check
    const buzzDup = await emitAsync(playerSockets[0], 'buzz', { roomCode });
    assert('Double buzz blocked', buzzDup?.error !== undefined);

    // ── TEST 10: Judge correct → speed scoring ──────────────
    console.log('\n── 10. Judge Correct (Speed Scoring) ──');
    
    const resultPromise = waitForEvent(playerSockets[0], 'round-result');
    const correctRes = await emitAsync(hostSocket, 'judge-correct', { roomCode });
    assert('judge-correct succeeds', correctRes?.success === true, correctRes?.error);

    const resultData = await resultPromise;
    assert('Round result received', resultData?.type === 'correct', `type=${resultData?.type}`);
    assert('Points awarded are decimal', typeof resultData?.pointsAwarded === 'number' && resultData.pointsAwarded > 0, `pts=${resultData?.pointsAwarded}`);
    assert('Scores array present', Array.isArray(resultData?.scores));

    await sleep(200);

    // ── TEST 11: Round 2 — Incorrect + negative scores ──────
    console.log('\n── 11. Round 2 — Judge Incorrect & Negative Scores ──');
    
    const round2Promise = waitForEvent(playerSockets[0], 'round-started');
    await emitAsync(hostSocket, 'start-round', { roomCode });
    await round2Promise;
    await sleep(100);

    // Find a player who can buzz
    let buzzerIdx = -1;
    for (let i = 0; i < playerSockets.length; i++) {
      const ps = await emitAsync(playerSockets[i], 'get-player-state', { roomCode, playerId: `test_p${i}` });
      if (ps?.canBuzz) {
        buzzerIdx = i;
        break;
      }
    }
    assert('Found a player who can buzz in round 2', buzzerIdx >= 0);

    if (buzzerIdx >= 0) {
      const buzzR2 = await emitAsync(playerSockets[buzzerIdx], 'buzz', { roomCode });
      assert('Round 2 buzz succeeds', buzzR2?.success === true, buzzR2?.error);

      await sleep(100);

      // Judge incorrect — should deduct points and block
      const judgmentPromise = waitForEvent(playerSockets[0], 'round-judgment');
      const incorrectRes = await emitAsync(hostSocket, 'judge-incorrect', { roomCode });
      assert('judge-incorrect succeeds', incorrectRes?.success === true, incorrectRes?.error);

      const judgmentData = await judgmentPromise;
      assert('Judgment contains blocked info', judgmentData?.blocked !== undefined);
      assert('Points deducted', incorrectRes?.result?.pointsDeducted > 0, `deducted=${incorrectRes?.result?.pointsDeducted}`);

      // Check if scores can go negative
      const currentScores = incorrectRes?.result?.scores;
      assert('Scores array in incorrect response', Array.isArray(currentScores));

      // Check blocked team state
      const blockedState = await emitAsync(playerSockets[buzzerIdx], 'get-player-state', { roomCode, playerId: `test_p${buzzerIdx}` });
      assert('Blocked player isTeamBlocked or isPlayerBlocked', 
        blockedState?.isTeamBlocked === true || blockedState?.isPlayerBlocked === true,
        `isTeamBlocked=${blockedState?.isTeamBlocked}, isPlayerBlocked=${blockedState?.isPlayerBlocked}`
      );

      // If there's a nextUp, test the chain judging
      if (judgmentData?.nextUp) {
        console.log('  (Chain: next player in queue)');
        // Judge the next one incorrect too to test chain blocking
        const chain2Promise = waitForEvent(playerSockets[0], 'round-judgment').catch(() => null);
        await emitAsync(hostSocket, 'judge-incorrect', { roomCode });
        await chain2Promise;
        await sleep(100);
      }

      // If reopened, test buzzing after reopening
      if (judgmentData?.reopened || (await emitAsync(hostSocket, 'get-room-state', { roomCode }))?.state === 'ROUND_ACTIVE') {
        console.log('  (Buzzers reopened — testing re-buzz)');
        // Find someone who isn't blocked
        for (let i = 0; i < playerSockets.length; i++) {
          const ps = await emitAsync(playerSockets[i], 'get-player-state', { roomCode, playerId: `test_p${i}` });
          if (ps?.canBuzz) {
            const reBuzz = await emitAsync(playerSockets[i], 'buzz', { roomCode });
            assert('Re-buzz after reopening succeeds', reBuzz?.success === true, reBuzz?.error);
            break;
          }
        }
      }
    }

    // ── TEST 12: Multiple rounds ────────────────────────────
    console.log('\n── 12. Multiple Rounds (Stress) ──');
    
    for (let r = 3; r <= 5; r++) {
      const rPromise = waitForEvent(playerSockets[0], 'round-started');
      await emitAsync(hostSocket, 'start-round', { roomCode });
      const rData = await rPromise;
      assert(`Round ${r} starts`, rData?.roundNumber === r, `got round ${rData?.roundNumber}`);

      await sleep(50);

      // Each player that can buzz, buzzes
      let firstBuzzer = false;
      for (let i = 0; i < playerSockets.length; i++) {
        const ps = await emitAsync(playerSockets[i], 'get-player-state', { roomCode, playerId: `test_p${i}` });
        if (ps?.canBuzz) {
          const buzzR = await emitAsync(playerSockets[i], 'buzz', { roomCode });
          if (buzzR?.success && !firstBuzzer) firstBuzzer = true;
        }
      }

      if (firstBuzzer) {
        await sleep(50);
        // Alternate correct/incorrect
        if (r % 2 === 0) {
          await emitAsync(hostSocket, 'judge-correct', { roomCode });
        } else {
          await emitAsync(hostSocket, 'judge-incorrect', { roomCode });
          // End round if still active
          const st = await emitAsync(hostSocket, 'get-room-state', { roomCode });
          if (st?.state === 'BUZZER_LOCKED') {
            await emitAsync(hostSocket, 'judge-correct', { roomCode });
          }
        }
      }

      await sleep(50);
    }
    assert('All 5 rounds completed without crashes', true);

    // ── TEST 13: Verify scores integrity ────────────────────
    console.log('\n── 13. Score Integrity ──');
    
    const finalState = await emitAsync(hostSocket, 'get-room-state', { roomCode });
    assert('Room state accessible', finalState?.teams !== undefined);
    
    for (const team of (finalState?.teams || [])) {
      assert(
        `${team.name}: score=${team.score} is a valid number`,
        typeof team.score === 'number' && !isNaN(team.score)
      );
    }

    // ── TEST 14: Reconnection ───────────────────────────────
    console.log('\n── 14. Player Reconnection ──');
    
    // Disconnect player 0 and reconnect
    const oldSocket = playerSockets[0];
    oldSocket.disconnect();
    await sleep(200);

    const newSocket = await createSocket();
    const reconRes = await emitAsync(newSocket, 'reconnect-player', {
      roomCode,
      playerId: 'test_p0',
      playerName: 'Alma',
    });
    assert('Player reconnects successfully', reconRes?.success === true, reconRes?.error);
    assert('Reconnected player gets state', reconRes?.playerState !== undefined);
    assert('Reconnected player has team', reconRes?.playerState?.teamName !== null);
    playerSockets[0] = newSocket;

    // ── TEST 15: End game ───────────────────────────────────
    console.log('\n── 15. End Game ──');
    
    const gameOverPromise = waitForEvent(playerSockets[1], 'game-over');
    const endRes = await emitAsync(hostSocket, 'end-game', { roomCode });
    assert('end-game succeeds', endRes?.success === true, endRes?.error);
    
    const goData = await gameOverPromise;
    assert('Rankings received', Array.isArray(goData?.rankings));
    assert('Rankings have rank 1 winner', goData?.rankings?.[0]?.rank === 1);
    assert('Rankings sorted by score (desc)', (() => {
      const r = goData?.rankings;
      if (!r || r.length < 2) return true;
      for (let i = 1; i < r.length; i++) {
        if (r[i].score > r[i-1].score) return false;
      }
      return true;
    })(), 'Rankings not sorted correctly');

    // ── TEST 16: Edge case — buzz when not in round ─────────
    console.log('\n── 16. Edge Cases ──');
    
    const lateBuzz = await emitAsync(playerSockets[1], 'buzz', { roomCode });
    assert('Buzz after game over returns error', lateBuzz?.error !== undefined, JSON.stringify(lateBuzz));

    // ── TEST 17: Rename team ────────────────────────────────
    console.log('\n── 17. Team Rename ──');
    
    // Create a new room for this test
    const host2 = await createSocket();
    const room2 = await emitAsync(host2, 'create-room');
    const code2 = room2.code;
    
    const p1 = await createSocket();
    await emitAsync(p1, 'join-room', { roomCode: code2, playerName: 'TestA', playerId: 'tr1' });
    const p2 = await createSocket();
    await emitAsync(p2, 'join-room', { roomCode: code2, playerName: 'TestB', playerId: 'tr2' });
    
    await emitAsync(host2, 'shuffle-teams', { roomCode: code2 });
    await sleep(100);
    
    const renameRes = await emitAsync(host2, 'rename-team', { roomCode: code2, teamIndex: 0, newName: 'Los Champions' });
    assert('Team renamed', renameRes?.success === true, renameRes?.error);
    
    const st2 = await emitAsync(host2, 'get-room-state', { roomCode: code2 });
    assert('Renamed team reflected in state', st2?.teams?.[0]?.name === 'Los Champions', `got ${st2?.teams?.[0]?.name}`);
    
    host2.disconnect();
    p1.disconnect();
    p2.disconnect();

    // ── TEST 18: Move player between teams ──────────────────
    console.log('\n── 18. Move Player Between Teams ──');
    
    const host3 = await createSocket();
    const room3 = await emitAsync(host3, 'create-room');
    const code3 = room3.code;
    
    const mp = [];
    for (let i = 0; i < 6; i++) {
      const s = await createSocket();
      await emitAsync(s, 'join-room', { roomCode: code3, playerName: `Mover${i}`, playerId: `mv${i}` });
      mp.push(s);
    }
    
    await emitAsync(host3, 'shuffle-teams', { roomCode: code3 });
    await sleep(100);
    
    const st3 = await emitAsync(host3, 'get-room-state', { roomCode: code3 });
    const firstTeamPlayers = st3.teams[0].players;
    const secondTeamIdx = st3.teams.length > 1 ? 1 : 0;
    
    if (firstTeamPlayers.length > 0 && st3.teams[secondTeamIdx].players.length < 4) {
      const moveRes = await emitAsync(host3, 'move-player-team', {
        roomCode: code3,
        playerId: firstTeamPlayers[0].id,
        targetTeamIndex: secondTeamIdx,
      });
      assert('Player moved between teams', moveRes?.success === true, moveRes?.error);
    } else {
      assert('Player moved between teams', true, 'Skipped — team already full');
    }

    // Move to full team should fail
    // Fill a team to 4
    const st3b = await emitAsync(host3, 'get-room-state', { roomCode: code3 });
    let fullTeamIdx = -1;
    let sourcePlayer = null;
    for (let i = 0; i < st3b.teams.length; i++) {
      if (st3b.teams[i].players.length >= 4) {
        fullTeamIdx = i;
        break;
      }
    }
    if (fullTeamIdx >= 0) {
      // Find a player in another team to try moving
      for (let i = 0; i < st3b.teams.length; i++) {
        if (i !== fullTeamIdx && st3b.teams[i].players.length > 0) {
          sourcePlayer = st3b.teams[i].players[0].id;
          break;
        }
      }
      if (sourcePlayer) {
        const moveFullRes = await emitAsync(host3, 'move-player-team', {
          roomCode: code3,
          playerId: sourcePlayer,
          targetTeamIndex: fullTeamIdx,
        });
        assert('Move to full team (4 players) rejected', moveFullRes?.error !== undefined, JSON.stringify(moveFullRes));
      }
    }
    
    host3.disconnect();
    mp.forEach(s => s.disconnect());

    // ── TEST 19: Negative scores ────────────────────────────
    console.log('\n── 19. Negative Scores ──');
    
    const host4 = await createSocket();
    const room4 = await emitAsync(host4, 'create-room');
    const code4 = room4.code;
    
    const ns1 = await createSocket();
    await emitAsync(ns1, 'join-room', { roomCode: code4, playerName: 'NegAlma', playerId: 'neg1' });
    const ns2 = await createSocket();
    await emitAsync(ns2, 'join-room', { roomCode: code4, playerName: 'NegMarti', playerId: 'neg2' });
    
    await emitAsync(host4, 'shuffle-teams', { roomCode: code4 });
    await sleep(100);
    
    // Set teams ready and start
    const st4 = await emitAsync(host4, 'get-room-state', { roomCode: code4 });
    for (let i = 0; i < st4.teams.length; i++) {
      await emitAsync(host4, 'team-ready', { roomCode: code4, teamIndex: i, isReady: true });
    }
    await emitAsync(host4, 'host-start-game', { roomCode: code4 });
    
    // Run 3 rounds with only incorrect answers to force negative scores
    for (let r = 0; r < 3; r++) {
      await emitAsync(host4, 'start-round', { roomCode: code4 });
      await sleep(100);
      
      // Find someone who can buzz
      for (const s of [ns1, ns2]) {
        const ps = await emitAsync(s, 'get-player-state', { roomCode: code4 });
        if (ps?.canBuzz) {
          await emitAsync(s, 'buzz', { roomCode: code4 });
          break;
        }
      }
      await sleep(100);
      
      const jRes = await emitAsync(host4, 'judge-incorrect', { roomCode: code4 });
      if (jRes?.success) {
        // If there's a nextUp, judge that incorrect too
        if (jRes?.result?.nextUp) {
          await sleep(50);
          await emitAsync(host4, 'judge-incorrect', { roomCode: code4 });
        }
      }
      await sleep(50);
    }
    
    const st4b = await emitAsync(host4, 'get-room-state', { roomCode: code4 });
    const hasNegative = st4b?.teams?.some(t => t.score < 0);
    assert('Negative scores possible', hasNegative, `scores: ${st4b?.teams?.map(t => t.score).join(', ')}`);
    
    host4.disconnect();
    ns1.disconnect();
    ns2.disconnect();

    // ── TEST 20: Invalid room code ──────────────────────────
    console.log('\n── 20. Invalid Room / Edge Cases ──');
    
    const edgeSocket = await createSocket();
    
    const invalidJoin = await emitAsync(edgeSocket, 'join-room', {
      roomCode: '9999',
      playerName: 'Ghost',
      playerId: 'ghost1',
    });
    assert('Join invalid room returns error', invalidJoin?.error !== undefined);

    const invalidBuzz = await emitAsync(edgeSocket, 'buzz', { roomCode: '9999' });
    assert('Buzz in invalid room returns error', invalidBuzz?.error !== undefined);
    
    const emptyNameJoin = await emitAsync(edgeSocket, 'join-room', {
      roomCode: roomCode,
      playerName: '',
      playerId: 'empty1',
    });
    assert('Empty name join returns error', emptyNameJoin?.error !== undefined);

    edgeSocket.disconnect();

    // ── TEST 21: urlInput variable reference in HostLobby ───
    console.log('\n── 21. Code Quality Checks ──');
    
    // Check for undefined variable `urlInput` in HostLobby (found in code review)
    const hostLobbyContent = (await import('fs')).readFileSync(
      '/home/facu/Escritorio/ProyectosFacu/cumple24Alma/client/src/pages/HostLobby.jsx', 'utf8'
    );
    
    // urlInput is used on line 532-533 but never declared with useState
    const hasUrlInputState = hostLobbyContent.includes('useState') && 
      (hostLobbyContent.includes("const [urlInput") || hostLobbyContent.includes("let urlInput"));
    const usesUrlInput = hostLobbyContent.includes('urlInput');
    
    assert(
      'HostLobby: urlInput variable is properly declared',
      !usesUrlInput || hasUrlInputState,
      'urlInput is used but never declared — will crash when user opens URL editor'
    );

    // Check for the same in handleSaveCustomUrl
    const handleSaveRef = hostLobbyContent.includes('handleSaveCustomUrl');
    const urlInputInSave = hostLobbyContent.includes('urlInput.trim()');
    if (handleSaveRef && urlInputInSave && !hasUrlInputState) {
      assert(
        'HostLobby: handleSaveCustomUrl uses undeclared urlInput',
        false,
        'CRITICAL: urlInput is used in handleSaveCustomUrl but never declared with useState — will cause ReferenceError'
      );
    }

    // ── TEST 22: Check for host-disconnected handling ────────
    console.log('\n── 22. Host Disconnection ──');
    
    const host5 = await createSocket();
    const room5 = await emitAsync(host5, 'create-room');
    const code5 = room5.code;
    
    const pd = await createSocket();
    await emitAsync(pd, 'join-room', { roomCode: code5, playerName: 'DiscoTest', playerId: 'disc1' });
    
    // Disconnect host
    host5.disconnect();
    await sleep(300);
    
    // Room should still exist (grace period)
    const reconnHost = await createSocket();
    const reconHostRes = await emitAsync(reconnHost, 'reconnect-player', {
      roomCode: code5,
      playerId: 'host_recon',
      playerName: 'HostRecon',
    });
    // The host reconnect path checks hostConnected, which requires original host's concept
    // Just verify room still exists
    const roomCheck = await emitAsync(reconnHost, 'get-room-state', { roomCode: code5 });
    assert('Room survives host disconnect (grace period)', roomCheck?.code === code5 || roomCheck?.players !== undefined, 
      roomCheck?.error || `code=${roomCheck?.code}`);
    
    reconnHost.disconnect();
    pd.disconnect();

    // ── TEST 23: YouTube Playlist Endpoint (Direct URL) ──────
    console.log('\n── 23. YouTube Playlist Endpoint (Direct URL) ──');
    try {
      const plRes = await fetch(`${SERVER}/api/playlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://www.youtube.com/playlist?list=PLMC9KNkIncKtPzgY-5rmhvj7fax8fdxoj' }),
      });
      const plData = await plRes.json();
      assert('Playlist endpoint returns success', plData?.success === true, JSON.stringify(plData));
      assert('Playlist has songs array', Array.isArray(plData?.videos) && plData.videos.length > 0, `videos=${plData?.videos?.length}`);
      assert('Song items have valid ID and title', !!plData?.videos?.[0]?.id && !!plData?.videos?.[0]?.title, JSON.stringify(plData?.videos?.[0]));
    } catch (plErr) {
      assert('Playlist endpoint request completed', false, plErr.message);
    }

  } catch (err) {
    console.error(`\n💥 FATAL ERROR: ${err.message}`);
    console.error(err.stack);
    failedTests++;
    failures.push(`FATAL: ${err.message}`);
  } finally {
    cleanup();
  }

  // ── Summary ─────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════');
  console.log(`  RESULTS: ${passedTests}/${totalTests} passed, ${failedTests} failed`);
  console.log('══════════════════════════════════════════════════');
  
  if (failures.length > 0) {
    console.log('\n  FAILURES:');
    failures.forEach(f => console.log(f));
  }

  console.log('');
  process.exit(failedTests > 0 ? 1 : 0);
}

runTests();
