import React, { useState } from 'react';

function TodoItem({ todo, onToggle, onDelete }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleToggle = async () => {
    try {
      setIsLoading(true);
      await onToggle(todo.id);
      setError(null);
    } catch (err) {
      setError('Failed to update todo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this todo?')) {
      return;
    }

    try {
      setIsLoading(true);
      await onDelete(todo.id);
      setError(null);
    } catch (err) {
      setError('Failed to delete todo');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex items-center p-4 border rounded mb-2 
      ${todo.completed ? 'bg-gray-50' : 'bg-white'}`}>
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={`mr-4 w-6 h-6 rounded-full border-2 
          ${todo.completed ? 'bg-green-500 border-green-500' : 'border-gray-400'}
          ${isLoading ? 'opacity-50' : 'hover:border-blue-500'}`}
      >
        {isLoading ? '⌛' : (todo.completed ? '✓' : '')}
      </button>
      
      <span className={`flex-1 ${todo.completed ? 'line-through text-gray-400' : ''}`}>
        {todo.text}
      </span>

      <button
        onClick={handleDelete}
        disabled={isLoading}
        className={`ml-4 text-red-500 hover:text-red-700
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        🗑️
      </button>

      {error && (
        <div className="text-red-500 text-sm ml-2">{error}</div>
      )}
    </div>
  );
}

export default TodoItem;