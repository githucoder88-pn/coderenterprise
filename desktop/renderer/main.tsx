/**
 * Desktop Renderer — Entry Point
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './components/layout/app-shell';
import { WorkspaceView } from './views/workspace-view';
import './styles/globals.css';

function App() {
  return (
    <AppShell>
      <WorkspaceView />
    </AppShell>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
