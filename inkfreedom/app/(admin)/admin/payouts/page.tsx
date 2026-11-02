import type { Metadata } from "next";
import Link from "next/link";
import { EmptyRow, Kpi, PageHead, StatusPill, TableShell } from "@/components/dash";
import { listAdminPayouts } from "@/lib/admin";
import { formatDate, formatNaira } from "@/lib/format";
import { resolvePayoutAction } from "@/lib/actions/admin";

export const metadata: Metadata = { title: "Payouts" };

export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const payouts = await listAdminPayouts();

  const requested = payouts.filter((payout) => payout.status === "requested");
  const approved = payouts.filter((payout) => payout.status === "approved");
  const settled = payouts.filter((payout) => payout.status === "paid");

  return (
    <div>
      <PageHead
        eyebrow="Money"
        title="Payouts"
        description="Royalty requests from authors. Approve, then mark paid once the transfer clears."
      />

      {saved ? (
        <div className="mt-6 border border-[#cbd9c1] bg-[#eaf0e4] px-4 py-3 text-[0.82rem] text-[#3f5a33]">
          Payout updated.
        </div>
      ) : null}

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Kpi
          label="Awaiting approval"
          value={formatNaira(requested.reduce((sum, payout) => sum + payout.amount_kobo, 0))}
          hint={`${requested.length} request${requested.length === 1 ? "" : "s"}`}
          tone={requested.length > 0 ? "ember" : "plain"}
        />
        <Kpi
          label="Approved, unpaid"
          value={formatNaira(approved.reduce((sum, payout) => sum + payout.amount_kobo, 0))}
          hint={`${approved.length} ready to send`}
        />
        <Kpi
          label="Paid to date"
          value={formatNaira(settled.reduce((sum, payout) => sum + payout.amount_kobo, 0))}
          hint={`${settled.length} settled`}
        />
      </div>

      <div className="mt-6 border border-line bg-paper-card">
        <TableShell head={["Author", "Requested", "Amount", "Status", "Actions"]}>
          {payouts.length === 0 ? (
            <EmptyRow colSpan={5}>No payout requests yet.</EmptyRow>
          ) : (
            payouts.map((payout) => (
              <tr key={payout.id} className="text-[0.82rem]">
                <td className="px-4 py-3 pl-5">
                  {payout.author ? (
                    <Link
                      href={`/authors/${payout.author.slug}`}
                      className="font-medium text-ink hover:text-ember"
                    >
                      {payout.author.name}
                    </Link>
                  ) : (
                    <span className="text-ink-muted">—</span>
                  )}
                  <p className="text-[0.66rem] text-ink-muted">
                    {payout.author?.profile?.email ?? ""}
                  </p>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-ink-muted">
                  {formatDate(payout.requested_at)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums text-ink">
                  {formatNaira(payout.amount_kobo)}
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={payout.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    {payout.status === "requested" ? (
                      <>
                        <form action={resolvePayoutAction}>
                          <input type="hidden" name="payoutId" value={payout.id} />
                          <input type="hidden" name="status" value="approved" />
                          <button
                            type="submit"
                            className="rounded-full bg-ink px-3 py-1.5 text-[0.68rem] font-medium text-paper hover:bg-ember"
                          >
                            Approve
                          </button>
                        </form>
                        <form action={resolvePayoutAction}>
                          <input type="hidden" name="payoutId" value={payout.id} />
                          <input type="hidden" name="status" value="rejected" />
                          <button
                            type="submit"
                            className="px-2 py-1.5 text-[0.68rem] text-ink-muted hover:text-ember"
                          >
                            Decline
                          </button>
                        </form>
                      </>
                    ) : null}

                    {payout.status === "approved" ? (
                      <form action={resolvePayoutAction}>
                        <input type="hidden" name="payoutId" value={payout.id} />
                        <input type="hidden" name="status" value="paid" />
                        <button
                          type="submit"
                          className="rounded-full bg-ink px-3 py-1.5 text-[0.68rem] font-medium text-paper hover:bg-ember"
                        >
                          Mark paid
                        </button>
                      </form>
                    ) : null}

                    {payout.status === "paid" || payout.status === "rejected" ? (
                      <span className="text-[0.68rem] text-ink-muted">
                        {formatDate(payout.resolved_at)}
                      </span>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))
          )}
        </TableShell>
      </div>
    </div>
  );
}
