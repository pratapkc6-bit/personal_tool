import { NextRequest, NextResponse } from "next/server";

const PRODUCTION_HOST = "pratap-personal-secretary-ksuyanpks-projects.vercel.app";

export function middleware(request: NextRequest) {
  if (process.env.VERCEL_ENV !== "production") {
    return NextResponse.next();
  }

  const host = request.headers.get("host");
  if (!host || host === PRODUCTION_HOST) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.protocol = "https:";
  url.host = PRODUCTION_HOST;

  return NextResponse.redirect(url, 307);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
