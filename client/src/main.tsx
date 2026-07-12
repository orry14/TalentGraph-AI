import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Monkey-patch fetch to include mock RBAC headers for ideation phase
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  let [resource, config] = args;
  
  if (typeof resource === 'string' && resource.startsWith('/api')) {
    const role = localStorage.getItem('mockRole') || 'admin';
    const userId = localStorage.getItem('mockUserId') || 'emp-1';
    
    config = config || {};
    config.headers = {
      ...config.headers,
      'x-mock-role': role,
      'x-mock-user-id': userId
    };
  }
  
  return originalFetch(resource, config);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
