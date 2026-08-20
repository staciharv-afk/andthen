import React from 'react'
import ReactDOM from 'react-dom/client'
import AndThenApp from './app.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AndThenApp />
    </ErrorBoundary>
  </React.StrictMode>,
)
