/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/job-board",
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: "/job-board",
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/job-board",
        permanent: false,
        basePath: false, // match root without basePath to avoid loops
      },
    ];
  },
  async rewrites() {
    const rewrites = [
      {
        source: "/ph/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
    ];

    return rewrites;
  },
};

export default nextConfig;
