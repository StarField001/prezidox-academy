/**
 * Prezidox Academy — WebSocket (Socket.io) Setup
 * Handles real-time Battle Mode events.
 */

const { Server } = require('socket.io');
const prisma = require('./prisma');

let io = null;

// Track which socket belongs to which user in a given battle room.
// Map: battleId -> { userId -> socketId }
const battleRooms = new Map();

/**
 * Attach Socket.io to the HTTP server.
 * Call this once from app.js / server entry point.
 *
 * @param {http.Server} server
 */
function initWebSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    // ── battle:join ────────────────────────────────────────────────────────
    // Client sends: { battleId, userId }
    socket.on('battle:join', async ({ battleId, userId }) => {
      try {
        if (!battleId || !userId) return;

        // Join the Socket.io room for this battle
        socket.join(battleId);

        // Track user -> socket mapping
        if (!battleRooms.has(battleId)) {
          battleRooms.set(battleId, new Map());
        }
        battleRooms.get(battleId).set(userId, socket.id);

        // Store on socket for use in other handlers
        socket.data.battleId = battleId;
        socket.data.userId   = userId;

        console.log(`[WS] User ${userId} joined battle room ${battleId}`);

        // Notify everyone in the room that a player joined
        socket.to(battleId).emit('battle:player_joined', { userId });
      } catch (err) {
        console.error('[WS] battle:join error:', err);
        socket.emit('battle:error', { message: 'Failed to join battle room.' });
      }
    });

    // ── battle:answer ──────────────────────────────────────────────────────
    // Client sends: { battleId, questionIndex, questionId, answer, isCorrect, timeTaken }
    socket.on('battle:answer', async ({ battleId, questionIndex, questionId, answer, isCorrect, timeTaken }) => {
      try {
        const userId = socket.data.userId;
        if (!userId || !battleId) return;

        // Persist to BattleAnswer table
        await prisma.battleAnswer.create({
          data: {
            battleId,
            userId,
            questionId: questionId || `q_${questionIndex}`,
            answer,
            isCorrect:  !!isCorrect,
            timeTaken:  timeTaken || 0,
          },
        });

        // Notify the OTHER player in the room (not the sender)
        socket.to(battleId).emit('battle:opponent_answered', {
          questionIndex,
          timeTaken,
        });
      } catch (err) {
        console.error('[WS] battle:answer error:', err);
        socket.emit('battle:error', { message: 'Failed to save answer.' });
      }
    });

    // ── battle:finished ────────────────────────────────────────────────────
    // Client sends: { battleId, finalScore }
    // finalScore = number of correct answers
    socket.on('battle:finished', async ({ battleId, finalScore }) => {
      try {
        const userId = socket.data.userId;
        if (!userId || !battleId) return;

        // Notify the other player that this player finished
        socket.to(battleId).emit('battle:opponent_finished', {
          userId,
          finalScore,
        });

        // Fetch the battle to determine roles
        const battle = await prisma.battle.findUnique({ where: { id: battleId } });
        if (!battle) return;

        const isChallenger = battle.challengerId === userId;
        const isOpponent   = battle.opponentId   === userId;

        // Save this player's score
        const updateData = {};
        if (isChallenger) updateData.challengerScore = finalScore;
        if (isOpponent)   updateData.opponentScore   = finalScore;

        const updatedBattle = await prisma.battle.update({
          where: { id: battleId },
          data:  updateData,
        });

        // Check if both players have finished
        const challengerDone = updatedBattle.challengerScore !== null && updatedBattle.challengerScore !== undefined;
        const opponentDone   = updatedBattle.opponentScore   !== null && updatedBattle.opponentScore   !== undefined;

        if (challengerDone && opponentDone) {
          // Determine winner
          let winnerId = null;
          const cScore = updatedBattle.challengerScore;
          const oScore = updatedBattle.opponentScore;

          if (cScore > oScore) {
            winnerId = updatedBattle.challengerId;
          } else if (oScore > cScore) {
            winnerId = updatedBattle.opponentId;
          }
          // Draw: winnerId stays null

          const finishedBattle = await prisma.battle.update({
            where: { id: battleId },
            data: {
              winnerId,
              status:      'completed',
              completedAt: new Date(),
            },
          });

          // Emit result to everyone in the room
          io.to(battleId).emit('battle:result', {
            battleId,
            challengerId:    finishedBattle.challengerId,
            opponentId:      finishedBattle.opponentId,
            challengerScore: finishedBattle.challengerScore,
            opponentScore:   finishedBattle.opponentScore,
            winnerId:        finishedBattle.winnerId,
            isDraw:          winnerId === null,
          });

          console.log(`[WS] Battle ${battleId} completed. Winner: ${winnerId || 'draw'}`);

          // Clean up room tracking
          battleRooms.delete(battleId);
        }
      } catch (err) {
        console.error('[WS] battle:finished error:', err);
        socket.emit('battle:error', { message: 'Failed to process battle result.' });
      }
    });

    // ── disconnect ─────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const { battleId, userId } = socket.data;
      console.log(`[WS] Client disconnected: ${socket.id}`);

      if (battleId && userId) {
        const room = battleRooms.get(battleId);
        if (room) {
          room.delete(userId);
          if (room.size === 0) {
            battleRooms.delete(battleId);
          }
        }

        // Notify remaining players that opponent disconnected
        socket.to(battleId).emit('battle:opponent_disconnected', { userId });
      }
    });
  });

  console.log('[WS] Socket.io initialized.');
  return io;
}

/**
 * Get the Socket.io instance (after initWebSocket has been called).
 * @returns {Server|null}
 */
function getIO() {
  if (!io) {
    throw new Error('[WS] Socket.io has not been initialized. Call initWebSocket(server) first.');
  }
  return io;
}

module.exports = { initWebSocket, getIO };
