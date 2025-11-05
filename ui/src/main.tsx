import React from 'react';
import ReactDOM from 'react-dom/client';
import '@/flows/pads/pad-registry';
import { ProfileProvider } from '@/state/profile';
import { ReversePolesProvider } from '@/state/reversePoles';
import App from '@/App';
import PadHost from '@/flows/pads/PadHost';
import { useProfile } from '@/state/profile';
import { usePadRoute } from '@/flows/pads/hooks/usePadRoute';
import { Toaster } from '@gratiaos/ui';
import { Heartbeat, ConstellationHUD } from '@gratiaos/presence-kernel';
import './styles.css';

const RootApp: React.FC = () => {
  const route = usePadRoute();
  const { me } = useProfile();

  if (route) {
    return (
      <>
        <PadHost padId={route.id} me={me} />
        <Toaster position="bottom-center" />
        <Heartbeat />
        <ConstellationHUD />
      </>
    );
  }

  return (
    <>
      <App />
      <Toaster position="bottom-center" />
    </>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ReversePolesProvider>
      <ProfileProvider>
        <RootApp />
      </ProfileProvider>
    </ReversePolesProvider>
  </React.StrictMode>
);
