const express = require('express');
const router = express.Router();
const Todo = require('../models/todo');
const todos = require('../data/todos.json');

router.get('/', (req, res) => {
  const todosArray = todos.map(todo => Todo.fromJSON(todo));
  res.json(todosArray);
});

router.post('/', (req, res) => {
  const newTodo = new Todo(todos.length + 1, req.body.text, false, req.body.priority);
  todos.push(newTodo.toJSON());
  res.json(newTodo.toJSON());
});

router.patch('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = todos.findIndex(todo => todo.id === id);
  if (index !== -1) {
    const updatedTodo = { ...todos[index], ...req.body };
    todos[index] = updatedTodo;
    res.json(updatedTodo);
  } else {
    res.status(404).json({ error: 'Todo not found' });
  }
});

router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = todos.findIndex(todo => todo.id === id);
  if (index !== -1) {
    todos.splice(index, 1);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Todo not found' });
  }
});

module.exports = router;