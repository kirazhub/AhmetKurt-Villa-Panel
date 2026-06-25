import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

// Tüm /api isteklerine kayıtlı şifreyi (header) otomatik ekle.
const _fetch = window.fetch.bind(window);
window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
  if (url && (url.startsWith('/api') || url.includes('://') && new URL(url, location.href).pathname.startsWith('/api'))) {
    const sifre = localStorage.getItem('villa_sifre') || '';
    init = { ...init, headers: { ...(init.headers || {}), 'x-villa-sifre': sifre } };
  }
  return _fetch(input as RequestInfo, init);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
