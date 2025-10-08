import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from React build
app.use(express.static('build'));

let todos = [];

// Load data from file
try {
  const jsonData = fs.readFileSync('./data/todos.json');
  todos = JSON.parse(jsonData);
} catch (err) {
  console.error('Error reading todos.json:', err);
  // Initialize empty todos file if it doesn't exist
  fs.writeFileSync('./data/todos.json', '[]');
}

// Save todos to file
const saveTodos = () => {
  fs.writeFileSync('./data/todos.json', JSON.stringify(todos, null, 2));
};

app.get('/api/todos', (req, res) => {
  res.json(todos);
});

app.post('/api/todos', (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }
  
  const newTodo = {
    id: uuidv4(),
    text,
    completed: false
  };
  
  todos.push(newTodo);
  saveTodos();
  res.status(201).json(newTodo);
});

app.put('/api/todos/:id', (req, res) => {
  const { id } = req.params;
  const todo = todos.find(t => t.id === id);
  
  if (!todo) {
    return res.status(404).json({ error: 'Todo not found' });
  }

  todo.completed = !todo.completed;
  saveTodos();
  res.json(todo);
});

app.delete('/api/todos/:id', (req, res) => {
  const { id } = req.params;
  const index = todos.findIndex(t => t.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Todo not found' });
  }

  todos.splice(index, 1);
  saveTodos();
  res.status(204).send();
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Todo API Server running on http://localhost:${PORT}`);
  console.log('📝 API endpoints:');
  console.log('   GET    /api/todos');
  console.log('   POST   /api/todos');
  console.log('   PUT    /api/todos/:id');
  console.log('   DELETE /api/todos/:id');
});
