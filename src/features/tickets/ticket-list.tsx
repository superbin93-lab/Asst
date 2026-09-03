import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import type { SessionUser } from "@/lib/auth/session";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { formatDateTime } from "@/lib/format";
import type { SearchParamsInput } from "@/lib/query";
import type { AppLocale } from "@/i18n/config";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Pagination } from "@/components/shared/pagination";
import { SortHeader } from "@/components/shared/sort-header";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Table, TableEmpty, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { TicketPriorityBadge, TicketStatusBadge } from "@/components/shared/status-badge";
import { listTickets, getTicketFormOptions, getTicketStats, type TicketScope } from "./queries";
import { TicketFilters } from "./ticket-filters";
import { SlaBadge } from "./sla-badge";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "./schema";

export async function TicketList({
  user,
  searchParams,
  scope,
  title,
  description,
}: {
  user: SessionUser;
  searchParams: SearchParamsInput;
  scope: TicketScope;
  title: string;
  description: string;
}) {
  const [t, tc, locale, { rows, total, page, perPage }, options, stats] = await Promise.all([
    getTranslations("tickets"),
    getTranslations("common"),
    getLocale() as Promise<AppLocale>,
    listTickets(searchParams, user, scope),
    getTicketFormOptions(),
    getTicketStats(user),
  ]);

  const canAssign = can(user, PERMISSIONS.TICKET_ASSIGN);
  const categoryLabel = (c: { name: string; nameEn: string | null } | null) =>
    c ? (locale === "en" && c.nameEn ? c.nameEn : c.name) : "-";

  return (
    <div className="space-y-5">
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button asChild>
            <Link href="/tickets/new">
              <Plus />
              {t("new")}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("status.OPEN")} value={stats.open} tone="primary" href="/tickets?status=open" />
        <StatCard label={t("assignedToMe")} value={stats.mine} tone="info" href="/tickets?assignee=me" />
        <StatCard
          label={t("filters.unassigned")}
          value={stats.unassigned}
          tone="warning"
          href="/tickets?assignee=none"
        />
        <StatCard label={t("sla.breached")} value={stats.breached} tone="danger" href="/tickets?sla=breached" />
      </div>

      <TicketFilters
        categories={options.categories.map((c) => ({ value: c.id, label: categoryLabel(c) }))}
        agents={options.agents.map((a) => ({ value: a.id, label: a.name }))}
        statuses={TICKET_STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))}
        priorities={TICKET_PRIORITIES.map((p) => ({ value: p, label: t(`priority.${p}`) }))}
        showAssignee={canAssign}
      />

      <TableWrap>
        <Table>
          <THead>
            <TR>
              <TH>
                <SortHeader field="code" label={t("fields.code")} />
              </TH>
              <TH>
                <SortHeader field="title" label={t("fields.title")} />
              </TH>
              <TH>{t("fields.category")}</TH>
              <TH>
                <SortHeader field="priority" label={t("fields.priority")} />
              </TH>
              <TH>
                <SortHeader field="status" label={t("fields.status")} />
              </TH>
              <TH>{t("fields.requester")}</TH>
              <TH>{t("fields.assignee")}</TH>
              <TH>
                <SortHeader field="resolutionDueAt" label={t("sla.resolutionTime")} />
              </TH>
              <TH>
                <SortHeader field="createdAt" label={tc("labels.createdAt")} />
              </TH>
            </TR>
          </THead>
          <TBody>
            {rows.length === 0 ? (
              <TableEmpty colSpan={9} title={tc("table.empty")} hint={tc("table.emptyHint")} />
            ) : (
              rows.map((ticket) => (
                <TR key={ticket.id}>
                  <TD>
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="font-mono text-xs font-medium text-primary hover:underline"
                    >
                      {ticket.code}
                    </Link>
                  </TD>
                  <TD className="max-w-md">
                    <Link href={`/tickets/${ticket.id}`} className="font-medium hover:underline">
                      {ticket.title}
                    </Link>
                  </TD>
                  <TD className="text-muted-foreground">{categoryLabel(ticket.category)}</TD>
                  <TD>
                    <TicketPriorityBadge priority={ticket.priority} />
                  </TD>
                  <TD>
                    <TicketStatusBadge status={ticket.status} />
                  </TD>
                  <TD>{ticket.requester?.fullName ?? "-"}</TD>
                  <TD>
                    {ticket.assignee ? (
                      <span className="flex items-center gap-2">
                        <Avatar name={ticket.assignee.name} src={ticket.assignee.avatarUrl} size="sm" />
                        <span className="truncate">{ticket.assignee.name}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">{t("filters.unassigned")}</span>
                    )}
                  </TD>
                  <TD>
                    <SlaBadge
                      dueAt={ticket.resolutionDueAt}
                      completedAt={ticket.resolvedAt ?? ticket.closedAt}
                      locale={locale}
                    />
                  </TD>
                  <TD className="whitespace-nowrap text-xs text-muted-foreground tabular">
                    {formatDateTime(ticket.createdAt, locale)}
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </TableWrap>

      <Pagination page={page} perPage={perPage} total={total} />
    </div>
  );
}
