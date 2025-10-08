import React, { useState } from 'react';
import { todoApi } from '../services/api';

const AddTodo = ({ onTodoAdded }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const newTodo = await todoApi.addTodo(text);
      onTodoAdded(newTodo);
      setText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a new todo"
          className="flex-1 px-3 py-2 border rounded"
          disabled={loading}
        />
        <button 
          type="submit" 
          className="px-4 py-2 bg-blue-500 text-white rounded"
          disabled={loading}
        >
          {loading ? 'Adding...' : 'Add'}
        </button>
      </form>
      {error && (
        <div className="text-red-500 mt-2">{error}</div>
      )}
    </div>
  );
};

export default AddTodo;