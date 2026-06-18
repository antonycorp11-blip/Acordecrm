
import React from 'react';
import ReactDOM from 'react-dom/client';
import { VoiceRush as App } from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Não foi possível encontrar o elemento raiz.");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App onClose={() => {}} onGameOver={() => {}} />
  </React.StrictMode>
);
