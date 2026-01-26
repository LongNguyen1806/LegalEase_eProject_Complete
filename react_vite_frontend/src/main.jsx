import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './assets/styles/global.css' 

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 5000, 
      refetchOnWindowFocus: false, 
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)