import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

type BackblazeSettings = {
  bucket: string;
  region: string;
  endpoint: string;
  keyId: string;
  applicationKey: string;
};

function settings(): BackblazeSettings {
  const region = process.env.B2_REGION;
  const value = {
    bucket: process.env.B2_BUCKET,
    region,
    endpoint: process.env.B2_ENDPOINT || (region ? `https://s3.${region}.backblazeb2.com` : undefined),
    keyId: process.env.B2_KEY_ID,
    applicationKey: process.env.B2_APPLICATION_KEY,
  };
  if (!value.bucket || !value.region || !value.endpoint || !value.keyId || !value.applicationKey) {
    throw new Error("Configure B2_BUCKET, B2_REGION, B2_KEY_ID and B2_APPLICATION_KEY.");
  }
  return value as BackblazeSettings;
}

function createClient(config: BackblazeSettings) {
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.keyId,
      secretAccessKey: config.applicationKey,
    },
  });
}

let cachedSettings: BackblazeSettings | undefined;
let cachedClient: S3Client | undefined;

function clientAndBucket() {
  const config = settings();
  if (!cachedClient || !cachedSettings || Object.keys(config).some((key) =>
    config[key as keyof BackblazeSettings] !== cachedSettings?.[key as keyof BackblazeSettings])) {
    cachedSettings = config;
    cachedClient = createClient(config);
  }
  return { client: cachedClient, bucket: config.bucket };
}

function isMissingObject(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const value = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return value.name === "NoSuchKey" || value.name === "NotFound" || value.$metadata?.httpStatusCode === 404;
}

function objectMetadata(value: {
  size?: number;
  etag?: string;
  uploaded?: Date;
  contentType?: string;
  customMetadata?: Record<string, string>;
}) {
  return {
    size: value.size ?? 0,
    etag: value.etag ?? "",
    uploaded: value.uploaded ?? new Date(),
    httpMetadata: { contentType: value.contentType },
    customMetadata: value.customMetadata,
  };
}

async function bodyBytes(value: unknown): Promise<Uint8Array> {
  if (typeof value === "string") return new TextEncoder().encode(value);
  if (value instanceof Uint8Array) return Uint8Array.from(value);
  if (value instanceof ArrayBuffer) return new Uint8Array(value.slice(0));
  if (value instanceof Blob) return new Uint8Array(await value.arrayBuffer());
  if (value instanceof ReadableStream) return new Uint8Array(await new Response(value).arrayBuffer());
  throw new TypeError("Unsupported Backblaze upload body.");
}

export function getBackblazeBucket(): R2Bucket {
  return {
    async get(key) {
      const { client, bucket } = clientAndBucket();
      try {
        const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        if (!result.Body) return null;
        const bytes = Uint8Array.from(await result.Body.transformToByteArray());
        return {
          ...objectMetadata({
            size: result.ContentLength ?? bytes.byteLength,
            etag: result.ETag,
            uploaded: result.LastModified,
            contentType: result.ContentType,
            customMetadata: result.Metadata,
          }),
          body: new Response(bytes).body!,
          async arrayBuffer() {
            return Uint8Array.from(bytes).buffer;
          },
          async text() {
            return new TextDecoder().decode(bytes);
          },
        };
      } catch (error) {
        if (isMissingObject(error)) return null;
        throw error;
      }
    },
    async head(key) {
      const { client, bucket } = clientAndBucket();
      try {
        const result = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        return objectMetadata({
          size: result.ContentLength,
          etag: result.ETag,
          uploaded: result.LastModified,
          contentType: result.ContentType,
          customMetadata: result.Metadata,
        });
      } catch (error) {
        if (isMissingObject(error)) return null;
        throw error;
      }
    },
    async put(key, body, options = {}) {
      const { client, bucket } = clientAndBucket();
      const bytes = await bodyBytes(body);
      const result = await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: bytes,
        ContentType: options.httpMetadata?.contentType,
        Metadata: options.customMetadata,
      }));
      return objectMetadata({ size: bytes.byteLength, etag: result.ETag });
    },
    async delete(key) {
      const { client, bucket } = clientAndBucket();
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}