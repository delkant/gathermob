import { redirect } from "next/navigation";

export default function RootPage() {
  // The middleware will handle the redirect based on auth status
  // This is a fallback in case middleware doesn't catch it
  redirect("/login");

  return null;
}