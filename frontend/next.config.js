/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
    optimizePackageImports: [
      "react-icons",
      "lucide-react",
      "date-fns",
      "react-daisyui",
      "formik",
      "yup",
    ],
  },
  images: {
    remotePatterns: [
      { hostname: "clearlink-official.vercel.app", protocol: "https" },
      {
        hostname: "tiaago.b-cdn.net",
        protocol: "https",
      },
      {
        hostname: "tiaago-prod-storage.b-cdn.net",
        protocol: "https",
      },
      {
        hostname: "talentsync-backend-bucket.s3.amazonaws.com",
        protocol: "https",
      },
      {
        hostname: "tiaago.s3.amazonaws.com",
        protocol: "https",
      },
      {
        hostname: "tiaago-v2-backend.onrender.com",
        protocol: "https",
      },
      {
        hostname: "stgng-api.tiaago.com",
        protocol: "https",
      },
      {
        hostname: "res.cloudinary.com",
        protocol: "https",
      },
      { hostname: "flagcdn.com", protocol: "https" },
      { hostname: "images.pexels.com", protocol: "https" },
    ],
  },
};

module.exports = nextConfig;
