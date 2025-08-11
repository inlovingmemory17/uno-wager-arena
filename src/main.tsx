import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

function Root() {
  return <App />
}

createRoot(document.getElementById('root')!).render(<Root />)
