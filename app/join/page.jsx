import { redirect } from "next/navigation";

export const metadata = {
  title: "Join Kogno",
  description: "Join Kogno and start your learning journey",
};

export default async function JoinPage({ searchParams }) {
  const params = await searchParams;
  const ref = params?.ref;

  // Redirect to create account with referral code preserved
  if (ref) {
    redirect(`/auth/create-account?ref=${encodeURIComponent(ref)}`);
  } else {
    redirect("/auth/create-account");
  }
}
