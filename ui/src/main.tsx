import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import { ProfileProvider } from '@/state/profile';
import { ReversePolesProvider } from '@/state/reversePoles';
import '@garden/tokens';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ReversePolesProvider>
      <ProfileProvider>
        <App />
      </ProfileProvider>
    </ReversePolesProvider>
  </React.StrictMode>
);
