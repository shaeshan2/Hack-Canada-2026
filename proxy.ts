import { NextResponse } from "next/server";
import { auth0 } from "./lib/auth0";

export async function proxy(request: Request) {
  try {
    return await auth0.middleware(request);
  } catch {
    // Session cookie is malformed or tampered — pass the request through
    // without auth context so the route's own auth guard can return a clean 401.
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
