const [theme, setTheme] = useState('light');

const toggleTheme = () => {
  setTheme(theme === 'light' ? 'dark' : 'light');
  document.documentElement.classList.toggle('dark');
};