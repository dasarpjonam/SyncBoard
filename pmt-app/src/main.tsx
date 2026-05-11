import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { theme } from './theme'
import AppContent from './App'
import './index.css'
import { WorkspaceProvider } from './store/WorkspaceContext'
import { ToastProvider } from './components/Toast'
import './types/electron-mock'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <WorkspaceProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </WorkspaceProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
