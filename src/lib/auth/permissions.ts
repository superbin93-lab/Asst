/**
 * Permission catalogue.
 *
 * Permissions are plain strings stored on RolePermission rows, so new ones can
 * be introduced without a migration. Everything the UI or a server action needs
 * to gate on should be declared here first.
 */
export const PERMISSIONS = {
  // --- IT assets ------------------------------------------------------------
  ASSET_VIEW: "asset.view",
  ASSET_CREATE: "asset.create",
  ASSET_UPDATE: "asset.update",
  ASSET_DELETE: "asset.delete",
  ASSET_ASSIGN: "asset.assign",
  ASSET_MAINTAIN: "asset.maintain",
  ASSET_EXPORT: "asset.export",
  CATALOG_MANAGE: "catalog.manage", // categories, locations, vendors

  // --- Consumables & licences ----------------------------------------------
  CONSUMABLE_VIEW: "consumable.view",
  CONSUMABLE_MANAGE: "consumable.manage",
  LICENSE_VIEW: "license.view",
  LICENSE_MANAGE: "license.manage",

  // --- Helpdesk -------------------------------------------------------------
  TICKET_CREATE: "ticket.create",
  TICKET_VIEW_ALL: "ticket.view.all",
  TICKET_UPDATE: "ticket.update",
  TICKET_ASSIGN: "ticket.assign",
  TICKET_DELETE: "ticket.delete",
  TICKET_CONFIG: "ticket.config", // categories & SLA policies

  // --- HR -------------------------------------------------------------------
  EMPLOYEE_VIEW: "employee.view",
  EMPLOYEE_CREATE: "employee.create",
  EMPLOYEE_UPDATE: "employee.update",
  EMPLOYEE_DELETE: "employee.delete",
  EMPLOYEE_SALARY_VIEW: "employee.salary.view",
  ORG_MANAGE: "org.manage", // departments & positions

  // --- Leave ----------------------------------------------------------------
  LEAVE_VIEW_ALL: "leave.view.all",
  LEAVE_APPROVE: "leave.approve",
  LEAVE_MANAGE: "leave.manage", // types, balances, holidays

  // --- Cross-cutting --------------------------------------------------------
  REPORT_VIEW: "report.view",
  ADMIN_USERS: "admin.users",
  ADMIN_ROLES: "admin.roles",
  ADMIN_SETTINGS: "admin.settings",
  ADMIN_AUDIT: "admin.audit",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS = Object.values(PERMISSIONS) as Permission[];

/**
 * Roles created by the seed. `isSystem` roles cannot be deleted from the UI,
 * but their permission sets remain editable.
 */
export const ROLE_PRESETS: Record<
  string,
  { name: string; nameEn: string; description: string; permissions: Permission[] }
> = {
  SUPER_ADMIN: {
    name: "Quản trị hệ thống",
    nameEn: "Super administrator",
    description: "Toàn quyền trên mọi phân hệ.",
    permissions: ALL_PERMISSIONS,
  },
  IT_ADMIN: {
    name: "Quản trị IT",
    nameEn: "IT administrator",
    description: "Quản lý toàn bộ tài sản, license, vật tư và hệ thống ticket.",
    permissions: [
      PERMISSIONS.ASSET_VIEW, PERMISSIONS.ASSET_CREATE, PERMISSIONS.ASSET_UPDATE,
      PERMISSIONS.ASSET_DELETE, PERMISSIONS.ASSET_ASSIGN, PERMISSIONS.ASSET_MAINTAIN,
      PERMISSIONS.ASSET_EXPORT, PERMISSIONS.CATALOG_MANAGE,
      PERMISSIONS.CONSUMABLE_VIEW, PERMISSIONS.CONSUMABLE_MANAGE,
      PERMISSIONS.LICENSE_VIEW, PERMISSIONS.LICENSE_MANAGE,
      PERMISSIONS.TICKET_CREATE, PERMISSIONS.TICKET_VIEW_ALL, PERMISSIONS.TICKET_UPDATE,
      PERMISSIONS.TICKET_ASSIGN, PERMISSIONS.TICKET_DELETE, PERMISSIONS.TICKET_CONFIG,
      PERMISSIONS.EMPLOYEE_VIEW, PERMISSIONS.REPORT_VIEW,
    ],
  },
  IT_STAFF: {
    name: "Nhân viên IT",
    nameEn: "IT staff",
    description: "Xử lý ticket, cấp phát và bảo trì tài sản.",
    permissions: [
      PERMISSIONS.ASSET_VIEW, PERMISSIONS.ASSET_CREATE, PERMISSIONS.ASSET_UPDATE,
      PERMISSIONS.ASSET_ASSIGN, PERMISSIONS.ASSET_MAINTAIN,
      PERMISSIONS.CONSUMABLE_VIEW, PERMISSIONS.CONSUMABLE_MANAGE,
      PERMISSIONS.LICENSE_VIEW,
      PERMISSIONS.TICKET_CREATE, PERMISSIONS.TICKET_VIEW_ALL, PERMISSIONS.TICKET_UPDATE,
      PERMISSIONS.EMPLOYEE_VIEW,
    ],
  },
  HR_ADMIN: {
    name: "Quản trị nhân sự",
    nameEn: "HR administrator",
    description: "Quản lý hồ sơ nhân sự, hợp đồng, phép năm và duyệt nghỉ phép.",
    permissions: [
      PERMISSIONS.EMPLOYEE_VIEW, PERMISSIONS.EMPLOYEE_CREATE, PERMISSIONS.EMPLOYEE_UPDATE,
      PERMISSIONS.EMPLOYEE_DELETE, PERMISSIONS.EMPLOYEE_SALARY_VIEW, PERMISSIONS.ORG_MANAGE,
      PERMISSIONS.LEAVE_VIEW_ALL, PERMISSIONS.LEAVE_APPROVE, PERMISSIONS.LEAVE_MANAGE,
      PERMISSIONS.TICKET_CREATE, PERMISSIONS.REPORT_VIEW,
    ],
  },
  MANAGER: {
    name: "Quản lý bộ phận",
    nameEn: "Department manager",
    description: "Xem thông tin nhân sự và tài sản của bộ phận, duyệt nghỉ phép cấp 1.",
    permissions: [
      PERMISSIONS.ASSET_VIEW, PERMISSIONS.EMPLOYEE_VIEW,
      PERMISSIONS.LEAVE_APPROVE, PERMISSIONS.TICKET_CREATE, PERMISSIONS.REPORT_VIEW,
    ],
  },
  EMPLOYEE: {
    name: "Nhân viên",
    nameEn: "Employee",
    description: "Tự phục vụ: tài sản đang giữ, tạo ticket, xin nghỉ phép.",
    permissions: [PERMISSIONS.TICKET_CREATE],
  },
};

export type PermissionSet = ReadonlySet<string>;

export function can(
  actor: { isSuperAdmin: boolean; permissions: PermissionSet },
  permission: Permission,
): boolean {
  return actor.isSuperAdmin || actor.permissions.has(permission);
}

export function canAny(
  actor: { isSuperAdmin: boolean; permissions: PermissionSet },
  permissions: Permission[],
): boolean {
  return actor.isSuperAdmin || permissions.some((p) => actor.permissions.has(p));
}

/** Grouping used by the role editor; keys match `admin.roles.groups.*`. */
export const PERMISSION_GROUPS: { key: string; permissions: Permission[] }[] = [
  {
    key: "asset",
    permissions: [
      PERMISSIONS.ASSET_VIEW, PERMISSIONS.ASSET_CREATE, PERMISSIONS.ASSET_UPDATE, PERMISSIONS.ASSET_DELETE,
      PERMISSIONS.ASSET_ASSIGN, PERMISSIONS.ASSET_MAINTAIN, PERMISSIONS.ASSET_EXPORT, PERMISSIONS.CATALOG_MANAGE,
    ],
  },
  {
    key: "consumable",
    permissions: [
      PERMISSIONS.CONSUMABLE_VIEW, PERMISSIONS.CONSUMABLE_MANAGE,
      PERMISSIONS.LICENSE_VIEW, PERMISSIONS.LICENSE_MANAGE,
    ],
  },
  {
    key: "ticket",
    permissions: [
      PERMISSIONS.TICKET_CREATE, PERMISSIONS.TICKET_VIEW_ALL, PERMISSIONS.TICKET_UPDATE,
      PERMISSIONS.TICKET_ASSIGN, PERMISSIONS.TICKET_DELETE, PERMISSIONS.TICKET_CONFIG,
    ],
  },
  {
    key: "employee",
    permissions: [
      PERMISSIONS.EMPLOYEE_VIEW, PERMISSIONS.EMPLOYEE_CREATE, PERMISSIONS.EMPLOYEE_UPDATE,
      PERMISSIONS.EMPLOYEE_DELETE, PERMISSIONS.EMPLOYEE_SALARY_VIEW, PERMISSIONS.ORG_MANAGE,
    ],
  },
  {
    key: "leave",
    permissions: [PERMISSIONS.LEAVE_VIEW_ALL, PERMISSIONS.LEAVE_APPROVE, PERMISSIONS.LEAVE_MANAGE],
  },
  {
    key: "admin",
    permissions: [
      PERMISSIONS.REPORT_VIEW, PERMISSIONS.ADMIN_USERS, PERMISSIONS.ADMIN_ROLES,
      PERMISSIONS.ADMIN_SETTINGS, PERMISSIONS.ADMIN_AUDIT,
    ],
  },
];
