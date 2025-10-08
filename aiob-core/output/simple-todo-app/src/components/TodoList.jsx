import React from 'react';
import { todoApi } from '../services/api';

const TodoList = ({ todos, setTodos, loading, error }) => {
  const handleToggle = async (id) => {
    try {
      const todo = todos.find(t => t.id === id);
      await todoApi.toggleTodo(id, !todo.completed);
      setTodos(todos.map(t => 
        t.id === id ? { ...t, completed: !t.completed } : t
      ));
    } catch (err) {
      console.error('Failed to toggle todo:', err);
      alert('Failed to update todo. Please try again.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await todoApi.deleteTodo(id);
      setTodos(todos.filter(t => t.id !== id));
    } catch (err) {
      console.error('Failed to delete todo:', err);
      alert('Failed to delete todo. Please try again.');
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading todos...</div>;
  }

  if (error) {
    return <div className="text-red-500 py-4">{error}</div>;
  }

  return (
    <ul className="space-y-2">
      {todos.map(todo => (
        <li key={todo.id} className="flex items-center gap-2 p-2 border rounded">
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => handleToggle(todo.id)}
          />
          <span className={todo.completed ? 'line-through' : ''}>
            {todo.text}
          </span>
          <button
            onClick={() => handleDelete(todo.id)}
            className="ml-auto px-2 py-1 bg-red-500 text-white rounded"
          >
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
};

export default TodoList;