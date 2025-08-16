import React, { useEffect, useState } from 'react';
import { getStatusSnapshot } from '../api';
import ReadinessLightSync from './ReadinessLightSync';

export default function ReadinessBoard() {
  const [initial, setInitial] = useState<Record<string, any>>({});

  useEffect(() => {
    getStatusSnapshot().then((rows) => {
      const map: Record<string, string> = {};
      rows.forEach((r) => (map[r.name] = r.status));
      setInitial(map);
    });
  }, []);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <ReadinessLightSync name="Raz" defaultStatus={initial['Raz'] ?? 'green'} />
      <ReadinessLightSync name="Sawsan" defaultStatus={initial['Sawsan'] ?? 'green'} />
      {/* add more people as needed */}
    </div>
  );
}
