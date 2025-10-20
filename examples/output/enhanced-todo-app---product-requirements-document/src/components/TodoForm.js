import React, { useState } from 'react';

function TodoForm({ onAdd, disabled }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!text.trim()) {
      setError('Todo text is required');
      return;
    }

    try {
      await onAdd(text);
      setText('');
      setError('');
    } catch (err) {
      setError('Failed to add todo');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What needs to be done?"
          className="flex-1 p-2 border rounded focus:ring-2 focus:ring-blue-500"
          disabled={disabled}
        />
        <button
          type="submit"
          disabled={disabled}
          className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {disabled ? (
            <span className="inline-block animate-spin">⌛</span>
          ) : 'Add'}
        </button>
      </div>
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </form>
  );
}

export default TodoForm;