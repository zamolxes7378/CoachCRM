import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Global: strip leading zeros from all numeric inputs (007 → 7, 00 → 0)
// Allows: 0, 0.5, etc.
document.addEventListener('input', (e) => {
  if (e.target.type === 'number' && !e.target._stripLz) {
    const val = e.target.value
    if (val.length > 1 && /^0\d/.test(val)) {
      e.target._stripLz = true
      const nativeSet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      nativeSet.call(e.target, String(Number(val)))
      e.target.dispatchEvent(new Event('input', { bubbles: true }))
      e.target._stripLz = false
    }
  }
}, true)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
