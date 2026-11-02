"use client";

import { useRef } from "react";

/** Submits the server action as soon as the role changes. */
export function RoleSelect({ profileId, role }: { profileId: string; role: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} className="flex items-center gap-2">
      <input type="hidden" name="profileId" value={profileId} />
      <label className="sr-only" htmlFor={`role-${profileId}`}>
        Role for this account
      </label>
      <select
        id={`role-${profileId}`}
        name="role"
        defaultValue={role}
        className="field h-8 w-[6.5rem] py-0 pr-7 text-[0.7rem]"
        onChange={() => formRef.current?.requestSubmit()}
      >
        <option value="reader">reader</option>
        <option value="author">author</option>
        <option value="admin">admin</option>
      </select>
      <noscript>
        <span className="text-[0.7rem] text-ink-muted">Enable JavaScript to change roles.</span>
      </noscript>
    </form>
  );
}
