module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: '#3B82F6',
        secondary: '#6B7280',
        success: '#10B981',
        danger: '#EF4444',
      },
    },
  },
  plugins: [],
}