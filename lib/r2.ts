import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const DEFAULT_R2_ACCOUNT_ID = "cdc3d1bfef17f23cb453fe2737b2ede8";
const DEFAULT_R2_ACCESS_KEY_ID = "a15ba732cf75ed7cb171a095e794a479";
const DEFAULT_R2_SECRET_ACCESS_KEY =
  "4f09e1eb767175bf174301dfb41ea4c38c9aac8648aafb78d9914239d6a6093f";
const DEFAULT_R2_BUCKET_NAME = "scelta-makeup";

/** Dominio pubblico (CDN) del bucket R2 `scelta-makeup`. */
export const R2_PUBLIC_BASE_URL = "https://pub-4fbc134b2050432b8f5963ac1c49741a.r2.dev";

export function getR2Config() {
  const accountId = (process.env.R2_ACCOUNT_ID || DEFAULT_R2_ACCOUNT_ID).trim();
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || DEFAULT_R2_ACCESS_KEY_ID).trim();
  const secretAccessKey = (
    process.env.R2_SECRET_ACCESS_KEY || DEFAULT_R2_SECRET_ACCESS_KEY
  ).trim();
  const bucketName = (process.env.R2_BUCKET_NAME || DEFAULT_R2_BUCKET_NAME).trim();
  const publicUrl = (process.env.R2_PUBLIC_URL || R2_PUBLIC_BASE_URL).trim();

  return { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl };
}

/**
 * Risolve il path immagine di un prodotto verso il CDN R2.
 *
 * - `null`/`undefined`/stringa vuota -> logo brand locale.
 * - path locale `/products/<file>`   -> URL assoluto su R2.
 * - qualsiasi altro valore (URL assoluto, path locale) viene restituito invariato.
 */
export function resolveProductImageUrl(src?: string | null): string {
  if (!src) return "/brand/logo.png";
  if (src.startsWith("/products/")) {
    return `${R2_PUBLIC_BASE_URL}${src}`;
  }
  return src;
}

export function getR2Client(): S3Client {
  const { accountId, accessKeyId, secretAccessKey } = getR2Config();

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    forcePathStyle: true,
  });
}

/**
 * Carica un buffer direttamente su Cloudflare R2 nel bucket scelta-makeup.
 */
export async function uploadBufferToR2(params: {
  key: string;
  buffer: Buffer | Uint8Array;
  mimeType: string;
}): Promise<{ key: string; publicUrl?: string }> {
  const { bucketName, publicUrl } = getR2Config();
  const client = getR2Client();

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: params.key,
      Body: params.buffer,
      ContentType: params.mimeType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  const fullPublicUrl = publicUrl ? `${publicUrl.replace(/\/$/, "")}/${params.key}` : undefined;

  return {
    key: params.key,
    publicUrl: fullPublicUrl,
  };
}
