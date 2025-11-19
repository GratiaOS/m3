import { markBreathTheirs } from './breathGame';
import { spiritHue$ } from './spiritChord';
import { trace$ } from './traceRecorder';
import { startGhostPartner, stopGhostPartner } from './ghostPartner';

let timeouts: ReturnType<typeof setTimeout>[] = [];
let looping = false;
let ghostPaused = false;

const clearAll = () => {
  timeouts.forEach(clearTimeout);
  timeouts = [];
};

export function playTraceGhost() {
  const trace = trace$.value;
  if (trace.length === 0) return;
  stopTraceGhost();
  stopGhostPartner();
  ghostPaused = true;
  looping = true;

  const schedule = () => {
    trace.forEach((event) => {
      const drift = (Math.random() - 0.5) * 150;
      const id = setTimeout(() => {
        markBreathTheirs(event.breath as any);
        spiritHue$.set(event.hue);
      }, event.t + drift);
      timeouts.push(id);
    });

    const total = trace[trace.length - 1].t + 300;
    const loopId = setTimeout(() => {
      if (looping) schedule();
    }, total);
    timeouts.push(loopId);
  };

  schedule();
}

export function stopTraceGhost() {
  looping = false;
  clearAll();
  if (ghostPaused) {
    startGhostPartner();
    ghostPaused = false;
  }
}
