import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { iniciarGuardaLegibilidade } from './utils/campoLegivel';

const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const [resource, config] = args;
  const token = localStorage.getItem('acorde_token');
  if (token && typeof resource === 'string' && resource.startsWith('/api/')) {
    const newConfig = config || {};
    newConfig.headers = {
      ...newConfig.headers,
      'Authorization': `Bearer ${token}`
    };
    return originalFetch(resource, newConfig);
  }
  return originalFetch(...args);
};

// Garante contraste em todos os campos de digitação (texto branco em fundo branco, etc.)
iniciarGuardaLegibilidade();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
