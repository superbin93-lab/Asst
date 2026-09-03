import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/format";
import type { AppLocale } from "@/i18n/config";
import { slaState } from "./sla";

/**
 * Countdown against the resolution SLA. Shows time left while the ticket is
 * open, and whether the deadline was met once it is finished.
 */
export function SlaBadge({
  dueAt,
  completedAt,
  locale,
}: {
  dueAt: Date | null;
  completedAt: Date | null;
  locale: AppLocale;
}) {
  const t = useTranslations("tickets.sla");
  const { state, minutes } = slaState(dueAt, completedAt);

  if (state === "none") return <span className="text-muted-foreground">-</span>;

  const duration = formatDuration(minutes, locale);

  if (state === "breached") {
    return <Badge tone="danger">{t("overdueBy", { duration })}</Badge>;
  }
  if (state === "met") {
    return <Badge tone="success">{t("onTrack")}</Badge>;
  }
  if (state === "dueSoon") {
    return <Badge tone="warning">{t("remaining", { duration })}</Badge>;
  }
  return <Badge tone="neutral">{t("remaining", { duration })}</Badge>;
}
