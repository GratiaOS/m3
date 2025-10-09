import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ingest, retrieve, snapshot, exportThread, exportCSV, unlock, setPassphrase, getTimeline } from '@/api';
import { useProfile } from '@/state/profile';
import Composer from '@/components/Composer';
import Timeline, { mapEmotionToTimelineItem, sortNewest, dedupeById, type TimelineItem, type Emotion } from '@/components/Timeline';
import MemoryDrawer from '@/components/MemoryDrawer';
import EnergyPanel from '@/components/EnergyPanel';
import Radar from '@/components/Radar';
import BoundaryComposer from '@/components/BoundaryComposer';
import ReadinessBoard from '@/components/ReadinessBoard';
import StatusBar from '@/components/StatusBar';
import Dashboard from '@/components/Dashboard';
import ThanksPanel from '@/components/ThanksPanel';
import Modal from '@/components/Modal';
import SignalHandover from '@/components/QuickActions/SignalHandover';
import { PanicButton } from '@/components/PanicButton';
import Toaster, { toast } from '@/components/Toaster';
import { Button } from '@/ui/catalyst';
import './styles.css';
import BridgePanel from '@/components/BridgePanel';
import type { BridgeKindAlias } from '@/types/patterns';

// ---- Types to keep TS happy ----
type RetrievedChunk = {
  id: number;
  text: string;
  tags: string[];
  profile: string;
  ts: string; // server returns RFC3339 as string
  score: number;
};

type ExportResponse = { path: string; count: number };

