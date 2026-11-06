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
    // new Headers aceita objeto ou Headers; o spread de um Headers vinha vazio e perdia o Content-Type
    const headers = new Headers(config?.headers);
    headers.set('Authorization', `Bearer ${token}`);
    return originalFetch(resource, { ...config, headers });
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
