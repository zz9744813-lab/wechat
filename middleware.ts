import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * 全局中间件 — 处理跨请求逻辑
 * - 安全头
 * - 基本路由保护
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // 安全头
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
