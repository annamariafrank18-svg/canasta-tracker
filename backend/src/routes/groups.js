const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// Get all groups
router.get('/', async (req, res) => {
  try {
    const groups = await prisma.group.findMany({
      where: { userId: req.userId },
      include: { _count: { select: { games: true } } },
      orderBy: { name: 'asc' }
    });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: 'Gruppen konnten nicht geladen werden' });
  }
});

// Create group
router.post('/', [
  body('name').trim().notEmpty().isLength({ max: 50 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const group = await prisma.group.create({
      data: { name: req.body.name, userId: req.userId }
    });
    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ error: 'Gruppe konnte nicht erstellt werden' });
  }
});

// Delete group
router.delete('/:id', async (req, res) => {
  try {
    await prisma.group.deleteMany({
      where: { id: req.params.id, userId: req.userId }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Löschen fehlgeschlagen' });
  }
});

module.exports = router;
