import { ChatClient } from "./chat-client";

type ChatPageProps = {
  searchParams: Promise<{ match?: string }>;
};

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const params = await searchParams;
  return <ChatClient initialMatchId={params.match ?? ""} />;
}
