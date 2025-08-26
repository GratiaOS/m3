import React from 'react';

export type Chunk = {
  id: number;
  ts: string; // ISO 8601 from server
  profile?: string;
  score?: number;
  text: string;
  tags?: string[];
};

type Props = { chunks: Chunk[]; append?: boolean; unlocked: boolean }; // unlocked = sealed visible?

function fmtTs(ts: string) {
  const d = new Date(ts);
  return isNaN(d.getTime()) ? ts : d.toLocaleString();
}

function Score({ v }: { v?: number }) {
  if (v == null) return null;
  return <span> · score {v.toFixed(2)}</span>;
}

const Row: React.FC<{ c: Chunk; unlocked: boolean }> = ({ c, unlocked }) => {
  // consider a note "sealed" if it's tagged incognito AND session is locked
  const hasSealTag = Array.isArray(c.tags) && c.tags.includes('incognito');
  const sealed = hasSealTag && !unlocked;
  const tags = Array.isArray(c.tags) ? c.tags : [];
  return (
    <li
      style={{
        padding: '10px 0',
        borderBottom: '1px dashed #eee',
        display: 'grid',
        gap: 4,
      }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>
        {fmtTs(c.ts)} · {c.profile || 'anon'}
        <Score v={c.score} />
      </div>

      <div
        style={{
          color: sealed ? '#667' : '#111',
          fontStyle: sealed ? ('italic' as const) : 'normal',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
        }}
        title={sealed ? 'Unlock to view sealed content' : undefined}>
        {sealed ? '(sealed)' : c.text}
      </div>

      {(tags.length > 0 || hasSealTag) && (
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          {tags.join(' · ')}
          {hasSealTag && (
            <>
              {tags.length ? ' · ' : ''}
              {unlocked ? 'unsealed' : 'sealed'}
            </>
          )}
        </div>
      )}
    </li>
  );
};

const MemoryDrawer: React.FC<Props> = ({ chunks, unlocked }) => {
  // Pure view: sort newest first; parent controls pagination/aggregation.
  const list = React.useMemo(
    () =>
      [...chunks].sort((a, b) => {
        const ta = Date.parse(a.ts);
        const tb = Date.parse(b.ts);
        return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta);
      }),
    [chunks]
  );

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}>
        <h3 style={{ margin: 0 }}>Memory</h3>
        <div style={{ fontSize: 12, opacity: 0.6 }}>
          {list.length} item{list.length === 1 ? '' : 's'}
        </div>
      </div>

      {list.length === 0 ? (
        <div style={{ padding: '12px 0', fontSize: 13, opacity: 0.7 }}>
          Nothing here yet. Ingest a note, then hit <em>retrieve</em>.
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {list.map((c) => (
            <Row key={c.id} c={c} unlocked={unlocked} />
          ))}
        </ul>
      )}
    </div>
  );
};

export default React.memo(MemoryDrawer);
