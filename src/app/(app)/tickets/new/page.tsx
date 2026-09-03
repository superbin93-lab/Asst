import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/guard";
import { can, PERMISSIONS } from "@/lib/auth/permissions";
import { getTicketFormOptions } from "@/features/tickets/queries";
import { createTicket } from "@/features/tickets/actions";
import { TicketForm } from "@/features/tickets/ticket-form";
import { Breadcrumbs, PageHeader } from "@/components/shared/page-header";

export async function generateMetadata() {
  const t = await getTranslations("tickets");
  return { title: t("new") };
}

export default async function NewTicketPage() {
  const user = await requirePermission(PERMISSIONS.TICKET_CREATE);
  const [t, tc, options] = await Promise.all([
    getTranslations("tickets"),
    getTranslations("common.actions"),
    getTicketFormOptions(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Breadcrumbs items={[{ label: t("mine"), href: "/tickets/mine" }, { label: t("new") }]} />
      <PageHeader title={t("new")} description={t("subtitle")} />
      <TicketForm
        action={createTicket}
        options={options}
        canAssign={can(user, PERMISSIONS.TICKET_ASSIGN)}
        canPickRequester={can(user, PERMISSIONS.TICKET_VIEW_ALL)}
        submitLabel={tc("submit")}
      />
    </div>
  );
}
