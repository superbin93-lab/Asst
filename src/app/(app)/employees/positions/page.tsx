import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guard";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { listPositions } from "@/features/hr/queries";
import { PositionPanel } from "@/features/hr/position-panel";
import { PageHeader } from "@/components/shared/page-header";

export async function generateMetadata() {
  const t = await getTranslations("hr.positions");
  return { title: t("title") };
}

export default async function PositionsPage() {
  const user = await requirePermission(PERMISSIONS.ORG_MANAGE);
  const [t, positions] = await Promise.all([getTranslations("hr.positions"), listPositions()]);

  return (
    <div className="space-y-5">
      <PageHeader title={t("title")} />
      <PositionPanel
        canManage={can(user, PERMISSIONS.ORG_MANAGE)}
        rows={positions.map((p) => ({
          id: p.id,
          label: p.title,
          code: p.code,
          title: p.title,
          titleEn: p.titleEn,
          level: p.level,
          isActive: p.isActive,
          employeeCount: p._count.employees,
        }))}
      />
    </div>
  );
}
