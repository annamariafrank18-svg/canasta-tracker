const express = require('express');
const prisma = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// Overall stats for current user
router.get('/overview', async (req, res) => {
  try {
    const games = await prisma.game.findMany({
      where: { userId: req.userId },
      include: { players: true }
    });

    const totalGames = games.length;
    const lastGame = games[0] || null;

    res.json({
      totalGames,
      lastGame: lastGame ? {
        date: lastGame.date,
        teamAScore: lastGame.teamAScore,
        teamBScore: lastGame.teamBScore
      } : null
    });
  } catch (err) {
    res.status(500).json({ error: 'Stats konnten nicht geladen werden' });
  }
});

// Player rankings
router.get('/rankings', async (req, res) => {
  try {
    const players = await prisma.player.findMany({
      where: { userId: req.userId },
      include: { playerStats: true }
    });

    const rankings = players
      .filter(p => p.playerStats)
      .map(p => ({
        id: p.id,
        name: p.name,
        totalGames: p.playerStats.totalGames,
        totalWins: p.playerStats.totalWins,
        winRate: p.playerStats.totalGames > 0
          ? Math.round((p.playerStats.totalWins / p.playerStats.totalGames) * 100)
          : 0,
        totalPoints: p.playerStats.totalPoints,
        avgPoints: p.playerStats.totalGames > 0
          ? Math.round(p.playerStats.totalPoints / p.playerStats.totalGames)
          : 0,
        currentStreak: p.playerStats.currentStreak,
        bestStreak: p.playerStats.bestStreak
      }))
      .sort((a, b) => b.winRate - a.winRate);

    res.json(rankings);
  } catch (err) {
    res.status(500).json({ error: 'Rankings konnten nicht geladen werden' });
  }
});

// Player detail stats
router.get('/player/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;

    const player = await prisma.player.findFirst({
      where: { id: playerId, userId: req.userId },
      include: { playerStats: true }
    });
    if (!player) return res.status(404).json({ error: 'Spieler nicht gefunden' });

    // Get all games this player participated in
    const teamPlayers = await prisma.teamPlayer.findMany({
      where: { playerId },
      include: {
        game: {
          include: { players: { include: { player: true } } }
        }
      },
      orderBy: { game: { date: 'desc' } }
    });

    // Partner analysis
    const partnerStats = {};
    for (const tp of teamPlayers) {
      const game = tp.game;
      const won = (tp.team === 'A' && game.teamAScore > game.teamBScore) ||
                  (tp.team === 'B' && game.teamBScore > game.teamAScore);

      const partners = game.players.filter(p => p.team === tp.team && p.playerId !== playerId);
      for (const partner of partners) {
        if (!partnerStats[partner.playerId]) {
          partnerStats[partner.playerId] = { name: partner.player.name, games: 0, wins: 0 };
        }
        partnerStats[partner.playerId].games++;
        if (won) partnerStats[partner.playerId].wins++;
      }
    }

    const bestPartners = Object.values(partnerStats)
      .map(p => ({ ...p, winRate: Math.round((p.wins / p.games) * 100) }))
      .sort((a, b) => b.winRate - a.winRate);

    // Recent form (last 10 games)
    const recentGames = teamPlayers.slice(0, 10).map(tp => {
      const won = (tp.team === 'A' && tp.game.teamAScore > tp.game.teamBScore) ||
                  (tp.team === 'B' && tp.game.teamBScore > tp.game.teamAScore);
      return { date: tp.game.date, won, score: tp.team === 'A' ? tp.game.teamAScore : tp.game.teamBScore };
    });

    res.json({
      player: { id: player.id, name: player.name },
      stats: player.playerStats,
      bestPartners,
      recentForm: recentGames
    });
  } catch (err) {
    res.status(500).json({ error: 'Spieler-Stats konnten nicht geladen werden' });
  }
});

// Fun stats
router.get('/fun', async (req, res) => {
  try {
    const players = await prisma.player.findMany({
      where: { userId: req.userId },
      include: { playerStats: true }
    });

    const withStats = players.filter(p => p.playerStats && p.playerStats.totalGames > 0);

    // GOAT - highest win rate with min 5 games
    const goat = withStats
      .filter(p => p.playerStats.totalGames >= 5)
      .sort((a, b) => (b.playerStats.totalWins / b.playerStats.totalGames) - (a.playerStats.totalWins / a.playerStats.totalGames))[0];

    // Point Machine - highest avg points
    const pointMachine = withStats
      .sort((a, b) => (b.playerStats.totalPoints / b.playerStats.totalGames) - (a.playerStats.totalPoints / a.playerStats.totalGames))[0];

    // Streak King - best streak ever
    const streakKing = withStats
      .sort((a, b) => b.playerStats.bestStreak - a.playerStats.bestStreak)[0];

    // Most Active
    const mostActive = withStats
      .sort((a, b) => b.playerStats.totalGames - a.playerStats.totalGames)[0];

    res.json({
      goat: goat ? { name: goat.name, winRate: Math.round((goat.playerStats.totalWins / goat.playerStats.totalGames) * 100) } : null,
      pointMachine: pointMachine ? { name: pointMachine.name, avgPoints: Math.round(pointMachine.playerStats.totalPoints / pointMachine.playerStats.totalGames) } : null,
      streakKing: streakKing ? { name: streakKing.name, bestStreak: streakKing.playerStats.bestStreak } : null,
      mostActive: mostActive ? { name: mostActive.name, totalGames: mostActive.playerStats.totalGames } : null
    });
  } catch (err) {
    res.status(500).json({ error: 'Fun Stats konnten nicht geladen werden' });
  }
});

module.exports = router;
