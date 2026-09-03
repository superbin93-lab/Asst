import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guard";
import { TicketList } from "@/features/tickets/ticket-list";

export async function generateMetadata() {
  const t = await getTranslations("tickets");
  return { title: t("mine") };
}

export default async function MyTicketsPage({ searchParams }: PageProps<"/tickets/mine">) {
  const user = await requireUser();
  const [sp, t] = await Promise.all([searchParams, getTranslations("tickets")]);

  return (
    <TicketList
      user={user}
      searchParams={sp}
      scope="mine"
      title={t("mine")}
      description={t("subtitle")}
    />
  );
}
