import { readFileSync } from 'node:fs';

/** Minimal .env.local reader for the standalone scripts (Next loads it itself). */
export function loadEnv(file = '.env.local') {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    console.error(`${file} नहीं मिली — .env.local.example से कॉपी करें।`);
    process.exit(1);
  }

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }

  if (!process.env.MYSQL_PASSWORD) {
    console.error('MYSQL_PASSWORD .env.local में सेट नहीं है।');
    process.exit(1);
  }
}

export function poolConfig() {
  return {
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    charset: 'utf8mb4',
    connectionLimit: 2,
  };
}
