"use client";
import { useEffect, useState } from 'react';
import * as Switch from '@radix-ui/react-switch';

export default function Page() {
  const [todos, setTodos] = useState([]);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    fetch('/api/todos')
      .then((r) => r.json())
      .then(setTodos)
      .catch(() => setTodos([]));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  return (
    <main className="min-h-screen p-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">TaskMaster Pro</h1>
          <label className="flex items-center gap-2">
            <span className="text-sm">Dark mode</span>
            <Switch.Root
              className="w-11 h-6 bg-gray-300 dark:bg-gray-700 rounded-full relative data-[state=checked]:bg-blue-600"
              checked={dark}
              onCheckedChange={setDark}
            >
              <Switch.Thumb className="block w-5 h-5 bg-white rounded-full shadow translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px] transition-transform" />
            </Switch.Root>
          </label>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Todos</h2>
          <ul className="space-y-2">
            {todos.map((t, idx) => (
              <li key={idx} className="p-3 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                {typeof t === 'string' ? t : JSON.stringify(t)}
              </li>
            ))}
            {todos.length === 0 && (
              <li className="text-sm text-gray-500">No todos yet.</li>
            )}
          </ul>
        </section>
      </div>
    </main>
  );
}
