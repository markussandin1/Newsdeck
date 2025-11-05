/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable TypeScript and ESLint checks during build in Docker
  // (we'll run these separately in CI/CD)
  typescript: {
    ignoreBuildErrors: process.env.DOCKER_BUILD === 'true',
  },
  eslint: {
    ignoreDuringBuilds: process.env.DOCKER_BUILD === 'true',
  },
  // Enable instrumentation for secret initialization
  experimental: {
    instrumentationHook: true,
  },
}

module.exports = nextConfig
