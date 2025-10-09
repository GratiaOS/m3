export type CanonicalBridgeKind = 'attachment_test' | 'sibling_trust' | 'parent_planted' | 'over_analysis';

export type BridgeKindAlias =
  | CanonicalBridgeKind
  | 'attachment-testing'
  | 'attachment'
  | 'sibling-trust'
  | 'sibling'
  | 'parent-planted'
  | 'parent'
  | 'over-analysis'
  | 'analysis';

export interface BridgeSuggestion {
  pattern: string;
  hint: string;
  breath?: string;
  doorway?: string;
  anchor?: string;
}

export function normalizeBridgeKind(k: BridgeKindAlias): CanonicalBridgeKind {
  const s = String(k).toLowerCase().replace(/\s+/g, '_');
  if (s.includes('attachment')) return 'attachment_test';
  if (s.includes('sibling')) return 'sibling_trust';
  if (s.includes('parent')) return 'parent_planted';
  if (s.includes('analysis')) return 'over_analysis';
  return 'over_analysis';
}
