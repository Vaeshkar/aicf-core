import React from 'react';
import TodoItem from './TodoItem';

function TodoList({ todos, onTodoUpdate }) {
  const sortedTodos = [...todos].sort((a, b) => {
    if (a.completed === b.completed) {
      return new Date(b.created_at) - new Date(a.created_at);
    }
    return a.completed ? 1 : -1;
  });

  if (todos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>No todos yet. Add one above!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedTodos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onUpdate={onTodoUpdate}
        />
      ))}
    </div>
  );
}

export default TodoList;