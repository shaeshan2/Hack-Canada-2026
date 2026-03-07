import type { GetServerSidePropsContext } from "next";

// Custom signup form removed — Auth0 Universal Login handles signup.
// /signup/buyer  → /api/auth/signup-buyer  (sets intent cookie → Auth0 signup)
// /signup/seller → /api/auth/signup-seller (sets intent cookie → Auth0 signup)
export default function SignupRedirect() {
  return null;
}

export function getServerSideProps(context: GetServerSidePropsContext) {
  const role = context.params?.role;
  const destination =
    role === "seller" ? "/api/auth/signup-seller" : "/api/auth/signup-buyer";
  return { redirect: { destination, permanent: false } };
}
