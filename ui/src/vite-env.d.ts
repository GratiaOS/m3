/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  // add other vars here if needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
