import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import { ProfileProvider } from '@/state/profile';
import { ReversePolesProvider } from '@/state/reversePoles';
import { Toaster } from '@garden/ui';
import '@garden/ui/styles/toast.css';
import '@garden/tokens';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ReversePolesProvider>
      <ProfileProvider>
        <App />
        <Toaster position="bottom-center" />
      </ProfileProvider>
    </ReversePolesProvider>
  </React.StrictMode>
);
