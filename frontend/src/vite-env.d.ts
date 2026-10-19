/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SIMPLE_DOMAIN_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
