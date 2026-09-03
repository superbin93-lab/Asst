import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guard";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { TicketCategoryPanel } from "@/features/catalog/service-panels";
import { PageHeader } from "@/components/shared/page-header";

export async function generateMetadata() {
  const t = await getTranslations("tickets.categories");
  return { title: t("title") };
}

export default async function TicketCategoriesPage() {
  const user = await requirePermission(PERMISSIONS.TICKET_CONFIG);
  const [t, rows, policies] = await Promise.all([
    getTranslations("tickets.categories"),
    db.ticketCategory.findMany({
      orderBy: { code: "asc" },
      include: { sla: { select: { name: true, priority: true } }, _count: { select: { tickets: true } } },
    }),
    db.slaPolicy.findMany({ orderBy: [{ name: "asc" }, { priority: "asc" }] }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title={t("title")} />
      <TicketCategoryPanel
        canManage={can(user, PERMISSIONS.TICKET_CONFIG)}
        slaPolicies={policies.map((p) => ({ id: p.id, label: `${p.name} - ${p.priority}` }))}
        rows={rows.map((r) => ({
          id: r.id,
          label: r.name,
          code: r.code,
          name: r.name,
          nameEn: r.nameEn,
          parentId: r.parentId,
          slaPolicyId: r.slaPolicyId,
          slaName: r.sla ? `${r.sla.name} - ${r.sla.priority}` : "-",
          isActive: r.isActive,
          ticketCount: r._count.tickets,
        }))}
      />
    </div>
  );
}
