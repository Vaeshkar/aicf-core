const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const fs = require('fs').promises;
const path = require('path');

const todosFile = path.join(__dirname, '../data/todos.json');

// Initialize todos file if it doesn't exist
async function initTodosFile() {
  try {
    await fs.access(todosFile);
  } catch {
    await fs.writeFile(todosFile, '[]');
  }
}

initTodosFile();

// GET /api/todos
router.get('/', async (req, res) => {
  try {
    const data = await fs.readFile(todosFile, 'utf8');
    res.json({ success: true, data: JSON.parse(data) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to read todos' });
  }
});

// POST /api/todos
router.post('/',
  body('text').trim().notEmpty().withMessage('Text is required'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Priority must be low, medium, or high'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const data = await fs.readFile(todosFile, 'utf8');
      const todos = JSON.parse(data);
      
      const newTodo = {
        id: Date.now(),
        text: req.body.text,
        completed: false,
        priority: req.body.priority || 'medium',
        created_at: new Date().toISOString()
      };
      
      todos.unshift(newTodo); // Add to beginning
      await fs.writeFile(todosFile, JSON.stringify(todos, null, 2));
      
      res.status(201).json({ success: true, data: newTodo });
    } catch (error) {
      console.error('Error creating todo:', error);
      res.status(500).json({ success: false, error: 'Failed to create todo' });
    }
  }
);

// PATCH /api/todos/:id
router.patch('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = await fs.readFile(todosFile, 'utf8');
    const todos = JSON.parse(data);
    
    const todoIndex = todos.findIndex(todo => todo.id === id);
    if (todoIndex === -1) {
      return res.status(404).json({ success: false, error: 'Todo not found' });
    }
    
    // Update todo
    if (req.body.hasOwnProperty('completed')) {
      todos[todoIndex].completed = req.body.completed;
    }
    if (req.body.text) {
      todos[todoIndex].text = req.body.text;
    }
    todos[todoIndex].updated_at = new Date().toISOString();
    
    await fs.writeFile(todosFile, JSON.stringify(todos, null, 2));
    
    res.json({ success: true, data: todos[todoIndex] });
  } catch (error) {
    console.error('Error updating todo:', error);
    res.status(500).json({ success: false, error: 'Failed to update todo' });
  }
});

// DELETE /api/todos/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = await fs.readFile(todosFile, 'utf8');
    const todos = JSON.parse(data);
    
    const todoIndex = todos.findIndex(todo => todo.id === id);
    if (todoIndex === -1) {
      return res.status(404).json({ success: false, error: 'Todo not found' });
    }
    
    todos.splice(todoIndex, 1);
    await fs.writeFile(todosFile, JSON.stringify(todos, null, 2));
    
    res.json({ success: true, message: 'Todo deleted' });
  } catch (error) {
    console.error('Error deleting todo:', error);
    res.status(500).json({ success: false, error: 'Failed to delete todo' });
  }
});

module.exports = router;