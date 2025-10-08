const express = require('express');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');

const router = express.Router();

const loadTodos = () => {
  try {
    const dataBuffer = fs.readFileSync('data/todos.json');
    const dataJSON = dataBuffer.toString();
    return JSON.parse(dataJSON)
  } catch (e) {
    return [];
  }
};

const saveTodos = (data) => {
  const dataJSON = JSON.stringify(data);
  fs.writeFileSync('data/todos.json', dataJSON);
};

// POST /api/todos
router.post(
  '/',
  body('text').not().isEmpty().trim(),
  body('priority').isIn(['low', 'medium', 'high']),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array() });
    }
      
    const todos = loadTodos();
    const { text, priority } = req.body;
    const newTodo = { id: uuidv4(), text, priority, completed: false };
    todos.unshift(newTodo);
    saveTodos(todos);
    res.json({ success: true, data: newTodo });
  }
);

// GET /api/todos
router.get('/', (req, res) => {
  const todos = loadTodos();
  res.json({ success: true, data: todos });
});

// PATCH /api/todos/:id
router.patch(
  '/:id',
  body('completed').isBoolean(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array() });
    }

    const todos = loadTodos();
    const todo = todos.find((todo) => todo.id === req.params.id);
    if (!todo) {
      return res.status(404).json({ success: false, error: 'Todo not found' });
    }
      
    todo.completed = req.body.completed;
    saveTodos(todos);
    res.json({ success: true, data: todo });
  }
);

// DELETE /api/todos/:id
router.delete('/:id', (req, res) => {
  const todos = loadTodos();
  const newTodos = todos.filter((todo) => todo.id !== req.params.id);
  if (todos.length === newTodos.length) {
    return res.status(404).json({ success: false, error: 'Todo not found' });
  }
  saveTodos(newTodos);
  res.json({ success: true, message: 'Todo deleted' });
});

module.exports = router;