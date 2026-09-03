import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guard";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { formatDateTime } from "@/lib/format";
import type { AppLocale } from "@/i18n/config";
import { getTicket, getTicketFormOptions } from "@/features/tickets/queries";
import { TicketActions } from "@/features/tickets/ticket-actions";
import { TicketConversation } from "@/features/tickets/ticket-conversation";
import { SlaBadge } from "@/features/tickets/sla-badge";
import { Breadcrumbs, PageHeader } from "@/components/shared/page-header";
import { DescriptionItem, DescriptionList } from "@/components/shared/description-list";
import { Timeline, type TimelineEntry } from "@/components/shared/timeline";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TicketPriorityBadge, TicketStatusBadge } from "@/components/shared/status-badge";

export async function generateMetadata({ params }: PageProps<"/tickets/[id]">) {
  const { id } = await params;
  const ticket = await getTicket(id);
  return { title: ticket ? `${ticket.code} - ${ticket.title}` : "" };
}

export default async function TicketDetailPage({ params }: PageProps<"/tickets/[id]">) {
  const user = await requireUser();
  const { id } = await params;

  const [t, tc, locale, ticket, options] = await Promise.all([
    getTranslations("tickets"),
    getTranslations("common"),
    getLocale() as Promise<AppLocale>,
    getTicket(id),
    getTicketFormOptions(),
  ]);
  if (!ticket) notFound();

  const canUpdate = can(user, PERMISSIONS.TICKET_UPDATE);
  const canViewAll = can(user, PERMISSIONS.TICKET_VIEW_ALL);

  // Requesters may only open their own tickets.
  const isOwn =
    (user.employeeId && ticket.requesterId === user.employeeId) ||
    ticket.assigneeId === user.id ||
    ticket.createdById === user.id;
  if (!canViewAll && !isOwn) redirect("/forbidden");

  const visibleComments = ticket.comments.filter((c) => canUpdate || !c.isInternal);

  const timeline: TimelineEntry[] = ticket.events.map((event) => {
    const [from, to] = event.message.split(" -> ");
    const title =
      event.type === "created"
        ? t("timeline.created")
        : event.type === "status"
          ? t("timeline.statusChanged", {
              from: from ? t(`status.${from}` as never) : "",
              to: to ? t(`status.${to}` as never) : "",
            })
          : event.type === "priority"
            ? t("timeline.priorityChanged", {
                from: from ? t(`priority.${from}` as never) : "",
                to: to ? t(`priority.${to}` as never) : "",
              })
            : event.type === "assigned"
              ? t("timeline.assigned", {
                  name: options.agents.find((a) => a.id === event.message)?.name ?? "",
                })
              : event.type === "unassigned"
                ? t("timeline.unassigned")
                : event.type === "resolved"
                  ? t("timeline.resolved")
                  : event.type === "closed"
                    ? t("timeline.closed")
                    : event.type === "reopened"
                      ? t("timeline.reopened")
                      : event.message;

    return {
      id: event.id,
      title,
      meta: formatDateTime(event.createdAt, locale),
      body: event.actor?.name,
      tone:
        event.type === "created"
          ? "primary"
          : event.type === "resolved" || event.type === "closed"
            ? "success"
            : event.type === "reopened"
              ? "warning"
              : "neutral",
    };
  });

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[
          { label: t("title"), href: canViewAll ? "/tickets" : "/tickets/mine" },
          { label: ticket.code },
        ]}
      />

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {ticket.title}
            <TicketStatusBadge status={ticket.status} />
            <TicketPriorityBadge priority={ticket.priority} />
          </span>
        }
        description={
          <span className="font-mono text-xs">
            {ticket.code} · {formatDateTime(ticket.createdAt, locale)}
          </span>
        }
        actions={
          <TicketActions
            ticketId={ticket.id}
            status={ticket.status}
            assigneeId={ticket.assigneeId}
            currentUserId={user.id}
            agents={options.agents}
            canAssign={can(user, PERMISSIONS.TICKET_ASSIGN)}
            canUpdate={canUpdate}
          />
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("fields.description")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{ticket.description}</p>
            </CardContent>
          </Card>

          {ticket.resolution ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("fields.resolution")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{ticket.resolution}</p>
                <p className="mt-2 text-xs text-muted-foreground tabular">
                  {formatDateTime(ticket.resolvedAt, locale)}
                </p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>{t("comments.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <TicketConversation
                ticketId={ticket.id}
                canPostInternal={canUpdate}
                locale={locale}
                comments={visibleComments.map((c) => ({
                  id: c.id,
                  body: c.body,
                  isInternal: c.isInternal,
                  createdAt: c.createdAt,
                  authorName: c.author?.name ?? "-",
                  authorAvatar: c.author?.avatarUrl ?? null,
                  isMine: c.authorId === user.id,
                }))}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{tc("labels.overview")}</CardTitle>
            </CardHeader>
            <CardContent>
              <DescriptionList className="sm:grid-cols-1">
                <DescriptionItem label={t("fields.category")}>
                  {ticket.category
                    ? locale === "en" && ticket.category.nameEn
                      ? ticket.category.nameEn
                      : ticket.category.name
                    : "-"}
                </DescriptionItem>
                <DescriptionItem label={t("fields.source")}>{t(`source.${ticket.source}`)}</DescriptionItem>
                <DescriptionItem label={t("fields.department")}>
                  {ticket.department?.name ?? "-"}
                </DescriptionItem>
                <DescriptionItem label={t("fields.location")}>{ticket.location?.name ?? "-"}</DescriptionItem>
                {ticket.asset ? (
                  <DescriptionItem label={t("fields.asset")}>
                    <Link href={`/assets/${ticket.asset.id}`} className="text-primary hover:underline">
                      {ticket.asset.assetTag} - {ticket.asset.name}
                    </Link>
                  </DescriptionItem>
                ) : null}
              </DescriptionList>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("fields.requester")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ticket.requester ? (
                <div className="flex items-start gap-3">
                  <Avatar name={ticket.requester.fullName} src={ticket.requester.avatarUrl} size="sm" />
                  <div className="min-w-0">
                    <Link
                      href={`/employees/${ticket.requester.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {ticket.requester.fullName}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">{ticket.requester.email}</p>
                    {ticket.requester.phone ? (
                      <p className="text-xs text-muted-foreground">{ticket.requester.phone}</p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{tc("labels.none")}</p>
              )}

              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">{t("fields.assignee")}</p>
                {ticket.assignee ? (
                  <div className="mt-1.5 flex items-center gap-2">
                    <Avatar name={ticket.assignee.name} src={ticket.assignee.avatarUrl} size="sm" />
                    <span className="text-sm">{ticket.assignee.name}</span>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">{t("filters.unassigned")}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("sla.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <DescriptionList className="sm:grid-cols-1">
                <DescriptionItem label={t("fields.responseDueAt")}>
                  <span className="tabular">{formatDateTime(ticket.responseDueAt, locale)}</span>
                </DescriptionItem>
                <DescriptionItem label={t("fields.firstResponseAt")}>
                  <span className="tabular">{formatDateTime(ticket.firstResponseAt, locale)}</span>
                </DescriptionItem>
                <DescriptionItem label={t("fields.resolutionDueAt")}>
                  <SlaBadge
                    dueAt={ticket.resolutionDueAt}
                    completedAt={ticket.resolvedAt ?? ticket.closedAt}
                    locale={locale}
                  />
                </DescriptionItem>
              </DescriptionList>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{tc("labels.history")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline entries={timeline} empty={tc("table.empty")} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
