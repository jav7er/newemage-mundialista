import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Analytics (Plausible): se activa solo si VITE_PLAUSIBLE_DOMAIN está definido
// en el build (p.ej. VITE_PLAUSIBLE_DOMAIN=mundial.newemage.com.mx).
const plausibleDomain = import.meta.env.VITE_PLAUSIBLE_DOMAIN;
if (plausibleDomain) {
  const s = document.createElement('script');
  s.defer = true;
  s.src = 'https://plausible.io/js/script.js';
  s.setAttribute('data-domain', plausibleDomain);
  document.head.appendChild(s);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
