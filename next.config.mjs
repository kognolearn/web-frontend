/** @type {import('next').NextConfig} */
const backendUrl = process.env.BACKEND_API_URL || "http://localhost:5001";

const nextConfig = {
	api: {
		bodyParser: {
			sizeLimit: "10gb",
		},
	},
	// Provide sane defaults for local development without requiring env files.
	env: {
		BACKEND_API_URL: backendUrl,
		ONBOARDING_USE_MOCKS:
			process.env.ONBOARDING_USE_MOCKS ??
			(process.env.NODE_ENV === "production" ? "false" : "true"),
	},
};

export default nextConfig;
