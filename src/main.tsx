import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { AppProviders, createQueryClient } from './AppProviders'
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt'
import { routes } from './routes'
// Self-hosted redesign fonts (UI Redesign #2): Plus Jakarta Sans for text, Playfair Display for display.
import '@fontsource-variable/plus-jakarta-sans/wght.css'
import '@fontsource-variable/playfair-display/wght.css'
import '@fontsource-variable/playfair-display/wght-italic.css'
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
