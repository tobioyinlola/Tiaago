/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
    // Support-ticket attachments are Server Action arguments (see
    // submitTicket in app/common/services/support.ts), so they're subject to
    // Next's own body-size guard -- default 1MB -- independent of the
    // backend's 10MB/file, 3-file cap (backend/support/serializers.py).
    // Without this override, any attachment over ~1MB fails before the
    // request ever reaches Django.
    serverActions: {
      bodySizeLimit: "30mb",
    },
    optimizePackageImports: [
      "react-icons",
      "lucide-react",
      "date-fns",

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
        hostname: "tiaago-uploads.s3.eu-west-3.amazonaws.com",
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
      { hostname: "localhost", port: "8000", protocol: "http" },
    ],
  },
};

module.exports = nextConfig;
