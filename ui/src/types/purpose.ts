export type PurposeSignal = 'alive' | 'dim' | 'lost';

export type Purpose = {
  id: string;
  statement: string;
  principles: string[];
  projects?: string[];
  last_check_ts?: string;
  signal: PurposeSignal;
};
