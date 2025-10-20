import React, { useState } from 'react';

function TodoItem({ todo, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(todo.text);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/todos/${todo.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          completed: !todo.completed,
        }),
      });

      if (!response.ok) throw new Error('Failed to update todo');
      onUpdate();
    } catch (error) {
      console.error('Error updating todo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this todo?')) return;

    try {
      const response = await fetch(`/api/todos/${todo.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete todo');
      onUpdate();
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  const handleEdit = async () => {
    if (!text.trim()) return;
    
    try {
      const response = await fetch(`/api/todos/${todo.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim(),
        }),
      });

      if (!response.ok) throw new Error('Failed to update todo');
      setEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  };

  return (
    <div className={`p-4 rounded-lg shadow-sm ${todo.completed ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-700'}`}>
      <div className="flex items-center gap-3">
        <button
          onClick={handleToggle}
          disabled={loading}
          className="w-6 h-6 rounded-full border-2 border-blue-500 flex items-center justify-center"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          ) : todo.completed ? (
            <span className="text-blue-500">✓</span>
          ) : null}
        </button>

        {editing ? (
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={handleEdit}
            onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
            className="flex-1 px-2 py-1 border rounded"
            autoFocus
          />
        ) : (
          <span
            onDoubleClick={() => setEditing(true)}
            className={`flex-1 ${todo.completed ? 'line-through text-gray-500' : ''}`}
          >
            {todo.text}
          </span>
        )}

        <button
          onClick={handleDelete}
          className="text-red-500 hover:text-red-600 p-1"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

export default TodoItem;