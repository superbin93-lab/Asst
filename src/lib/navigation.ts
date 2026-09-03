import type { Permission } from "./auth/permissions";
import { PERMISSIONS } from "./auth/permissions";

export type NavItem = {
  /** Key inside the `nav` message namespace. */
  key: string;
  href: string;
  icon?: string;
  /** Visible when the user holds at least one of these; empty means always. */
  permissions?: Permission[];
  exact?: boolean;
};

export type NavSection = {
  key: string;
  icon: string;
  items: NavItem[];
  permissions?: Permission[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    key: "dashboard",
    icon: "layout-dashboard",
    items: [{ key: "dashboard", href: "/", exact: true }],
  },
  {
    key: "assets",
    icon: "hard-drive",
    permissions: [PERMISSIONS.ASSET_VIEW, PERMISSIONS.CONSUMABLE_VIEW, PERMISSIONS.LICENSE_VIEW],
    items: [
      { key: "assetList", href: "/assets", permissions: [PERMISSIONS.ASSET_VIEW] },
      { key: "assignments", href: "/assets/assignments", permissions: [PERMISSIONS.ASSET_VIEW] },
      { key: "maintenance", href: "/assets/maintenance", permissions: [PERMISSIONS.ASSET_VIEW] },
      { key: "licenses", href: "/licenses", permissions: [PERMISSIONS.LICENSE_VIEW] },
      { key: "consumables", href: "/consumables", permissions: [PERMISSIONS.CONSUMABLE_VIEW] },
    ],
  },
  {
    key: "helpdesk",
    icon: "life-buoy",
    items: [
      { key: "myTickets", href: "/tickets/mine" },
      { key: "ticketList", href: "/tickets", permissions: [PERMISSIONS.TICKET_VIEW_ALL] },
    ],
  },
  {
    key: "leave",
    icon: "calendar-days",
    items: [
      { key: "myLeave", href: "/leave" },
      { key: "leaveApprovals", href: "/leave/approvals", permissions: [PERMISSIONS.LEAVE_APPROVE] },
      { key: "leaveRequests", href: "/leave/requests", permissions: [PERMISSIONS.LEAVE_VIEW_ALL] },
      { key: "leaveBalances", href: "/leave/balances", permissions: [PERMISSIONS.LEAVE_MANAGE] },
    ],
  },
  {
    key: "hr",
    icon: "users",
    permissions: [PERMISSIONS.EMPLOYEE_VIEW],
    items: [
      { key: "employees", href: "/employees", permissions: [PERMISSIONS.EMPLOYEE_VIEW] },
      { key: "departments", href: "/employees/departments", permissions: [PERMISSIONS.EMPLOYEE_VIEW] },
      { key: "positions", href: "/employees/positions", permissions: [PERMISSIONS.ORG_MANAGE] },
      { key: "contracts", href: "/employees/contracts", permissions: [PERMISSIONS.EMPLOYEE_VIEW] },
    ],
  },
  {
    key: "reports",
    icon: "bar-chart-3",
    permissions: [PERMISSIONS.REPORT_VIEW],
    items: [{ key: "reports", href: "/reports", permissions: [PERMISSIONS.REPORT_VIEW] }],
  },
  {
    key: "catalog",
    icon: "library",
    permissions: [PERMISSIONS.CATALOG_MANAGE],
    items: [
      { key: "categories", href: "/catalog/categories", permissions: [PERMISSIONS.CATALOG_MANAGE] },
      { key: "locations", href: "/catalog/locations", permissions: [PERMISSIONS.CATALOG_MANAGE] },
      { key: "vendors", href: "/catalog/vendors", permissions: [PERMISSIONS.CATALOG_MANAGE] },
      { key: "ticketCategories", href: "/catalog/ticket-categories", permissions: [PERMISSIONS.TICKET_CONFIG] },
      { key: "slaPolicies", href: "/catalog/sla", permissions: [PERMISSIONS.TICKET_CONFIG] },
      { key: "leaveTypes", href: "/catalog/leave-types", permissions: [PERMISSIONS.LEAVE_MANAGE] },
      { key: "holidays", href: "/catalog/holidays", permissions: [PERMISSIONS.LEAVE_MANAGE] },
    ],
  },
  {
    key: "admin",
    icon: "settings",
    permissions: [PERMISSIONS.ADMIN_USERS, PERMISSIONS.ADMIN_ROLES, PERMISSIONS.ADMIN_SETTINGS, PERMISSIONS.ADMIN_AUDIT],
    items: [
      { key: "users", href: "/admin/users", permissions: [PERMISSIONS.ADMIN_USERS] },
      { key: "roles", href: "/admin/roles", permissions: [PERMISSIONS.ADMIN_ROLES] },
      { key: "settings", href: "/admin/settings", permissions: [PERMISSIONS.ADMIN_SETTINGS] },
      { key: "auditLog", href: "/admin/audit", permissions: [PERMISSIONS.ADMIN_AUDIT] },
    ],
  },
];
