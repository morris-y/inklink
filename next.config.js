/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    styledComponents: true,
  },
  // Required to enable instrumentation.ts (startup ingest hook)
  experimental: {
    instrumentationHook: true,
  },
}

module.exports = nextConfig
