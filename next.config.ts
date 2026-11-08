import type {NextConfig} from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /* 도커 빌드를 위한 standalone 설정 */
  output: "standalone",
  // 배포 버전 — 빌드와 다른 서버를 만난 탭이 청크 404 대신 전체 새로고침으로 복구한다(로컬은 미설정)
  deploymentId: process.env.DEPLOYMENT_VERSION || undefined,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
