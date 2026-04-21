import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Global styles reset
const style = document.createElement('style');
style.textContent = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f7fafc; color: #1a202c; }
  a { color: #3182ce; }
  button { font-family: inherit; }
  input, select, textarea { font-family: inherit; }
  pre { overflow-x: auto; }
  code { font-family: 'Fira Code', 'Consolas', monospace; }
`;
document.head.appendChild(style);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);
