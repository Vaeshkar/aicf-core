import React, { useState, useEffect } from 'react';
import TodoForm from './components/TodoForm';
import TodoList from './components/TodoList';
import { TodoAPI } from './services/api';

function App() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTodos();
  }, []);

  const loadTodos = async () => {
    try {
      setLoading(true);
      const data = await TodoAPI.getAllTodos();
      setTodos(data);
      setError(null);
    } catch (err) {
      setError('Failed to load todos. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTodo = async (text) => {
    try {
      setLoading(true);
      const newTodo = await TodoAPI.createTodo({ text, completed: false });
      setTodos(prev => [newTodo, ...prev]);
      setError(null);
    } catch (err) {
      setError('Failed to add todo. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTodo = async (id) => {
    try {
      const todoToUpdate = todos.find(t => t.id === id);
      const updatedTodo = await TodoAPI.updateTodo(id, { 
        completed: !todoToUpdate.completed 
      });
      setTodos(prev => prev.map(todo => 
        todo.id === id ? updatedTodo : todo
      ));
      setError(null);
    } catch (err) {
      setError('Failed to update todo. Please try again.');
    }
  };

  const handleDeleteTodo = async (id) => {
    try {
      await TodoAPI.deleteTodo(id);
      setTodos(prev => prev.filter(todo => todo.id !== id));
      setError(null);
    } catch (err) {
      setError('Failed to delete todo. Please try again.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">TaskMaster Pro</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <TodoForm onAdd={handleAddTodo} disabled={loading} />
      
      {loading && !todos.length ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <TodoList 
          todos={todos}
          onToggle={handleToggleTodo}
          onDelete={handleDeleteTodo}
          loading={loading}
        />
      )}
    </div>
  );
}

export default App;