import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Ant Design v5 CSS - no need to import reset.css as it's included in the theme
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
