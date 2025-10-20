import React from 'react';
import { CheckCircle, Circle, Star } from 'lucide-react';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  priority: number;
  dueDate?: string;
}

const TodoList = () => {
  const [todos, setTodos] = React.useState<Todo[]>([]);

  const toggleTodo = (id: string) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  return (
    <div className="max-w-4xl mx-auto mt-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-4">
          <h2 className="text-xl font-semibold mb-4">Today's Tasks</h2>
          <div className="space-y-2">
            {todos.map(todo => (
              <div 
                key={todo.id}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
              >
                <button onClick={() => toggleTodo(todo.id)}>
                  {todo.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-400" />
                  )}
                </button>
                <span className={`flex-1 ${todo.completed ? 'line-through text-gray-400' : ''}`}>
                  {todo.title}
                </span>
                {todo.priority > 0 && (
                  <Star className="h-5 w-5 text-yellow-400" fill="currentColor" />
                )}
                {todo.dueDate && (
                  <span className="text-sm text-gray-500">
                    {new Date(todo.dueDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TodoList;