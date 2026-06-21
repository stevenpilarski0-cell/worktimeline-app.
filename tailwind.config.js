/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './page.tsx',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'worktimeline-teal': '#008080',
        'worktimeline-teal-dark': '#004d4d',
        'clio-green': '#2ecc71',
        'glass-border': 'rgba(255, 255, 255, 0.9)',
      }
    },
  },
  plugins: [],
}