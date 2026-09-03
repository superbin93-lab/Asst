import { useTranslations } from "next-intl";
import { Badge, type BadgeTone } from "@/components/ui/badge";

const ASSET_STATUS_TONE: Record<string, BadgeTone> = {
  IN_STOCK: "info",
  ASSIGNED: "success",
  IN_REPAIR: "warning",
  RESERVED: "primary",
  RETIRED: "neutral",
  LOST: "danger",
  DISPOSED: "neutral",
};

const ASSET_CONDITION_TONE: Record<string, BadgeTone> = {
  NEW: "success",
  GOOD: "success",
  FAIR: "warning",
  POOR: "warning",
  BROKEN: "danger",
};

const TICKET_STATUS_TONE: Record<string, BadgeTone> = {
  NEW: "info",
  OPEN: "primary",
  PENDING_REQUESTER: "warning",
  ON_HOLD: "neutral",
  RESOLVED: "success",
  CLOSED: "neutral",
  CANCELLED: "neutral",
};

const TICKET_PRIORITY_TONE: Record<string, BadgeTone> = {
  LOW: "neutral",
  MEDIUM: "info",
  HIGH: "warning",
  URGENT: "danger",
};

const REQUEST_STATUS_TONE: Record<string, BadgeTone> = {
  DRAFT: "neutral",
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
  SKIPPED: "neutral",
};

const EMPLOYEE_STATUS_TONE: Record<string, BadgeTone> = {
  PROBATION: "info",
  ACTIVE: "success",
  ON_LEAVE: "warning",
  SUSPENDED: "warning",
  TERMINATED: "neutral",
};

const ASSIGNMENT_STATUS_TONE: Record<string, BadgeTone> = {
  ACTIVE: "primary",
  RETURNED: "neutral",
  OVERDUE: "danger",
};

const MAINTENANCE_STATUS_TONE: Record<string, BadgeTone> = {
  SCHEDULED: "info",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  CANCELLED: "neutral",
};

const CONTRACT_STATUS_TONE: Record<string, BadgeTone> = {
  DRAFT: "neutral",
  ACTIVE: "success",
  EXPIRING: "warning",
  EXPIRED: "danger",
  TERMINATED: "neutral",
};

export function AssetStatusBadge({ status }: { status: string }) {
  const t = useTranslations("assets.status");
  return <Badge tone={ASSET_STATUS_TONE[status] ?? "neutral"}>{t(status)}</Badge>;
}

export function AssetConditionBadge({ condition }: { condition: string }) {
  const t = useTranslations("assets.condition");
  return <Badge tone={ASSET_CONDITION_TONE[condition] ?? "neutral"}>{t(condition)}</Badge>;
}

export function AssignmentStatusBadge({ status }: { status: string }) {
  const t = useTranslations("assets.assignment.status");
  return <Badge tone={ASSIGNMENT_STATUS_TONE[status] ?? "neutral"}>{t(status)}</Badge>;
}

export function MaintenanceStatusBadge({ status }: { status: string }) {
  const t = useTranslations("assets.maintenance.statuses");
  return <Badge tone={MAINTENANCE_STATUS_TONE[status] ?? "neutral"}>{t(status)}</Badge>;
}

export function TicketStatusBadge({ status }: { status: string }) {
  const t = useTranslations("tickets.status");
  return <Badge tone={TICKET_STATUS_TONE[status] ?? "neutral"}>{t(status)}</Badge>;
}

export function TicketPriorityBadge({ priority }: { priority: string }) {
  const t = useTranslations("tickets.priority");
  return <Badge tone={TICKET_PRIORITY_TONE[priority] ?? "neutral"}>{t(priority)}</Badge>;
}

export function LeaveStatusBadge({ status }: { status: string }) {
  const t = useTranslations("leave.status");
  return <Badge tone={REQUEST_STATUS_TONE[status] ?? "neutral"}>{t(status)}</Badge>;
}

export function ApprovalStatusBadge({ status }: { status: string }) {
  const t = useTranslations("leave.approval.status");
  return <Badge tone={REQUEST_STATUS_TONE[status] ?? "neutral"}>{t(status)}</Badge>;
}

export function EmployeeStatusBadge({ status }: { status: string }) {
  const t = useTranslations("hr.employees.status");
  return <Badge tone={EMPLOYEE_STATUS_TONE[status] ?? "neutral"}>{t(status)}</Badge>;
}

export function ContractStatusBadge({ status }: { status: string }) {
  const t = useTranslations("hr.contracts.statuses");
  return <Badge tone={CONTRACT_STATUS_TONE[status] ?? "neutral"}>{t(status)}</Badge>;
}
