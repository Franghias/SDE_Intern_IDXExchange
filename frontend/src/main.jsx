import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './stylesheets/index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  // StrictMode enables extra warnings and checks during development
  <StrictMode>
    <App />
  </StrictMode>,
)
