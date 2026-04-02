import Link from "next/link";

type PreviewGateProps = {
  title: string;
  body: string;
};

export function PreviewGate({ title, body }: PreviewGateProps) {
  return (
    <div className="glass-panel mb-4 rounded-2xl border border-amber-300/30 bg-amber-400/10 p-5 text-sm text-amber-100">
      <p className="font-semibold text-amber-100">{title}</p>
      <p className="mt-2 text-amber-100/90">{body}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href="/auth/sign-in" className="underline">
          Sign in to unlock
        </Link>
        <span className="text-amber-100/70">or</span>
        <Link href="/auth/sign-up" className="underline">
          create account
        </Link>
      </div>
    </div>
  );
}
