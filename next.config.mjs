import bundleAnalyzer from "@next/bundle-analyzer";

/** @type {import('next').NextConfig} */
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:5001";
const withBundleAnalyzer = bundleAnalyzer({
	enabled: process.env.ANALYZE === "true",
});

const nextBodyLimit = process.env.NEXT_BODY_LIMIT || "10mb";

const nextConfig = {
	api: {
		bodyParser: {
			sizeLimit: nextBodyLimit,
		},
	},
	experimental: {
		optimizePackageImports: ["lucide-react", "framer-motion"],
	},
	// Provide sane defaults for local development without requiring env files.
	env: {
		NEXT_PUBLIC_BACKEND_API_URL: backendUrl,
		ONBOARDING_USE_MOCKS:
			process.env.ONBOARDING_USE_MOCKS ??
			(process.env.NODE_ENV === "production" ? "false" : "true"),
	},

	// Image optimization for better performance
	images: {
		formats: ["image/avif", "image/webp"],
		deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
		imageSizes: [16, 32, 48, 64, 96, 128, 256],
		minimumCacheTTL: 60 * 60 * 24, // 24 hours
	},

	// Security and performance headers
	async headers() {
		return [
			{
				// Apply to all routes
				source: "/:path*",
				headers: [
					{
						key: "X-Content-Type-Options",
						value: "nosniff",
					},
					{
						key: "X-Frame-Options",
						value: "DENY",
					},
					{
						key: "X-XSS-Protection",
						value: "1; mode=block",
					},
					{
						key: "Referrer-Policy",
						value: "strict-origin-when-cross-origin",
					},
				],
			},
			{
				// Cache static assets for 1 year
				source: "/images/:path*",
				headers: [
					{
						key: "Cache-Control",
						value: "public, max-age=31536000, immutable",
					},
				],
			},
			{
				// Cache fonts for 1 year
				source: "/fonts/:path*",
				headers: [
					{
						key: "Cache-Control",
						value: "public, max-age=31536000, immutable",
					},
				],
			},
		];
	},
};

export default withBundleAnalyzer(nextConfig);
