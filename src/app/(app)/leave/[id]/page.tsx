import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guard";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { formatDate, formatDateTime } from "@/lib/format";
import type { AppLocale } from "@/i18n/config";
import { getLeaveRequest } from "@/features/leave/queries";
import { LeaveRequestActions } from "@/features/leave/approval-actions";
import { Breadcrumbs, PageHeader } from "@/components/shared/page-header";
import { DescriptionItem, DescriptionList } from "@/components/shared/description-list";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApprovalStatusBadge, LeaveStatusBadge } from "@/components/shared/status-badge";

export async function generateMetadata({ params }: PageProps<"/leave/[id]">) {
  const { id } = await params;
  const request = await getLeaveRequest(id);
  return { title: request?.code ?? "" };
}

export default async function LeaveRequestPage({ params }: PageProps<"/leave/[id]">) {
  const user = await requireUser();
  const { id } = await params;

  const [t, tc, locale, request] = await Promise.all([
    getTranslations("leave"),
    getTranslations("common"),
    getLocale() as Promise<AppLocale>,
    getLeaveRequest(id),
  ]);
  if (!request) notFound();

  const isOwner = request.employeeId === user.employeeId;
  const isApprover = request.approvals.some((a) => a.approverId === user.id);
  const canViewAll = can(user, PERMISSIONS.LEAVE_VIEW_ALL) || can(user, PERMISSIONS.LEAVE_MANAGE);
  if (!isOwner && !isApprover && !canViewAll) redirect("/forbidden");

  const pendingStep = request.approvals.find((a) => a.status === "PENDING");
  const canDecide =
    request.status === "PENDING" &&
    can(user, PERMISSIONS.LEAVE_APPROVE) &&
    Boolean(pendingStep) &&
    (pendingStep!.approverId === user.id || can(user, PERMISSIONS.LEAVE_MANAGE));

  const typeLabel =
    locale === "en" && request.leaveType.nameEn ? request.leaveType.nameEn : request.leaveType.name;

  const dayPartSuffix = (part: string) => (part === "FULL" ? "" : ` (${t(`dayPart.${part}`)})`);

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[
          { label: t("title"), href: isOwner ? "/leave" : "/leave/requests" },
          { label: request.code },
        ]}
      />

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: request.leaveType.color }}
              aria-hidden
            />
            {typeLabel}
            <LeaveStatusBadge status={request.status} />
          </span>
        }
        description={
          <span className="font-mono text-xs">
            {request.code} · {request.employee.fullName}
          </span>
        }
        actions={
          <LeaveRequestActions
            requestId={request.id}
            employeeName={request.employee.fullName}
            status={request.status}
            canDecide={canDecide}
            canCancel={isOwner || can(user, PERMISSIONS.LEAVE_MANAGE)}
            canSubmit={isOwner || can(user, PERMISSIONS.LEAVE_MANAGE)}
          />
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{tc("labels.overview")}</CardTitle>
            </CardHeader>
            <CardContent>
              <DescriptionList>
                <DescriptionItem label={t("fields.startDate")}>
                  <span className="tabular">
                    {formatDate(request.startDate, locale)}
                    {dayPartSuffix(request.startDayPart)}
                  </span>
                </DescriptionItem>
                <DescriptionItem label={t("fields.endDate")}>
                  <span className="tabular">
                    {formatDate(request.endDate, locale)}
                    {dayPartSuffix(request.endDayPart)}
                  </span>
                </DescriptionItem>
                <DescriptionItem label={t("fields.totalDays")}>
                  <span className="text-base font-semibold tabular">{request.totalDays}</span>
                </DescriptionItem>
                <DescriptionItem label={t("fields.submittedAt")}>
                  <span className="tabular">{formatDateTime(request.submittedAt, locale)}</span>
                </DescriptionItem>
                <DescriptionItem label={t("fields.reason")} wide>
                  <span className="whitespace-pre-wrap">{request.reason}</span>
                </DescriptionItem>
                {request.contactPhone ? (
                  <DescriptionItem label={t("fields.contactPhone")}>{request.contactPhone}</DescriptionItem>
                ) : null}
                {request.handoverTo ? (
                  <DescriptionItem label={t("fields.handoverTo")}>
                    <Link href={`/employees/${request.handoverTo.id}`} className="hover:underline">
                      {request.handoverTo.fullName}
                    </Link>
                  </DescriptionItem>
                ) : null}
                {request.handoverNote ? (
                  <DescriptionItem label={t("fields.handoverNote")} wide>
                    <span className="whitespace-pre-wrap">{request.handoverNote}</span>
                  </DescriptionItem>
                ) : null}
                {request.cancelReason ? (
                  <DescriptionItem label={tc("labels.reason")} wide>
                    <span className="whitespace-pre-wrap text-danger">{request.cancelReason}</span>
                  </DescriptionItem>
                ) : null}
              </DescriptionList>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("approval.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              {request.approvals.length === 0 ? (
                <p className="text-sm text-muted-foreground">{tc("table.empty")}</p>
              ) : (
                <ol className="space-y-4">
                  {request.approvals.map((approval) => (
                    <li key={approval.id} className="flex items-start gap-3">
                      <Avatar name={approval.approver.name} src={approval.approver.avatarUrl} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm">
                            <span className="mr-2 text-xs text-muted-foreground">
                              {t("approval.step", { step: approval.step })}
                            </span>
                            {approval.approver.name}
                          </span>
                          <span className="flex items-center gap-2">
                            <ApprovalStatusBadge status={approval.status} />
                            {approval.actedAt ? (
                              <span className="text-[11px] text-muted-foreground tabular">
                                {formatDateTime(approval.actedAt, locale)}
                              </span>
                            ) : null}
                          </span>
                        </div>
                        {approval.comment ? (
                          <p className="mt-1 whitespace-pre-wrap rounded-md bg-surface-muted px-3 py-2 text-xs">
                            {approval.comment}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("fields.employee")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <Avatar name={request.employee.fullName} src={request.employee.avatarUrl} />
              <div className="min-w-0">
                <Link href={`/employees/${request.employee.id}`} className="text-sm font-medium hover:underline">
                  {request.employee.fullName}
                </Link>
                <p className="truncate text-xs text-muted-foreground">{request.employee.email}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {[request.employee.position?.title, request.employee.department?.name]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
