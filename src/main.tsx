import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Automatic HTTPS protocol enforcement
if (
  typeof window !== 'undefined' &&
  window.location.protocol === 'http:' &&
  !window.location.hostname.includes('localhost') &&
  !window.location.hostname.includes('127.0.0.1')
) {
  window.location.replace(
    `https://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`
  );
}

createRoot(document.getElementById('root')!).render(<App />);
