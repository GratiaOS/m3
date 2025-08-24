import React, { createContext, useContext, useEffect, useState } from 'react';

type ProfileState = { me: string; setMe: (v: string) => void };
const ProfileContext = createContext<ProfileState | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [me, setMe] = useState<string>(() => localStorage.getItem('m3:me') ?? 'Raz');
  useEffect(() => {
    localStorage.setItem('m3:me', me);
  }, [me]);
  return <ProfileContext.Provider value={{ me, setMe }}>{children}</ProfileContext.Provider>;
};

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within <ProfileProvider>');
  return ctx;
}
