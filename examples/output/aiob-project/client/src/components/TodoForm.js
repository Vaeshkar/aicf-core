import React from 'react';

function TodoForm() {
  return (
    <form className="mb-4">
      <input
        type="text"
        className="w-full p-2 border rounded"
        placeholder="What needs to be done?"
      />
    </form>
  );
}

export default TodoForm;