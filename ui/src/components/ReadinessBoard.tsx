import React, { useEffect, useState } from 'react';
import { getStatusSnapshot, LightStatus } from '@/api';
import ReadinessLightSync from '@/components/ReadinessLightSync';

interface StatusRow {
  name: string;
  status: LightStatus;
}

export default function ReadinessBoard() {
  const [initial, setInitial] = useState<Record<string, LightStatus>>({});

  useEffect(() => {
    getStatusSnapshot().then((rows: StatusRow[]) => {
      const map: Record<string, LightStatus> = {};
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
