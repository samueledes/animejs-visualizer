import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// I font stanno in node_modules, non su una CDN: l'editor deve aprirsi
// anche senza rete. Archivo è variabile sull'asse di larghezza (62–125%):
// il condensato del cartiglio esce dallo stesso file del corpo.
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource/ibm-plex-mono/400.css';

import './design/tokens.css';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
