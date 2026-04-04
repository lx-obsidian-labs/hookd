import { SignInClient } from "./sign-in-client";
import { sanitizeNextPath } from "@/lib/safe-next-path";

type SignInPageProps = {
  searchParams: Promise<{ next?: string; magic?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const safeNextPath = sanitizeNextPath(params.next, "/dashboard");
  return (
    <SignInClient
      initialNextPath={safeNextPath}
      initialMessage={params.magic === "invalid" ? "Magic link is invalid or expired." : ""}
    />
  );
}
