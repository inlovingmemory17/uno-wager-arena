import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { PrivyProvider } from '@privy-io/react-auth'
import { PRIVY_APP_ID } from './config/privy'

function Root() {
  // If no APP ID yet, render app without Privy so the site still works
  if (!PRIVY_APP_ID) return <App />
  return (
    <PrivyProvider appId={PRIVY_APP_ID} config={{
      appearance: { theme: 'dark' },
      embeddedWallets: {
        solana: { createOnLogin: 'users-without-wallets' },
      },
      solanaClusters: [{ name: 'devnet', rpcUrl: 'https://api.devnet.solana.com' }],
    }}>
      <App />
    </PrivyProvider>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)
