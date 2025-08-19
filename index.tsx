import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { db } from './database';

// Initialize the local database on application startup
db.initialize();

const container = document.getElementById('root');

if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
    console.error('Fatal Error: Root container missing in index.html');
}