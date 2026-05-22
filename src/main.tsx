// Polyfill Buffer for Solana libraries in browser
import { Buffer } from 'buffer';
(window as any).Buffer = Buffer;

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log('main.tsx loaded');

try {
  const rootEl = document.getElementById('root');
  console.log('root element:', rootEl);
  
  if (rootEl) {
    const root = createRoot(rootEl);
    console.log('createRoot success');
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    console.log('render called');
  } else {
    console.error('Root element not found!');
  }
} catch (err) {
  console.error('Fatal error in main.tsx:', err);
}
