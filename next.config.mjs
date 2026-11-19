/** @type {import('next').NextConfig} */
const remote = [];
if (process.env.STORAGE_PUBLIC_URL) {
  try {
    const u = new URL(process.env.STORAGE_PUBLIC_URL);
    remote.push({ protocol: u.protocol.replace(':', ''), hostname: u.hostname });
  } catch {}
}
const nextConfig = {
  images: { remotePatterns: remote },
  experimental: { serverActions: { bodySizeLimit: '8mb' } },
  poweredByHeader: false,
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }];
  },
};
export default nextConfig;
