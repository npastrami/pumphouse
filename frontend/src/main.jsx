// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Reset default browser styles
document.body.style.margin = '0';
document.body.style.padding = '0';
document.documentElement.style.margin = '0';
document.documentElement.style.padding = '0';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);