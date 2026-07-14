/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fully static: emit a plain HTML/JS bundle with no server runtime.
  // Works on Vercel and any static host.
  output: "export",
  reactStrictMode: true,
  images: { unoptimized: true },
};

export default nextConfig;
