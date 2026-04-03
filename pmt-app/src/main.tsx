import React from 'react'
import ReactDOM from 'react-dom/client'
import AppContent from './App'
import './index.css'
import { WorkspaceProvider } from './store/WorkspaceContext'
import './types/electron-mock'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <WorkspaceProvider>
      <AppContent />
    </WorkspaceProvider>
  </React.StrictMode>,
)
