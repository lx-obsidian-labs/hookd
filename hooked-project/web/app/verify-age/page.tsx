import { VerifyAgeClient } from "./verify-age-client";

type VerifyAgePageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function VerifyAgePage({ searchParams }: VerifyAgePageProps) {
  const params = await searchParams;
  return <VerifyAgeClient initialNextPath={params.next ?? "/wallet"} />;
}
