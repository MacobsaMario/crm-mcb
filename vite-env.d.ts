interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly VITE_MACOBSA_LOCAL_DEV_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}