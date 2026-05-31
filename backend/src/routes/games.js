const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// Get all games
router.get('/', async (req, res) => {
  try {
    const { limit = 20, offset = 0, groupId } = req.query;
    const where = { userId: req.userId };
    if (groupId) where.groupId = groupId;

    const games = await prisma.game.findMany({
      where,
      include: {
        players: { include: { player: true } },
        rounds: { orderBy: { roundNum: 'asc' } }
      },
      orderBy: { date: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });
    res.json(games);
  } catch (err) {
    res.status(500).json({ error: 'Spiele konnten nicht geladen werden' });
  }
});

// Get single game
router.get('/:id', async (req, res) => {
  try {
    const game = await prisma.game.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        players: { include: { player: true } },
        rounds: { orderBy: { roundNum: 'asc' } }
      }
    });
    if (!game) return res.status(404).json({ error: 'Spiel nicht gefunden' });
    res.json(game);
  } catch (err) {
    res.status(500).json({ error: 'Spiel konnte nicht geladen werden' });
  }
});

// Create game (MVP: manual entry)
router.post('/', [
  body('teamAScore').isInt(),
  body('teamBScore').isInt(),
  body('teamAPlayers').isArray({ min: 1 }),
  body('teamBPlayers').isArray({ min: 1 }),
  body('date').optional().isISO8601()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { teamAScore, teamBScore, teamAPlayers, teamBPlayers, date, notes, groupId, rounds } = req.body;

    const game = await prisma.game.create({
      data: {
        teamAScore,
        teamBScore,
        date: date ? new Date(date) : new Date(),
        notes,
        groupId,
        userId: req.userId,
        players: {
          create: [
            ...teamAPlayers.map(playerId => ({ playerId, team: 'A' })),
            ...teamBPlayers.map(playerId => ({ playerId, team: 'B' }))
          ]
        },
        rounds: rounds ? {
          create: rounds.map((r, i) => ({
            roundNum: i + 1,
            teamAScore: r.teamAScore,
            teamBScore: r.teamBScore
          }))
        } : undefined
      },
      include: {
        players: { include: { player: true } },
        rounds: true
      }
    });

    // Update player stats
    await updatePlayerStats(teamAPlayers, teamBPlayers, teamAScore, teamBScore);

    res.status(201).json(game);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Spiel konnte nicht gespeichert werden' });
  }
});

// Delete game
router.delete('/:id', async (req, res) => {
  try {
    // Delete related rounds first (no cascade)
    await prisma.round.deleteMany({
      where: { game: { id: req.params.id, userId: req.userId } }
    });
    await prisma.game.deleteMany({
      where: { id: req.params.id, userId: req.userId }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Löschen fehlgeschlagen' });
  }
});

// Helper: update player stats after game
async function updatePlayerStats(teamAPlayers, teamBPlayers, teamAScore, teamBScore) {
  const aWon = teamAScore > teamBScore;

  const updates = [
    ...teamAPlayers.map(id => ({
      playerId: id,
      won: aWon,
      points: teamAScore
    })),
    ...teamBPlayers.map(id => ({
      playerId: id,
      won: !aWon,
      points: teamBScore
    }))
  ];

  for (const u of updates) {
    await prisma.playerStats.upsert({
      where: { playerId: u.playerId },
      create: {
        playerId: u.playerId,
        totalGames: 1,
        totalWins: u.won ? 1 : 0,
        totalPoints: u.points,
        currentStreak: u.won ? 1 : 0,
        bestStreak: u.won ? 1 : 0
      },
      update: {
        totalGames: { increment: 1 },
        totalWins: u.won ? { increment: 1 } : undefined,
        totalPoints: { increment: u.points },
        currentStreak: u.won ? { increment: 1 } : 0,
        bestStreak: u.won
          ? { increment: 0 } // Will be handled below
          : undefined
      }
    });

    // Update best streak
    if (u.won) {
      const stats = await prisma.playerStats.findUnique({ where: { playerId: u.playerId } });
      if (stats && stats.currentStreak > stats.bestStreak) {
        await prisma.playerStats.update({
          where: { playerId: u.playerId },
          data: { bestStreak: stats.currentStreak }
        });
      }
    }
  }
}

module.exports = router;
