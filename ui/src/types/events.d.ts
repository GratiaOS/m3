declare global {
  interface CodexSealDetail {
    text: string;
    at?: number;
    depth?: 'soft' | 'deep';
    scene?: string;
    tags?: string[];
  }
  interface WindowEventMap {
    'boundary:formed': CustomEvent<{
      incoming: string;
      rewrite?: string;
      classification: 'constant' | 'variable';
      microAct?: string;
      body?: import('@/flows/value/gratitudeTokens').BodySignal;
    }>;
    'codex:seal': CustomEvent<CodexSealDetail>;
  }
  interface DocumentEventMap {
    'codex:seal': CustomEvent<CodexSealDetail>;
  }
}

export {};
