import { redirect } from "next/navigation";

export default function SignUpPage({ searchParams }) {
  const redirectTo = searchParams?.redirectTo;
  const target = redirectTo
    ? `/auth/create-account?redirectTo=${encodeURIComponent(redirectTo)}`
    : "/auth/create-account";
  redirect(target);
}
