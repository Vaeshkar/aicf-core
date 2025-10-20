const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const TODOS_FILE = path.join(__dirname, '../data/todos.json');

// Initialize todos file if it doesn't exist
async function initTodosFile() {
  try {
    await fs.access(TODOS_FILE);
  } catch {
    await fs.writeFile(TODOS_FILE, '[]');
  }
}

initTodosFile();

// GET all todos
router.get('/', async (req, res) => {
  try {
    const todos = await fs.readFile(TODOS_FILE, 'utf8');
    res.json(JSON.parse(todos));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

module.exports = router;