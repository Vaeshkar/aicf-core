const fs = require('fs');
const path = require('path');
const Todo = require('../models/todo');

const TODOS_FILE = path.join(__dirname, '..', 'data', 'todos.json');

const readTodos = () => {
  const rawData = fs.readFileSync(TODOS_FILE);
  return JSON.parse(rawData);
};

const writeTodos = (todos) => {
  const data = JSON.stringify(todos, null, 2);
  fs.writeFileSync(TODOS_FILE, data);
};

const getTodos = () => {
  const todos = readTodos();
  return todos.map((todo) => new Todo(todo));
};

const addTodo = (todoData) => {
  const todos = readTodos();
  const newTodo = new Todo({...todoData, id: Date.now().toString() });
  todos.push(newTodo);
  writeTodos(todos);
  return newTodo;
};

const updateTodo = (id, updates) => {
  const todos = readTodos();
  const index = todos.findIndex((todo) => todo.id === id);
  if (index === -1) {
    return null;
  }
  todos[index] = {...todos[index],...updates };
  writeTodos(todos);
  return new Todo(todos[index]);
};

const deleteTodo = (id) => {
  const todos = readTodos();
  const index = todos.findIndex((todo) => todo.id === id);
  if (index === -1) {
    return null;
  }
  const deletedTodo = todos.splice(index, 1);
  writeTodos(todos);
  return new Todo(deletedTodo[0]);
};

module.exports = {
  getTodos,
  addTodo,
  updateTodo,
  deleteTodo,
};