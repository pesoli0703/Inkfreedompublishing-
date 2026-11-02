import { redirect } from "next/navigation";

/**
 * Publishing used to require an application that an administrator had to
 * approve. It is now self-service: `/author/start` opens the workspace
 * immediately, so this route simply forwards there.
 */
export default function AuthorApplyRedirect() {
  redirect("/author/start");
}
