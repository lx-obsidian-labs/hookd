import type { Metadata } from "next";
import { ProfileClient } from "./profile-client";

export const metadata: Metadata = {
  title: "Profile Settings | Hook'd",
  description:
    "Edit your Hook'd profile details, bio, city, and interests to improve discovery and match quality.",
};

export default function ProfilePage() {
  return <ProfileClient />;
}
