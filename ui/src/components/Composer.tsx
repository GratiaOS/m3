import React, { useEffect, useState } from 'react';
import { fetchReply, createTell } from '@/api';
import { useReversePoles } from '@/state/reversePoles';

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
  const { enabled: reversePolesEnabled } = useReversePoles();
  const [privacy, setPrivacy] = useState<Privacy>(reversePolesEnabled ? 'sealed' : 'public');
  const [doors, setDoors] = useState<string[] | null>(null);
  const [nudge, setNudge] = useState<string | null>(null);

  async function doIngest() {
    const clean = text.trim();
    if (!clean) return;
    const addTags = incognito ? Array.from(new Set([...tags, 'incognito'])) : tags;
    await onIngest(clean, addTags, effectivePrivacy);

    // now try to get a reply/nudge
    try {
      const r = await fetchReply(clean);
      if (r) {
        setNudge(r.text);
        // server now returns `actions?: string[]`
        setDoors(r.actions?.slice(0, 2) ?? null);
      } else {
        setNudge(null);
        setDoors(null);
      }
    } catch {
      setNudge(null);
      setDoors(null);
    }

    // clear composer after we’ve asked for a nudge
    setText('');
    setTags([]);
  }

  function toggle(t: string) {
    setTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));
  }

  const effectivePrivacy: Privacy = incognito ? 'sealed' : privacy;

  useEffect(() => {
    if (incognito) return;
    if (reversePolesEnabled) {
      setPrivacy('sealed');
    } else {
      setPrivacy((prev) => (prev === 'sealed' ? 'public' : prev));
    }
  }, [incognito, reversePolesEnabled]);

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

        <button onClick={doIngest}>save</button>
      </div>

      {nudge && (
        <div style={{ marginTop: 8, padding: 8, border: '1px solid #ccc', borderRadius: 6 }}>
          <div style={{ fontSize: 13, marginBottom: 4, whiteSpace: 'pre-wrap' }}>{nudge}</div>
          {doors && doors.length > 0 && (
            <div style={{ display: 'flex', gap: 6 }}>
              {doors.map((d, i) => (
                <button
                  key={`${d}-${i}`}
                  onClick={() =>
                    createTell({
                      node: 'nudge',
                      pre_activation: '', // optional: include a snippet/hash of `clean`
                      action: d,
                    }).catch(() => {})
                  }>
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
