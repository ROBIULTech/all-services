import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initAntiTrackingShield } from './lib/antiTracking';

// Activate Location & Anti-Tracking Cloaking Shield
initAntiTrackingShield();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
