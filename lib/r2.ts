import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { R2_PUBLIC_BASE_URL } from "./r2Public";

// Gli helper client-safe (risoluzione URL immagini, filtri segnaposto) vivono in
// `lib/r2Public.ts`, libero da `@aws-sdk` e da chiavi. Riesportati qui per non
// rompere i consumer esistenti che importano da `@/lib/r2`.
export {
  R2_PUBLIC_BASE_URL,
  resolveProductImageUrl,
  isPlaceholderImage,
  safeImageSrc,
} from "./r2Public";

const DEFAULT_R2_BUCKET_NAME = "scelta-makeup";

export function getR2Config() {
  const accountId = (process.env.R2_ACCOUNT_ID ?? "").trim();
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID ?? "").trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY ?? "").trim();
  const bucketName = (process.env.R2_BUCKET_NAME || DEFAULT_R2_BUCKET_NAME).trim();
  const publicUrl = (process.env.R2_PUBLIC_URL || R2_PUBLIC_BASE_URL).trim();

  const missing = [
    !accountId && "R2_ACCOUNT_ID",
    !accessKeyId && "R2_ACCESS_KEY_ID",
    !secretAccessKey && "R2_SECRET_ACCESS_KEY",
  ].filter(Boolean);
  if (missing.length > 0) {
    throw new Error(
      `[r2] Variabili d'ambiente mancanti: ${missing.join(", ")}. ` +
        "Configurarle nell'ambiente di deploy prima di usare il client R2."
    );
  }

  return { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl };
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
