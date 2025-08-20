// ui/src/components/Composer.tsx
import React, { useState } from 'react';

type Privacy = 'public' | 'private' | 'sealed';

type Props = {
  onIngest: (text: string, tags: string[], privacy?: Privacy) => void | Promise<void>;
  incognito?: boolean;
};

const TAGS = ['logic', 'data', 'distress', 'lol', 'ritual', '99', 'goat', 'm3', 'family', 'money'];
const PRIVACY: Privacy[] = ['public', 'private', 'sealed'];

export default function Composer({ onIngest, incognito = false }: Props) {
  const [text, setText] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [privacy, setPrivacy] = useState<Privacy>('public');

  function toggle(t: string) {
    setTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));
  }

  const effectivePrivacy: Privacy = incognito ? 'sealed' : privacy;

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="type and tag..." rows={3} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        {TAGS.map((t) => (
          <button
            key={t}
            onClick={() => toggle(t)}
            style={{
              background: tags.includes(t) ? '#222' : '#eee',
              color: tags.includes(t) ? '#fff' : '#333',
            }}>
            {t}
          </button>
        ))}

        <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.7 }}>privacy</span>

        <select value={effectivePrivacy} disabled={incognito} onChange={(e) => setPrivacy(e.target.value as Privacy)}>
          {PRIVACY.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        {incognito && <span className="badge">forced: sealed</span>}

        <button
          onClick={() => {
            const clean = text.trim();
            if (!clean) return;
            const addTags = incognito ? Array.from(new Set([...tags, 'incognito'])) : tags;
            void onIngest(clean, addTags, effectivePrivacy);
            setText('');
            setTags([]);
          }}>
          save
        </button>
      </div>
    </div>
  );
}
