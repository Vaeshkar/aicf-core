const express = require('express');
const { check, validationResult } = require('express-validator');
const { getTodos, addTodo, updateTodo, deleteTodo } = require('../utils/todos');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const todos = await getTodos();
    res.json(todos);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post(
  '/',
  [check('text').notEmpty().withMessage('Todo text is required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const newTodo = await addTodo(req.body);
      res.status(201).json(newTodo);
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

router.put('/:id', async (req, res) => {
  try {
    const updatedTodo = await updateTodo(req.params.id, req.body);
    if (!updatedTodo) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    res.json(updatedTodo);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deletedTodo = await deleteTodo(req.params.id);
    if (!deletedTodo) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    res.json({ message: 'Todo deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;