const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// Get all players for current user
router.get('/', async (req, res) => {
  try {
    const players = await prisma.player.findMany({
      where: { userId: req.userId },
      orderBy: { name: 'asc' }
    });
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: 'Spieler konnten nicht geladen werden' });
  }
});

// Create player
router.post('/', [
  body('name').trim().notEmpty().isLength({ max: 50 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const player = await prisma.player.create({
      data: { name: req.body.name, userId: req.userId }
    });
    res.status(201).json(player);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Spieler existiert bereits' });
    }
    res.status(500).json({ error: 'Spieler konnte nicht erstellt werden' });
  }
});

// Update player
router.put('/:id', [
  body('name').trim().notEmpty().isLength({ max: 50 })
], async (req, res) => {
  try {
    const player = await prisma.player.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data: { name: req.body.name }
    });
    if (player.count === 0) {
      return res.status(404).json({ error: 'Spieler nicht gefunden' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Update fehlgeschlagen' });
  }
});

// Delete player
router.delete('/:id', async (req, res) => {
  try {
    await prisma.player.deleteMany({
      where: { id: req.params.id, userId: req.userId }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Löschen fehlgeschlagen' });
  }
});

module.exports = router;
