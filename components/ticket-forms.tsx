"use client";

import { useActionState } from "react";
import {
  createTicketAction,
  replyTicketAction,
  type ActionState,
} from "@/app/(store)/dashboard/actions";
import { SubmitButton } from "@/components/form-feedback";

const field =
  "mt-2 w-full border border-line bg-ivory/60 px-3.5 py-3 text-sm text-charcoal outline-none focus:border-gold-deep focus:bg-white";
const label =
  "block text-[0.66rem] font-semibold tracking-[0.14em] text-charcoal-soft uppercase";

export function NewTicketForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(createTicketAction, null);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={label}>
          Subject
          <input name="subject" required maxLength={200} className={field} />
        </label>
        <label className={label}>
          Category
          <select name="category" className={field} defaultValue="order">
            <option value="order">Order or payment</option>
            <option value="download">Download or access</option>
            <option value="account">Account</option>
            <option value="author">Publishing</option>
            <option value="copyright">Copyright</option>
            <option value="general">Something else</option>
          </select>
        </label>
      </div>
      <label className={label}>
        Message
        <textarea name="body" required rows={5} className={field} />
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton label="Open ticket" pendingLabel="Sending…" />
        <p aria-live="polite" className="text-[0.8rem]">
          {state?.ok && <span className="text-charcoal">{state.message}</span>}
          {state && !state.ok && <span className="text-red-700">{state.message}</span>}
        </p>
      </div>
    </form>
  );
}

export function ReplyForm({ ticketId }: { ticketId: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(replyTicketAction, null);

  return (
    <form action={formAction} className="mt-6">
      <input type="hidden" name="ticket_id" value={ticketId} />
      <label className={label}>
        Reply
        <textarea name="body" required rows={4} className={field} />
      </label>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <SubmitButton label="Send reply" pendingLabel="Sending…" />
        <p aria-live="polite" className="text-[0.8rem]">
          {state?.ok && <span className="text-charcoal">{state.message}</span>}
          {state && !state.ok && <span className="text-red-700">{state.message}</span>}
        </p>
      </div>
    </form>
  );
}
