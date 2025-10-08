import React from 'react';
import TodoList from './components/TodoList';
import TodoForm from './components/TodoForm';
import './styles/main.css';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            TaskMaster Pro
          </h1>
        </header>
        <main>
          <TodoForm />
          <TodoList />
        </main>
      </div>
    </div>
  );
}

export default App;