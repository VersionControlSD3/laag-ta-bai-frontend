import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { AppProviders, createQueryClient } from './AppProviders'
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt'
import { routes } from './routes'
import './styles/index.css'

const router = createBrowserRouter(routes)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders queryClient={createQueryClient()}>
      <RouterProvider router={router} />
      <PwaUpdatePrompt />
    </AppProviders>
  </StrictMode>,
)
