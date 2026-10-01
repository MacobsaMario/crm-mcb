declare module "cloudflare:workers" {
  export const env: {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ASSETS?: Fetcher;
    CEO_PRESENTATION_PIN?: string;
    CEO_PRESENTATION_SIGNING_SECRET?: string;
    MACOBSA_IMPORT_SECRET?: string;
    [binding: string]: unknown;
  };
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T = unknown>(): Promise<D1Result<T>>;
}

interface D1Result<T = unknown> {
  results?: T[];
  success?: boolean;
  error?: string;
}

interface R2Bucket {
  get(key: string): Promise<R2ObjectBody | null>;
  head(key: string): Promise<R2Object | null>;
  put(...args: any[]): Promise<R2Object>;
  delete(key: string): Promise<void>;
}

interface R2Object {
  etag: string;
  uploaded: Date;
  size: number;
  httpMetadata?: { contentType?: string };
  customMetadata?: Record<string, string>;
}

interface R2ObjectBody extends R2Object {
  body: ReadableStream<Uint8Array>;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
}

interface Fetcher {
  fetch(request: Request): Promise<Response>;
}