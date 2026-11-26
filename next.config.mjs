/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/about",
        destination: "/about-us",
        permanent: true,
      },
      {
        source: "/contact",
        destination: "/contact-us",
        permanent: true,
      },
      {
        source: "/terms",
        destination: "/terms-and-conditions",
        permanent: true,
      },
      {
        source: "/privacy",
        destination: "/privacy-policy",
        permanent: true,
      },
      {
        source: "/refund",
        destination: "/refund-and-cancellation-policy",
        permanent: true,
      },
      {
        source: "/refund-policy",
        destination: "/refund-and-cancellation-policy",
        permanent: true,
      },
      {
        source: "/cancellation-policy",
        destination: "/refund-and-cancellation-policy",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
