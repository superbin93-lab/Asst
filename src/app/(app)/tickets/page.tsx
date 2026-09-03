import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { TicketList } from "@/features/tickets/ticket-list";

export async function generateMetadata() {
  const t = await getTranslations("tickets");
  return { title: t("title") };
}

export default async function TicketsPage({ searchParams }: PageProps<"/tickets">) {
  const user = await requirePermission(PERMISSIONS.TICKET_VIEW_ALL);
  const [sp, t] = await Promise.all([searchParams, getTranslations("tickets")]);

  return (
    <TicketList
      user={user}
      searchParams={sp}
      scope="all"
      title={t("title")}
      description={t("subtitle")}
    />
  );
}
