import React from 'react';
import './styles/main.css';

function App() {
  return (
    <div className="container mx-auto px-4 flex flex-col h-screen justify-between">
      <header className="text-center py-4">
        <h1 className="text-2xl font-bold text-gray-900">TaskMaster Pro</h1>
      </header>

      <main>
        {/* Todo functionality will come here */}
      </main>

      <footer className="text-center py-3 text-gray-700">
        © {new Date().getFullYear()} TaskMaster Pro. All rights reserved.
      </footer>

    </div>
  );
}

export default App;