export default function App() {
  const { me, setMe } = useProfile();
  const [chunks, setChunks] = useState<RetrievedChunk[]>([]);
  const [q, setQ] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [allProfiles, setAllProfiles] = useState(false);

  // Emotions state for Timeline
  const [emotions, setEmotions] = useState<TimelineItem[]>([]);

  // Load Timeline (server-backed) once on mount
  useEffect(() => {
    let cancelled = false;
    getTimeline(20)
      .then((items: TimelineItem[]) => {
        if (cancelled) return;
        const cleaned = dedupeById(sortNewest(items));
        setEmotions(cleaned);
      })
      .catch(() => {
        // ignore fetch/mapping errors to avoid UI noise
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Incognito modes
  const [incognito, setIncognito] = useState(false); // soft: save as sealed + add "incognito" tag
  const [hardIncog, setHardIncog] = useState(false); // hard: send x-incognito header -> server skips writes
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [showBridge, setShowBridge] = useState(false);
  const [bridgeHint, setBridgeHint] = useState<string | null>(null);
  const [chipPulse, setChipPulse] = useState(false);
  const [bridgeKind, setBridgeKind] = useState<BridgeKindAlias>('attachment_test');
  const [bridgeIntensity, setBridgeIntensity] = useState(0.6);
  const BRIDGE_LABELS: Record<string, string> = {
    attachment_test: 'Attachment',
    sibling_trust: 'Sibling',
    parent_planted: 'Parent',
    over_analysis: 'Over‑Analysis',
  };

  const searchRef = useRef<HTMLInputElement | null>(null);

  type RetrieveResponse = { chunks: RetrievedChunk[] };

  const doSearch = useCallback(
    async (overrideQ?: string) => {
      // Coerce empty → "*" (safer across server versions)
      const effectiveQ = (overrideQ ?? q).trim() || '*';
      const res = (await retrieve({
        query: effectiveQ,
        limit: 12,
        include_sealed: unlocked,
        profile: allProfiles ? undefined : me,
      })) as RetrieveResponse;
      setChunks(res.chunks ?? []);
    },
    [q, unlocked, me, allProfiles]
  );

  async function onIngest(text: string, tags: string[], privacy?: 'sealed' | 'public' | 'private') {
    const finalPrivacy: 'sealed' | 'public' | 'private' = incognito ? 'sealed' : privacy ?? 'public';
    const finalTags = incognito ? Array.from(new Set([...(tags || []), 'incognito'])) : tags || [];
    const headers: HeadersInit | undefined = hardIncog ? { 'x-incognito': '1' } : undefined;

    await ingest({ text, tags: finalTags, profile: me, privacy: finalPrivacy, importance: 1 }, headers);

    // If hard-incognito, nothing was saved; avoid confusing refresh
    if (!hardIncog) {
      // After ingest, reset query to show all notes
      setQ('');
      await doSearch('');
    }
  }

  // Auto-refresh every 10s (when tab is visible) and on unlock toggle
  useEffect(() => {
    // First load: fetch "all"
    doSearch('');
    const id = setInterval(() => {
      if (!document.hidden) doSearch('');
    }, 10_000);
    return () => clearInterval(id);
  }, [doSearch]);

  useEffect(() => {
    console.log('drawer chunks len=', chunks.length, chunks);
  }, [chunks]);

  // Keyboard shortcuts: i,u,l,r,/
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const typingInField = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (typingInField) return;

      if (e.key === 'i') setIncognito((v) => !v);
      else if (e.key === 'u') {
        const p = prompt('Unlock sealed notes');
        if (!p) return;
        unlock(p).then(() => {
          setUnlocked(true);
          doSearch();
        });
      } else if (e.key === 'l') {
        setUnlocked(false);
        alert('Locked (server key clears on restart)');
        doSearch(); // refresh to hide sealed immediately
      } else if (e.key === 'r') doSearch();
      else if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 'h') setHandoverOpen(true);
      else if (e.key === 'b') setShowBridge((v) => !v);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doSearch]);

  useEffect(() => {
    if (!chipPulse) return;
    const t = setTimeout(() => setChipPulse(false), 1000);
    return () => clearTimeout(t);
  }, [chipPulse]);

  return (
    <div style={{ fontFamily: 'system-ui', padding: 16, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>
          M3 Memory Core <small style={{ fontSize: 12, opacity: 0.6 }}>({unlocked ? 'unlocked' : 'locked'})</small>
        </h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* quick profile switcher (optional, tiny) */}
          <label style={{ fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }} title="current profile">
            me:
            <input value={me} onChange={(e) => setMe(e.target.value)} style={{ width: 96 }} />
          </label>
          <label style={{ fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }} title="include all profiles when retrieving">
            <input
              type="checkbox"
              checked={allProfiles}
              onChange={(e) => {
                setAllProfiles(e.target.checked);
                // kick a refresh immediately when toggled
                setTimeout(() => {
                  void doSearch('');
                }, 0);
              }}
            />
            all
          </label>
          {incognito && (
            <div className="incognito-banner" title="Composer → sealed + tag: incognito">
              🕶️ Incognito
            </div>
          )}
          <label style={{ fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={incognito} onChange={(e) => setIncognito(e.target.checked)} />
            Incognito (sealed write)
          </label>
          <label style={{ fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={hardIncog} onChange={(e) => setHardIncog(e.target.checked)} />
            Hard Incognito (no writes)
          </label>
          <PanicButton />
          <Button plain onClick={() => setShowBridge(true)} title="b">
            bridge
          </Button>
          <span
            title={bridgeHint || 'current bridge pattern'}
            style={{
              fontSize: 12,
              padding: '2px 6px',
              border: '1px solid var(--border, #333)',
              borderRadius: 6,
              opacity: 0.85,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              transition: 'box-shadow 200ms ease, border-color 200ms ease, background-color 200ms ease',
              ...(chipPulse
                ? {
                    borderColor: '#6ee7b7',
                    boxShadow: '0 0 0 3px rgba(110, 231, 183, 0.35)',
                    backgroundColor: 'rgba(110, 231, 183, 0.10)',
                  }
                : null),
            }}>
            {BRIDGE_LABELS[bridgeKind] || bridgeKind} · {bridgeIntensity.toFixed(2)}
          </span>
        </div>
      </div>

      <Dashboard />

      <ThanksPanel me={me} />
      <Timeline items={emotions} />

      <Composer onIngest={onIngest} incognito={incognito} />

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="search... (press / to focus)" />
        <Button plain onClick={() => void doSearch('')} title="r">
          retrieve
        </Button>
        <Button plain onClick={() => snapshot()}>
          snapshot
        </Button>
        <Button
          onClick={async () => {
            const r = (await exportThread()) as ExportResponse;
            alert(`exported ${r.count} → ${r.path}`);
          }}
          plain>
          export → md
        </Button>
        <Button
          onClick={async () => {
            const r = (await exportCSV()) as ExportResponse;
            alert(`exported CSV → ${r.path}`);
          }}
          plain>
          export → csv
        </Button>
        <Button
          onClick={async () => {
            const p = prompt('Set new passphrase');
            if (!p) return;
            await setPassphrase(p);
            setUnlocked(true);
            alert('Passphrase set & unlocked');
          }}
          plain>
          set passphrase
        </Button>
        <Button
          onClick={async () => {
            const p = prompt('Unlock sealed notes');
            if (!p) return;
            await unlock(p);
            setUnlocked(true);
            doSearch();
          }}
          title="u"
          plain>
          unlock sealed
        </Button>
        <Button
          onClick={() => {
            setUnlocked(false);
            alert('Locked (restart server to hard lock)');
            doSearch(); // refresh to hide sealed immediately
          }}
          title="l"
          plain>
          lock
        </Button>
        <Button plain onClick={() => setHandoverOpen(true)}>
          handover
        </Button>
      </div>

      <div className={incognito ? 'blur-when-incognito' : ''}>
        <MemoryDrawer chunks={chunks} unlocked={unlocked} />
      </div>

      {/* EnergyPanel now typed to accept chunks */}
      <EnergyPanel chunks={chunks} />

      <Radar query={q} includeSealed={unlocked} />
      <BoundaryComposer to="sister.exe" />
      <ReadinessBoard />
      <StatusBar />
      <Modal open={handoverOpen} onClose={() => setHandoverOpen(false)} title="Signal Handover">
        <SignalHandover
          onClose={() => {
            setHandoverOpen(false);
            doSearch();
          }}
          defaultTags={['handover_session']}
        />
      </Modal>
      <Modal open={showBridge} onClose={() => setShowBridge(false)} title="Bridge Suggest">
        <BridgePanel
          kind={bridgeKind}
          intensity={bridgeIntensity}
          onKind={setBridgeKind}
          onIntensity={setBridgeIntensity}
          onSuggestion={(s) => {
            setBridgeHint(s?.hint ?? null);
            setChipPulse(true);
          }}
        />
      </Modal>
      <Toaster />
    </div>
  );
}
