interface ImportMetaEnv {
  readonly VITE_KELLY_PASSWORD?: string;
  readonly VITE_BINKS_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
