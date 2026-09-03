import { getLocale, getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { contains, pagination, param } from "@/lib/query";
import { formatDateTime } from "@/lib/format";
import type { AppLocale } from "@/i18n/config";
import type { Prisma } from "@/generated/prisma/client";
import { AuditFilters } from "@/features/admin/audit-filters";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Table, TableEmpty, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export async function generateMetadata() {
  const t = await getTranslations("admin.audit");
  return { title: t("title") };
}

const ACTION_TONE: Record<string, BadgeTone> = {
  CREATE: "success",
  UPDATE: "info",
  DELETE: "danger",
  LOGIN: "neutral",
  LOGOUT: "neutral",
  ASSIGN: "primary",
  RETURN: "warning",
  APPROVE: "success",
  REJECT: "danger",
  EXPORT: "neutral",
};

export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  await requirePermission(PERMISSIONS.ADMIN_AUDIT);
  const sp = await searchParams;

  const [t, tc, locale] = await Promise.all([
    getTranslations("admin.audit"),
    getTranslations("common"),
    getLocale() as Promise<AppLocale>,
  ]);

  const q = param(sp, "q");
  const action = param(sp, "action");
  const entityType = param(sp, "entity");
  const { page, perPage, skip, take } = pagination(sp);

  const where: Prisma.AuditLogWhereInput = {
    ...(q ? { OR: [{ summary: contains(q) }, { entityId: contains(q) }] } : {}),
    ...(action ? { action: action as never } : {}),
    ...(entityType ? { entityType } : {}),
  };

  const [rows, total, entityTypes] = await Promise.all([
    db.auditLog.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    }),
    db.auditLog.count({ where }),
    db.auditLog.findMany({ distinct: ["entityType"], select: { entityType: true }, orderBy: { entityType: "asc" } }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title={t("title")} />
      <AuditFilters entityTypes={entityTypes.map((e) => e.entityType)} />

      <TableWrap>
        <Table>
          <THead>
            <TR>
              <TH>{tc("labels.createdAt")}</TH>
              <TH>{t("actor")}</TH>
              <TH>{t("action")}</TH>
              <TH>{t("entity")}</TH>
              <TH>{t("summary")}</TH>
              <TH>{t("ip")}</TH>
            </TR>
          </THead>
          <TBody>
            {rows.length === 0 ? (
              <TableEmpty colSpan={6} title={tc("table.empty")} />
            ) : (
              rows.map((row) => (
                <TR key={row.id}>
                  <TD className="whitespace-nowrap text-xs tabular">{formatDateTime(row.createdAt, locale)}</TD>
                  <TD>
                    {row.user ? (
                      <>
                        <span className="block">{row.user.name}</span>
                        <span className="block text-[11px] text-muted-foreground">{row.user.email}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TD>
                  <TD>
                    <Badge tone={ACTION_TONE[row.action] ?? "neutral"}>{t(`actions.${row.action}`)}</Badge>
                  </TD>
                  <TD className="text-xs text-muted-foreground">{row.entityType}</TD>
                  <TD className="max-w-md truncate">{row.summary ?? "-"}</TD>
                  <TD className="font-mono text-[11px] text-muted-foreground">{row.ip ?? "-"}</TD>
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
