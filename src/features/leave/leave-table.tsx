import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { formatDate } from "@/lib/format";
import type { AppLocale } from "@/i18n/config";
import { Avatar } from "@/components/ui/avatar";
import { Table, TableEmpty, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { SortHeader } from "@/components/shared/sort-header";
import { LeaveStatusBadge } from "@/components/shared/status-badge";

export type LeaveRow = {
  id: string;
  code: string;
  status: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  submittedAt: Date | null;
  employee: {
    id: string;
    fullName: string;
    employeeCode: string;
    avatarUrl: string | null;
    department: { name: string } | null;
  };
  leaveType: { name: string; nameEn: string | null; color: string };
  approvals: { step: number; status: string }[];
};

/** Shared table for "my leave", "all requests" and the approval queue. */
export async function LeaveTable({
  rows,
  showEmployee = true,
}: {
  rows: LeaveRow[];
  showEmployee?: boolean;
}) {
  const [t, tc, locale] = await Promise.all([
    getTranslations("leave"),
    getTranslations("common"),
    getLocale() as Promise<AppLocale>,
  ]);

  const typeLabel = (x: { name: string; nameEn: string | null }) =>
    locale === "en" && x.nameEn ? x.nameEn : x.name;

  const colSpan = showEmployee ? 8 : 7;

  return (
    <TableWrap>
      <Table>
        <THead>
          <TR>
            <TH>
              <SortHeader field="code" label={t("fields.code")} />
            </TH>
            {showEmployee ? <TH>{t("fields.employee")}</TH> : null}
            <TH>{t("fields.leaveType")}</TH>
            <TH>
              <SortHeader field="startDate" label={t("fields.startDate")} />
            </TH>
            <TH>{t("fields.endDate")}</TH>
            <TH className="text-right">
              <SortHeader field="totalDays" label={t("fields.totalDays")} />
            </TH>
            <TH>
              <SortHeader field="status" label={t("fields.status")} />
            </TH>
            <TH>{t("approval.title")}</TH>
          </TR>
        </THead>
        <TBody>
          {rows.length === 0 ? (
            <TableEmpty colSpan={colSpan} title={tc("table.empty")} hint={tc("table.emptyHint")} />
          ) : (
            rows.map((row) => (
              <TR key={row.id}>
                <TD>
                  <Link
                    href={`/leave/${row.id}`}
                    className="font-mono text-xs font-medium text-primary hover:underline"
                  >
                    {row.code}
                  </Link>
                </TD>
                {showEmployee ? (
                  <TD>
                    <span className="flex items-center gap-2">
                      <Avatar name={row.employee.fullName} src={row.employee.avatarUrl} size="sm" />
                      <span className="min-w-0">
                        <Link href={`/employees/${row.employee.id}`} className="block truncate hover:underline">
                          {row.employee.fullName}
                        </Link>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {row.employee.department?.name ?? row.employee.employeeCode}
                        </span>
                      </span>
                    </span>
                  </TD>
                ) : null}
                <TD>
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: row.leaveType.color }}
                      aria-hidden
                    />
                    {typeLabel(row.leaveType)}
                  </span>
                </TD>
                <TD className="tabular">{formatDate(row.startDate, locale)}</TD>
                <TD className="tabular">{formatDate(row.endDate, locale)}</TD>
                <TD className="text-right tabular">{row.totalDays}</TD>
                <TD>
                  <LeaveStatusBadge status={row.status} />
                </TD>
                <TD>
                  <span className="flex items-center gap-1">
                    {row.approvals.length === 0 ? (
                      <span className="text-xs text-muted-foreground">-</span>
                    ) : (
                      row.approvals.map((a) => (
                        <span
                          key={a.step}
                          title={`${t("approval.step", { step: a.step })}: ${a.status}`}
                          className={
                            "size-2 rounded-full " +
                            (a.status === "APPROVED"
                              ? "bg-success"
                              : a.status === "REJECTED"
                                ? "bg-danger"
                                : a.status === "SKIPPED"
                                  ? "bg-border-strong"
                                  : "bg-warning")
                          }
                        />
                      ))
                    )}
                  </span>
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>
    </TableWrap>
  );
}
