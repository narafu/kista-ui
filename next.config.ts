import type {NextConfig} from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /* 도커 빌드를 위한 standalone 설정 */
  output: "standalone",
};

export default nextConfig;
