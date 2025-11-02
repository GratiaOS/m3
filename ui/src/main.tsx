import React from 'react';
import ReactDOM from 'react-dom/client';
import { ProfileProvider } from '@/state/profile';
import { ReversePolesProvider } from '@/state/reversePoles';
import App from '@/App';
import PadHost from '@/pads/PadHost';
import { useProfile } from '@/state/profile';
import { usePadRoute } from '@/pads/usePadRoute';
import { PadRegistryProvider } from '@/hooks/usePadRegistry';
import { Toaster } from '@gratiaos/ui';
import '@gratiaos/ui/styles/toast.css';
import '@gratiaos/tokens';
import './styles.css';

const RootApp: React.FC = () => {
  const route = usePadRoute();
  const { me } = useProfile();

  if (route) {
    return (
      <>
        <PadHost padId={route.id} me={me} />
        <Toaster position="bottom-center" />
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
    <PadRegistryProvider>
      <ReversePolesProvider>
        <ProfileProvider>
          <RootApp />
        </ProfileProvider>
      </ReversePolesProvider>
    </PadRegistryProvider>
  </React.StrictMode>
);
