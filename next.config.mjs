/** @type {import('next').NextConfig} */
const nextConfig = {
	api: {
		bodyParser: {
			sizeLimit: "10gb",
		},
	},
};

export default nextConfig;
