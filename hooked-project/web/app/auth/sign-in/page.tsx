import { SignInClient } from "./sign-in-client";

type SignInPageProps = {
  searchParams: Promise<{ next?: string; magic?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  return (
    <SignInClient
      initialNextPath={params.next ?? "/dashboard"}
      initialMessage={params.magic === "invalid" ? "Magic link is invalid or expired." : ""}
    />
  );
}
