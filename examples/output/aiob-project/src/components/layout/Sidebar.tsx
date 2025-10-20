import React from 'react';
import { Home, Calendar, BarChart2, Users, Inbox } from 'lucide-react';

const Sidebar = () => {
  return (
    <aside className="w-64 h-screen fixed left-0 top-16 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      <nav className="p-4">
        <ul className="space-y-2">
          <li>
            <a href="/" className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
              <Home className="h-5 w-5" />
              <span>Dashboard</span>
            </a>
          </li>
          <li>
            <a href="/inbox" className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
              <Inbox className="h-5 w-5" />
              <span>Inbox</span>
            </a>
          </li>
          <li>
            <a href="/calendar" className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
              <Calendar className="h-5 w-5" />
              <span>Calendar</span>
            </a>
          </li>
          <li>
            <a href="/analytics" className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
              <BarChart2 className="h-5 w-5" />
              <span>Analytics</span>
            </a>
          </li>
          <li>
            <a href="/team" className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
              <Users className="h-5 w-5" />
              <span>Team</span>
            </a>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;