import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

// 不含 script-src：Next 与编辑器依赖内联脚本，收紧它需要逐请求 nonce，另行处理。
const securityHeaders = [
  { key: 'Content-Security-Policy', value: "base-uri 'self'; form-action 'self'; frame-ancestors 'self'; object-src 'none'" },
  { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=(), payment=()' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
]

const nextConfig: NextConfig = {
  allowedDevOrigins: ['localhost', '127.0.0.1'],
  poweredByHeader: false,
  headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
  redirects() {
    return [
      { source: '/', destination: '/blog', permanent: true },
      { source: '/admin', destination: '/articles', permanent: false },
      { source: '/admin/:path*', destination: '/articles', permanent: false },
    ]
  },
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
