/** @type {import('next').NextConfig} */
const nextConfig = {
	api: {
		bodyParser: {
			sizeLimit: "10gb",
		},
	},
	// Provide sane defaults for local development without requiring env files.
	env: {
		BACKEND_API_URL: process.env.BACKEND_API_URL || "http://localhost:5000",
		API_BASE_URL: process.env.API_BASE_URL || "http://localhost:5000",
	},
};

export default nextConfig;
