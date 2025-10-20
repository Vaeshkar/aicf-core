import React from 'react';
import { Bell, Search, Settings, Sun, Moon } from 'lucide-react';

const Navbar = () => {
  const [isDark, setIsDark] = React.useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <nav className="fixed w-full bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-50">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">
            Premium Todo Suite
          </h1>
          <div className="relative">
            <input
              type="search"
              placeholder="Search tasks..."
              className="w-64 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white"
            />
            <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={toggleTheme}>
            {isDark ? (
              <Sun className="h-5 w-5 text-gray-400" />
            ) : (
              <Moon className="h-5 w-5 text-gray-400" />
            )}
          </button>
          <Bell className="h-5 w-5 text-gray-400" />
          <Settings className="h-5 w-5 text-gray-400" />
          <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
            U
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;