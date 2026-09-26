const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const client = new S3Client({
  region: 'auto',
  endpoint: 'https://cdc3d1bfef17f23cb453fe2737b2ede8.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: 'a15ba732cf75ed7cb171a095e794a479',
    secretAccessKey: '4f09e1eb767175bf174301dfb41ea4c38c9aac8648aafb78d9914239d6a6093f',
  }
});

const BUCKET = 'scelta-makeup';
const R2_PUBLIC = 'https://pub-4fbc134b2050432b8f5963ac1c49741a.r2.dev';

function getMime(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.gif') return 'image/gif';
  return 'application/octet-stream';
}

async function uploadFile(localPath, r2Key) {
  const buffer = fs.readFileSync(localPath);
  const mime = getMime(localPath);
  await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: r2Key,
    Body: buffer,
    ContentType: mime,
    CacheControl: 'public, max-age=31536000, immutable'
  }));
}

async function syncDirectory(localDir, r2Prefix) {
  if (!fs.existsSync(localDir)) return { success: 0, errors: 0 };
  const entries = fs.readdirSync(localDir, { withFileTypes: true });
  const files = entries.filter(e => e.isFile()).map(e => e.name);
  console.log(`\n📦 Sincronizzazione ${localDir} -> ${BUCKET}/${r2Prefix} (${files.length} file)...`);

  let success = 0;
  let errors = 0;
  const concurrency = 16;
  const queue = [...files];

  async function worker() {
    while (queue.length > 0) {
      const file = queue.shift();
      if (!file) break;
      const localPath = path.join(localDir, file);
      const r2Key = r2Prefix + file;
      try {
        await uploadFile(localPath, r2Key);
        success++;
        if (success % 50 === 0 || success === files.length) {
          process.stdout.write(`  [${success}/${files.length}] caricati...\r`);
        }
      } catch (err) {
        errors++;
        console.error(`\n❌ Errore caricamento ${file}:`, err.message);
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  console.log(`\n✅ Completato ${localDir}: ${success} caricati con successo, ${errors} errori.`);
  return { success, errors };
}

async function run() {
  console.log('🚀 Avvio sincronizzazione massiva su Cloudflare R2...');
  console.log(`Bucket: ${BUCKET}`);
  console.log(`CDN URL: ${R2_PUBLIC}`);

  const start = Date.now();
  const prodRes = await syncDirectory('public/products', 'products/');
  const brandRes = await syncDirectory('public/brand', 'brand/');

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log('\n============================================================');
  console.log(`🏁 SINCRONIZZAZIONE R2 TERMINATA IN ${elapsed}s`);
  console.log(`• Prodotti: ${prodRes.success} caricati (${prodRes.errors} errori)`);
  console.log(`• Brand: ${brandRes.success} caricati (${brandRes.errors} errori)`);
  console.log('============================================================\n');
}

run().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
