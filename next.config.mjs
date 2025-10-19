/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["discord.js", "@discordjs/voice"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        "discord.js": "commonjs discord.js",
        "@discordjs/voice": "commonjs @discordjs/voice",
        "libsodium-wrappers": "commonjs libsodium-wrappers",
      })
    }
    return config
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
