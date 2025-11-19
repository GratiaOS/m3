type PadId = string;

type SetPadSceneOptions = {
  replace?: boolean;
  announce?: string;
};

let announceFn: ((message: string) => void) | null = null;

const sendAnnounce = (message?: string) => {
  if (!message) return;
  if (announceFn) {
    announceFn(message);
    return;
  }
  import('./srAnnouncer')
    .then((mod) => {
      announceFn = mod.announce ?? null;
      announceFn?.(message);
    })
    .catch(() => {});
};

const dispatchHashChange = () => {
  if (typeof window === 'undefined') return;
  const evt =
    typeof HashChangeEvent === 'function' ? new HashChangeEvent('hashchange') : new Event('hashchange');
  window.dispatchEvent(evt);
};

export function setPadScene(pad: PadId, scene?: string, opts?: SetPadSceneOptions) {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams();
  params.set('pad', pad);
  if (scene) params.set('scene', scene);

  const nextHash = `#${params.toString()}`;
  const same = window.location.hash === nextHash;

  if (!same) {
    if (opts?.replace && typeof window.history !== 'undefined' && window.history.replaceState) {
      window.history.replaceState(null, '', nextHash);
    } else {
      window.location.hash = nextHash;
    }
  }

  dispatchHashChange();

  if (opts?.announce) {
    sendAnnounce(opts.announce);
  }
}
