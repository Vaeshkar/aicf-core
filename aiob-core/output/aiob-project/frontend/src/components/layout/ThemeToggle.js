import React from 'react';

export default function ThemeToggle() {
  return (
    <div>
      <input type="checkbox" id="theme-toggle"/>
      <label htmlFor="theme-toggle" className="toggle-label">
        Dark Theme
      </label>
    </div>
  );
}