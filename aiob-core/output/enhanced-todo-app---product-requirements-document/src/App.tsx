import React from 'react';
import { TodoForm } from './components/TodoForm';
import { TodoList } from './components/TodoList';
import { useTodos } from './hooks/useTodos';
import { Spinner } from './components/Spinner';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  const { todos, loading, error, addTodo, toggleTodo, deleteTodo } = useTodos();

  if (loading && !todos.length) {
    return <Spinner />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">TaskMaster Pro</h1>
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <TodoForm onSubmit={addTodo} />
          <TodoList 
            todos={todos}
            onToggle={toggleTodo}
            onDelete={deleteTodo}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;