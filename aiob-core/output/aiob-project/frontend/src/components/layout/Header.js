import React from 'react';
import { ThemeToggle } from '../ThemeToggle';

export default function Header() {
  return (
    <header className="header-container">
      <h1 className="logo">Premium Todo Suite</h1>
      <ThemeToggle />
    </header>
  );
}