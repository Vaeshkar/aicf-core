import React from 'react';

function TodoItem({ todo }) {
  return (
    <div className="flex items-center p-2 border rounded">
      <input type="checkbox" className="mr-2" />
      <span>{todo?.text}</span>
    </div>
  );
}

export default TodoItem;