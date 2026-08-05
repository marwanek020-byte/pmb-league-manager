import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Every request to /manager/* and /admin/* is checked here, server-side,
// on every navigation - including direct URL edits. Manager pages never
// take a club id from the URL, so there is nothing for a manager to edit
// in the address bar to reach another club's data; access is always
// derived from their own session.
export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  const isAdminRoute = nextUrl.pathname.startsWith("/admin");
  const isManagerRoute = nextUrl.pathname.startsWith("/manager");

  if (!isLoggedIn && (isAdminRoute || isManagerRoute)) {
    const loginUrl = new URL("/login", nextUrl);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn) {
    if (isAdminRoute && role !== "ADMINISTRATOR") {
      return NextResponse.redirect(new URL("/unauthorized", nextUrl));
    }
    if (isManagerRoute && role !== "CLUB_MANAGER") {
      return NextResponse.redirect(new URL("/unauthorized", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/manager/:path*", "/admin/:path*"],
};
