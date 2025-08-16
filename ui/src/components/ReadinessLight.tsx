import React, { useState } from 'react';

type Status = 'green' | 'yellow' | 'red';

interface Props {
  name: string;
}

export default function ReadinessLight({ name }: Props) {
  const [status, setStatus] = useState<Status>('green');

  const statusMap = {
    green: { label: '🟢 Green — Ready to Roll', bg: 'bg-green-500' },
    yellow: { label: '🟡 Yellow — Holding Pattern', bg: 'bg-yellow-400' },
    red: { label: '🔴 Red — Full Redirect Needed', bg: 'bg-red-500' },
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-800 rounded-xl shadow-lg">
      <div className={`w-5 h-5 rounded-full ${statusMap[status].bg}`}></div>
      <div className="flex-1 text-white">
        <strong>{name}</strong>: {statusMap[status].label}
      </div>
      <div className="flex gap-2">
        <button onClick={() => setStatus('green')} className="px-2 py-1 text-sm bg-green-500 rounded">
          Green
        </button>
        <button onClick={() => setStatus('yellow')} className="px-2 py-1 text-sm bg-yellow-400 text-black rounded">
          Yellow
        </button>
        <button onClick={() => setStatus('red')} className="px-2 py-1 text-sm bg-red-500 rounded">
          Red
        </button>
      </div>
    </div>
  );
}
