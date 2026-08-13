import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './stylesheets/index.css'
import App from './App.jsx'
import { prefetchInitialData } from './utils/prefetchCache'

// Fire initial API calls in parallel before React renders so page data
// is likely cached by the time the user navigates to each page.
prefetchInitialData();

createRoot(document.getElementById('root')).render(
  // StrictMode enables extra warnings and checks during development
  <StrictMode>
    <App />
  </StrictMode>,
)
