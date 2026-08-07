/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // `next build` into the same .next/ that `next dev` is serving wipes the dev
  // server's chunks and forces a full recompile on the next reload. Build with
  // NEXT_DIST_DIR=.next-build to keep the two apart.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Native module — webpack must not try to bundle it.
  experimental: { serverComponentsExternalPackages: ['better-sqlite3'] },
};

export default nextConfig;
