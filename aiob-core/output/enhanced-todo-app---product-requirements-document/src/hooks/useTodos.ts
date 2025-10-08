import { useState, useEffect } from 'react';
import { todosApi } from '../utils/api';

export const useTodos = () => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTodos = async () => {
    setLoading(true);
    try {
      const data = await todosApi.getAll();
      setTodos(data);
      setError(null);
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  const addTodo = async (text: string, priority: string = 'medium') => {
    setLoading(true);
    try {
      const newTodo = await todosApi.create(text, priority);
      setTodos(prev => [newTodo, ...prev]);
      setError(null);
      return true;
    } catch (err) {
      setError(err as string);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const toggleTodo = async (id: number) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    try {
      const updated = await todosApi.update(id, { completed: !todo.completed });
      setTodos(prev => prev.map(t => t.id === id ? updated : t));
      setError(null);
    } catch (err) {
      setError(err as string);
    }
  };

  const deleteTodo = async (id: number) => {
    try {
      await todosApi.delete(id);
      setTodos(prev => prev.filter(t => t.id !== id));
      setError(null);
    } catch (err) {
      setError(err as string);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  return {
    todos,
    loading,
    error,
    addTodo,
    toggleTodo,
    deleteTodo,
    fetchTodos
  };
};