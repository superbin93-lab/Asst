/**
 * Seeds the reference data a fresh installation needs, plus an optional set of
 * demo records. Safe to re-run: every write is an upsert keyed on a natural id.
 *
 *   npm run db:seed              # reference data + demo data
 *   SEED_DEMO=false npm run db:seed
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { ROLE_PRESETS } from "../src/lib/auth/permissions";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const SEED_DEMO = process.env.SEED_DEMO !== "false";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@company.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";

async function seedSettings() {
  await db.setting.upsert({
    where: { key: "app" },
    create: {
      key: "app",
      value: {
        companyName: "Công ty TNHH Demo",
        companyTaxCode: "0101234567",
        companyAddress: "123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh",
        companyPhone: "028 1234 5678",
        companyEmail: "info@company.local",
        currency: "VND",
        timezone: "Asia/Ho_Chi_Minh",
        workweek: [1, 2, 3, 4, 5],
        assetTagPrefix: "AST",
        ticketCodePrefix: "TK",
        leaveCodePrefix: "LV",
        approvalLevels: 2,
        warrantyAlertDays: 30,
        licenseAlertDays: 30,
      },
    },
    update: {},
  });
  console.log("  settings");
}

async function seedRoles() {
  for (const [code, preset] of Object.entries(ROLE_PRESETS)) {
    const role = await db.role.upsert({
      where: { code },
      create: {
        code,
        name: preset.name,
        nameEn: preset.nameEn,
        description: preset.description,
        isSystem: true,
      },
      update: { name: preset.name, nameEn: preset.nameEn, description: preset.description },
    });

    // Keep system roles aligned with the catalogue as new permissions ship.
    await db.rolePermission.deleteMany({
      where: { roleId: role.id, permission: { notIn: [...preset.permissions] } },
    });
    for (const permission of preset.permissions) {
      await db.rolePermission.upsert({
        where: { roleId_permission: { roleId: role.id, permission } },
        create: { roleId: role.id, permission },
        update: {},
      });
    }
  }
  console.log(`  roles (${Object.keys(ROLE_PRESETS).length})`);
}

async function seedAdmin() {
  const superAdmin = await db.role.findUniqueOrThrow({ where: { code: "SUPER_ADMIN" } });
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const user = await db.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      email: ADMIN_EMAIL,
      name: "Quản trị hệ thống",
      passwordHash,
      isSuperAdmin: true,
      locale: "vi",
    },
    update: { isSuperAdmin: true, isActive: true },
  });

  await db.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: superAdmin.id } },
    create: { userId: user.id, roleId: superAdmin.id },
    update: {},
  });
  console.log(`  admin user (${ADMIN_EMAIL})`);
}

const LEAVE_TYPES = [
  { code: "ANNUAL", name: "Phép năm", nameEn: "Annual leave", color: "#2563eb", defaultDaysPerYear: 12, isPaid: true, carryOverLimitDays: 5, carryOverExpiry: "03-31", minNoticeDays: 3, deductsBalance: true },
  { code: "SICK", name: "Nghỉ ốm", nameEn: "Sick leave", color: "#dc2626", defaultDaysPerYear: 30, isPaid: true, requiresAttachment: true, minNoticeDays: 0, deductsBalance: true },
  { code: "UNPAID", name: "Nghỉ không lương", nameEn: "Unpaid leave", color: "#6b7280", defaultDaysPerYear: 0, isPaid: false, minNoticeDays: 5, deductsBalance: false },
  { code: "MARRIAGE", name: "Nghỉ cưới", nameEn: "Marriage leave", color: "#db2777", defaultDaysPerYear: 3, isPaid: true, maxConsecutiveDays: 3, minNoticeDays: 7, deductsBalance: false },
  { code: "BEREAVEMENT", name: "Nghỉ tang", nameEn: "Bereavement leave", color: "#334155", defaultDaysPerYear: 3, isPaid: true, maxConsecutiveDays: 3, minNoticeDays: 0, deductsBalance: false },
  { code: "MATERNITY", name: "Thai sản", nameEn: "Maternity leave", color: "#7c3aed", defaultDaysPerYear: 180, isPaid: true, requiresAttachment: true, allowHalfDay: false, minNoticeDays: 30, deductsBalance: false },
  { code: "COMP", name: "Nghỉ bù", nameEn: "Compensatory leave", color: "#059669", defaultDaysPerYear: 0, isPaid: true, minNoticeDays: 1, deductsBalance: true },
];

async function seedLeaveTypes() {
  for (const t of LEAVE_TYPES) {
    await db.leaveType.upsert({
      where: { code: t.code },
      create: t,
      update: { name: t.name, nameEn: t.nameEn, color: t.color },
    });
  }
  console.log(`  leave types (${LEAVE_TYPES.length})`);
}

const HOLIDAYS = [
  { md: "01-01", name: "Tết Dương lịch", nameEn: "New Year's Day" },
  { md: "04-30", name: "Ngày Giải phóng miền Nam", nameEn: "Reunification Day" },
  { md: "05-01", name: "Quốc tế Lao động", nameEn: "International Labour Day" },
  { md: "09-02", name: "Quốc khánh", nameEn: "National Day" },
];

async function seedHolidays() {
  const year = new Date().getFullYear();
  for (const h of HOLIDAYS) {
    const date = new Date(`${year}-${h.md}T00:00:00.000Z`);
    await db.holiday.upsert({
      where: { date_name: { date, name: h.name } },
      create: { date, name: h.name, nameEn: h.nameEn, isRecurring: true },
      update: { nameEn: h.nameEn, isRecurring: true },
    });
  }
  console.log(`  public holidays (${HOLIDAYS.length}, recurring)`);
}

const ASSET_CATEGORIES = [
  { code: "LAPTOP", name: "Laptop", nameEn: "Laptop", icon: "laptop", defaultUsefulLifeMonths: 48, defaultWarrantyMonths: 24 },
  { code: "DESKTOP", name: "Máy tính để bàn", nameEn: "Desktop", icon: "monitor", defaultUsefulLifeMonths: 60, defaultWarrantyMonths: 24 },
  { code: "MONITOR", name: "Màn hình", nameEn: "Monitor", icon: "monitor", defaultUsefulLifeMonths: 60, defaultWarrantyMonths: 36 },
  { code: "PHONE", name: "Điện thoại", nameEn: "Mobile phone", icon: "smartphone", defaultUsefulLifeMonths: 36, defaultWarrantyMonths: 12 },
  { code: "PRINTER", name: "Máy in", nameEn: "Printer", icon: "printer", defaultUsefulLifeMonths: 60, defaultWarrantyMonths: 12 },
  { code: "NETWORK", name: "Thiết bị mạng", nameEn: "Network equipment", icon: "router", defaultUsefulLifeMonths: 60, defaultWarrantyMonths: 36 },
  { code: "SERVER", name: "Máy chủ", nameEn: "Server", icon: "server", defaultUsefulLifeMonths: 72, defaultWarrantyMonths: 36 },
  { code: "PERIPHERAL", name: "Phụ kiện", nameEn: "Peripheral", icon: "mouse", defaultUsefulLifeMonths: 24, defaultWarrantyMonths: 12 },
];

const LOCATIONS = [
  { code: "HQ", name: "Trụ sở chính", type: "OFFICE" as const, parent: null, address: "123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh" },
  { code: "HQ-F1", name: "Tầng 1", type: "FLOOR" as const, parent: "HQ" },
  { code: "HQ-F2", name: "Tầng 2", type: "FLOOR" as const, parent: "HQ" },
  { code: "HQ-WH", name: "Kho IT", type: "WAREHOUSE" as const, parent: "HQ" },
  { code: "HQ-DC", name: "Phòng máy chủ", type: "DATACENTER" as const, parent: "HQ" },
];

const VENDORS = [
  { code: "DELL", name: "Dell Technologies", isManufacturer: true, isSupplier: false, website: "https://dell.com" },
  { code: "HP", name: "HP Inc.", isManufacturer: true, isSupplier: false, website: "https://hp.com" },
  { code: "LENOVO", name: "Lenovo", isManufacturer: true, isSupplier: false, website: "https://lenovo.com" },
  { code: "APPLE", name: "Apple", isManufacturer: true, isSupplier: false, website: "https://apple.com" },
  { code: "PHONGVU", name: "Phong Vũ", isManufacturer: false, isSupplier: true, phone: "1800 6865" },
  { code: "FPTSHOP", name: "FPT Shop", isManufacturer: false, isSupplier: true, phone: "1800 6601" },
];

async function seedCatalog() {
  for (const c of ASSET_CATEGORIES) {
    await db.assetCategory.upsert({ where: { code: c.code }, create: c, update: { name: c.name, nameEn: c.nameEn } });
  }
  for (const l of LOCATIONS) {
    const parent = l.parent ? await db.location.findUnique({ where: { code: l.parent } }) : null;
    await db.location.upsert({
      where: { code: l.code },
      create: { code: l.code, name: l.name, type: l.type, address: l.address, parentId: parent?.id },
      update: { name: l.name, parentId: parent?.id },
    });
  }
  for (const v of VENDORS) {
    await db.vendor.upsert({ where: { code: v.code }, create: v, update: { name: v.name } });
  }
  console.log(`  catalogue (${ASSET_CATEGORIES.length} categories, ${LOCATIONS.length} locations, ${VENDORS.length} vendors)`);
}

const SLA_POLICIES = [
  { name: "Tiêu chuẩn", priority: "URGENT" as const, responseMinutes: 30, resolutionMinutes: 240 },
  { name: "Tiêu chuẩn", priority: "HIGH" as const, responseMinutes: 60, resolutionMinutes: 480 },
  { name: "Tiêu chuẩn", priority: "MEDIUM" as const, responseMinutes: 240, resolutionMinutes: 1440 },
  { name: "Tiêu chuẩn", priority: "LOW" as const, responseMinutes: 480, resolutionMinutes: 2880 },
];

const TICKET_CATEGORIES = [
  { code: "HARDWARE", name: "Sự cố phần cứng", nameEn: "Hardware issue" },
  { code: "SOFTWARE", name: "Sự cố phần mềm", nameEn: "Software issue" },
  { code: "NETWORK", name: "Mạng và Internet", nameEn: "Network & internet" },
  { code: "ACCOUNT", name: "Tài khoản và quyền truy cập", nameEn: "Account & access" },
  { code: "REQUEST", name: "Yêu cầu cấp thiết bị", nameEn: "Equipment request" },
  { code: "OTHER", name: "Khác", nameEn: "Other" },
];

async function seedHelpdesk() {
  for (const p of SLA_POLICIES) {
    await db.slaPolicy.upsert({
      where: { name_priority: { name: p.name, priority: p.priority } },
      create: { ...p, businessHoursOnly: true },
      update: { responseMinutes: p.responseMinutes, resolutionMinutes: p.resolutionMinutes },
    });
  }
  const mediumSla = await db.slaPolicy.findFirst({ where: { name: "Tiêu chuẩn", priority: "MEDIUM" } });
  for (const c of TICKET_CATEGORIES) {
    await db.ticketCategory.upsert({
      where: { code: c.code },
      create: { ...c, slaPolicyId: mediumSla?.id },
      update: { name: c.name, nameEn: c.nameEn },
    });
  }
  console.log(`  helpdesk (${SLA_POLICIES.length} SLA rows, ${TICKET_CATEGORIES.length} categories)`);
}

const DEPARTMENTS = [
  { code: "BOD", name: "Ban giám đốc", nameEn: "Board of directors", parent: null },
  { code: "IT", name: "Phòng Công nghệ thông tin", nameEn: "IT department", parent: "BOD" },
  { code: "HR", name: "Phòng Nhân sự", nameEn: "Human resources", parent: "BOD" },
  { code: "FIN", name: "Phòng Tài chính - Kế toán", nameEn: "Finance & accounting", parent: "BOD" },
  { code: "SALES", name: "Phòng Kinh doanh", nameEn: "Sales", parent: "BOD" },
  { code: "OPS", name: "Phòng Vận hành", nameEn: "Operations", parent: "BOD" },
];

const POSITIONS = [
  { code: "CEO", title: "Tổng giám đốc", titleEn: "Chief executive officer", level: 10 },
  { code: "HEAD", title: "Trưởng phòng", titleEn: "Head of department", level: 7 },
  { code: "LEAD", title: "Trưởng nhóm", titleEn: "Team lead", level: 5 },
  { code: "SENIOR", title: "Chuyên viên cao cấp", titleEn: "Senior specialist", level: 4 },
  { code: "STAFF", title: "Nhân viên", titleEn: "Staff", level: 2 },
  { code: "INTERN", title: "Thực tập sinh", titleEn: "Intern", level: 1 },
];

async function seedOrg() {
  for (const d of DEPARTMENTS) {
    const parent = d.parent ? await db.department.findUnique({ where: { code: d.parent } }) : null;
    await db.department.upsert({
      where: { code: d.code },
      create: { code: d.code, name: d.name, nameEn: d.nameEn, parentId: parent?.id },
      update: { name: d.name, nameEn: d.nameEn, parentId: parent?.id },
    });
  }
  for (const p of POSITIONS) {
    await db.position.upsert({ where: { code: p.code }, create: p, update: { title: p.title, titleEn: p.titleEn } });
  }
  console.log(`  org (${DEPARTMENTS.length} departments, ${POSITIONS.length} positions)`);
}

const DEMO_EMPLOYEES = [
  { code: "NV0001", name: "Nguyễn Văn An", email: "an.nguyen@company.local", dept: "BOD", pos: "CEO", gender: "MALE" as const, hire: "2019-03-01", role: null, manager: null },
  { code: "NV0002", name: "Trần Thị Bích", email: "bich.tran@company.local", dept: "HR", pos: "HEAD", gender: "FEMALE" as const, hire: "2020-06-15", role: "HR_ADMIN", manager: "NV0001" },
  { code: "NV0003", name: "Lê Minh Cường", email: "cuong.le@company.local", dept: "IT", pos: "HEAD", gender: "MALE" as const, hire: "2020-01-06", role: "IT_ADMIN", manager: "NV0001" },
  { code: "NV0004", name: "Phạm Thu Dung", email: "dung.pham@company.local", dept: "IT", pos: "SENIOR", gender: "FEMALE" as const, hire: "2021-09-01", role: "IT_STAFF", manager: "NV0003" },
  { code: "NV0005", name: "Hoàng Đức Em", email: "em.hoang@company.local", dept: "SALES", pos: "HEAD", gender: "MALE" as const, hire: "2021-02-01", role: "MANAGER", manager: "NV0001" },
  { code: "NV0006", name: "Vũ Thị Giang", email: "giang.vu@company.local", dept: "SALES", pos: "STAFF", gender: "FEMALE" as const, hire: "2023-04-10", role: "EMPLOYEE", manager: "NV0005" },
  { code: "NV0007", name: "Đỗ Quang Huy", email: "huy.do@company.local", dept: "FIN", pos: "LEAD", gender: "MALE" as const, hire: "2022-08-22", role: "EMPLOYEE", manager: "NV0001" },
  { code: "NV0008", name: "Bùi Khánh Linh", email: "linh.bui@company.local", dept: "OPS", pos: "STAFF", gender: "FEMALE" as const, hire: "2024-01-15", role: "EMPLOYEE", manager: "NV0001" },
];

async function seedDemoEmployees() {
  const hq = await db.location.findUnique({ where: { code: "HQ" } });
  const passwordHash = await bcrypt.hash("Demo@12345", 12);

  for (const e of DEMO_EMPLOYEES) {
    const dept = await db.department.findUniqueOrThrow({ where: { code: e.dept } });
    const pos = await db.position.findUniqueOrThrow({ where: { code: e.pos } });
    const manager = e.manager ? await db.employee.findUnique({ where: { employeeCode: e.manager } }) : null;

    const employee = await db.employee.upsert({
      where: { employeeCode: e.code },
      create: {
        employeeCode: e.code,
        fullName: e.name,
        email: e.email,
        gender: e.gender,
        departmentId: dept.id,
        positionId: pos.id,
        managerId: manager?.id,
        locationId: hq?.id,
        hireDate: new Date(`${e.hire}T00:00:00.000Z`),
        status: "ACTIVE",
        employmentType: "FULL_TIME",
      },
      update: { departmentId: dept.id, positionId: pos.id, managerId: manager?.id },
    });

    if (e.role) {
      const role = await db.role.findUniqueOrThrow({ where: { code: e.role } });
      const user = await db.user.upsert({
        where: { email: e.email },
        create: { email: e.email, name: e.name, passwordHash, employeeId: employee.id, locale: "vi" },
        update: { employeeId: employee.id },
      });
      await db.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        create: { userId: user.id, roleId: role.id },
        update: {},
      });
    }
  }

  // Department heads become the department managers used by the approval flow.
  for (const [deptCode, empCode] of [["HR", "NV0002"], ["IT", "NV0003"], ["SALES", "NV0005"], ["BOD", "NV0001"]] as const) {
    const emp = await db.employee.findUnique({ where: { employeeCode: empCode } });
    if (emp) await db.department.update({ where: { code: deptCode }, data: { managerId: emp.id } });
  }

  console.log(`  demo employees (${DEMO_EMPLOYEES.length}, password Demo@12345)`);
}

async function seedDemoBalances() {
  const year = new Date().getFullYear();
  const employees = await db.employee.findMany({ where: { status: { not: "TERMINATED" } } });
  const types = await db.leaveType.findMany({ where: { isActive: true, deductsBalance: true } });

  let count = 0;
  for (const emp of employees) {
    for (const type of types) {
      await db.leaveBalance.upsert({
        where: { employeeId_leaveTypeId_year: { employeeId: emp.id, leaveTypeId: type.id, year } },
        create: { employeeId: emp.id, leaveTypeId: type.id, year, entitledDays: type.defaultDaysPerYear },
        update: {},
      });
      count++;
    }
  }
  console.log(`  leave balances for ${year} (${count} rows)`);
}

const DEMO_ASSETS = [
  { name: "Dell Latitude 5440", cat: "LAPTOP", man: "DELL", sup: "PHONGVU", model: "Latitude 5440", serial: "DL5440-001", cost: 21500000, months: 8, holder: "NV0003", specs: { cpu: "Intel Core i5-1345U", ram: "16GB DDR5", storage: "512GB NVMe", screen: "14 inch FHD" } },
  { name: "Dell Latitude 5440", cat: "LAPTOP", man: "DELL", sup: "PHONGVU", model: "Latitude 5440", serial: "DL5440-002", cost: 21500000, months: 8, holder: "NV0004", specs: { cpu: "Intel Core i5-1345U", ram: "16GB DDR5", storage: "512GB NVMe", screen: "14 inch FHD" } },
  { name: "MacBook Pro 14 M3", cat: "LAPTOP", man: "APPLE", sup: "FPTSHOP", model: "MacBook Pro 14", serial: "MBP14-001", cost: 48900000, months: 5, holder: "NV0001", specs: { cpu: "Apple M3 Pro", ram: "18GB", storage: "512GB SSD" } },
  { name: "ThinkPad E14 Gen 5", cat: "LAPTOP", man: "LENOVO", sup: "PHONGVU", model: "E14 Gen 5", serial: "TPE14-001", cost: 17900000, months: 14, holder: "NV0006", specs: { cpu: "AMD Ryzen 5 7530U", ram: "16GB", storage: "512GB SSD" } },
  { name: "ThinkPad E14 Gen 5", cat: "LAPTOP", man: "LENOVO", sup: "PHONGVU", model: "E14 Gen 5", serial: "TPE14-002", cost: 17900000, months: 14, holder: null, specs: { cpu: "AMD Ryzen 5 7530U", ram: "16GB", storage: "512GB SSD" } },
  { name: "Dell UltraSharp U2723QE", cat: "MONITOR", man: "DELL", sup: "PHONGVU", model: "U2723QE", serial: "DU27-001", cost: 12400000, months: 8, holder: "NV0003", specs: { size: "27 inch", resolution: "4K UHD", panel: "IPS Black" } },
  { name: "HP LaserJet Pro M404dn", cat: "PRINTER", man: "HP", sup: "FPTSHOP", model: "M404dn", serial: "HPM404-001", cost: 7200000, months: 22, holder: null, specs: { type: "Laser mono", duplex: "Có", network: "Ethernet" } },
  { name: "Cisco Catalyst 2960X", cat: "NETWORK", man: null, sup: "PHONGVU", model: "WS-C2960X-24TS-L", serial: "CS2960-001", cost: 18500000, months: 30, holder: null, specs: { ports: "24 x 1GbE", uplink: "4 x SFP" } },
  { name: "Dell PowerEdge R450", cat: "SERVER", man: "DELL", sup: "PHONGVU", model: "PowerEdge R450", serial: "PER450-001", cost: 96000000, months: 18, holder: null, specs: { cpu: "2 x Xeon Silver 4310", ram: "64GB ECC", storage: "4 x 960GB SSD" } },
  { name: "iPhone 15", cat: "PHONE", man: "APPLE", sup: "FPTSHOP", model: "iPhone 15 128GB", serial: "IP15-001", cost: 19900000, months: 6, holder: "NV0005", specs: { storage: "128GB", color: "Đen" } },
];

async function seedDemoAssets() {
  const admin = await db.user.findUnique({ where: { email: ADMIN_EMAIL } });
  const warehouse = await db.location.findUnique({ where: { code: "HQ-WH" } });
  const office = await db.location.findUnique({ where: { code: "HQ-F2" } });

  const index = await db.sequence.findUnique({ where: { key: `asset:${new Date().getFullYear()}` } });
  let counter = index?.value ?? 0;

  for (const a of DEMO_ASSETS) {
    const existing = await db.asset.findFirst({ where: { serialNumber: a.serial } });
    if (existing) continue;

    counter++;
    const year = new Date().getFullYear();
    const assetTag = `AST-${year}-${String(counter).padStart(4, "0")}`;
    const category = await db.assetCategory.findUniqueOrThrow({ where: { code: a.cat } });
    const manufacturer = a.man ? await db.vendor.findUnique({ where: { code: a.man } }) : null;
    const supplier = await db.vendor.findUnique({ where: { code: a.sup } });
    const holder = a.holder ? await db.employee.findUnique({ where: { employeeCode: a.holder } }) : null;

    const purchaseDate = new Date();
    purchaseDate.setMonth(purchaseDate.getMonth() - a.months);
    const warrantyEndAt = new Date(purchaseDate);
    warrantyEndAt.setMonth(warrantyEndAt.getMonth() + (category.defaultWarrantyMonths ?? 12));

    const asset = await db.asset.create({
      data: {
        assetTag,
        name: a.name,
        categoryId: category.id,
        status: holder ? "ASSIGNED" : "IN_STOCK",
        condition: a.months > 24 ? "FAIR" : "GOOD",
        serialNumber: a.serial,
        model: a.model,
        manufacturerId: manufacturer?.id,
        supplierId: supplier?.id,
        purchaseDate,
        purchaseCost: a.cost,
        currency: "VND",
        warrantyMonths: category.defaultWarrantyMonths,
        warrantyEndAt,
        usefulLifeMonths: category.defaultUsefulLifeMonths,
        depreciationMethod: "STRAIGHT_LINE",
        locationId: holder ? office?.id : warehouse?.id,
        departmentId: holder?.departmentId,
        holderId: holder?.id,
        specs: a.specs,
        createdById: admin?.id,
      },
    });

    await db.assetEvent.create({
      data: { assetId: asset.id, type: "created", message: `Tạo tài sản ${assetTag}`, actorId: admin?.id },
    });

    if (holder) {
      await db.assetAssignment.create({
        data: {
          assetId: asset.id,
          employeeId: holder.id,
          assignedAt: purchaseDate,
          conditionOut: "GOOD",
          issuedById: admin?.id,
          status: "ACTIVE",
        },
      });
      await db.assetEvent.create({
        data: { assetId: asset.id, type: "assigned", message: `Cấp phát cho ${holder.fullName}`, actorId: admin?.id },
      });
    }
  }

  await db.sequence.upsert({
    where: { key: `asset:${new Date().getFullYear()}` },
    create: { key: `asset:${new Date().getFullYear()}`, value: counter },
    update: { value: counter },
  });
  console.log(`  demo assets (${DEMO_ASSETS.length})`);
}

const DEMO_TICKETS = [
  { title: "Laptop không kết nối được Wi-Fi công ty", cat: "NETWORK", priority: "HIGH" as const, requester: "NV0006", assignee: "cuong.le@company.local", status: "OPEN" as const, ageHours: 6, description: "Máy báo đã kết nối nhưng không truy cập được internet. Đã thử quên mạng và kết nối lại vẫn không được." },
  { title: "Xin cấp thêm màn hình phụ", cat: "REQUEST", priority: "LOW" as const, requester: "NV0007", assignee: null, status: "NEW" as const, ageHours: 30, description: "Công việc kế toán cần đối chiếu nhiều bảng tính, xin cấp thêm một màn hình 24 inch." },
  { title: "Máy in tầng 2 kẹt giấy liên tục", cat: "HARDWARE", priority: "MEDIUM" as const, requester: "NV0008", assignee: "dung.pham@company.local", status: "PENDING_REQUESTER" as const, ageHours: 20, description: "Máy in HP LaserJet ở tầng 2 kẹt giấy khoảng 3 lần mỗi ngày." },
  { title: "Quên mật khẩu tài khoản email", cat: "ACCOUNT", priority: "URGENT" as const, requester: "NV0006", assignee: "dung.pham@company.local", status: "RESOLVED" as const, ageHours: 50, description: "Không đăng nhập được email công ty sau khi đổi mật khẩu." },
  { title: "Cài đặt phần mềm kế toán MISA", cat: "SOFTWARE", priority: "MEDIUM" as const, requester: "NV0007", assignee: "cuong.le@company.local", status: "CLOSED" as const, ageHours: 120, description: "Cần cài MISA SME phiên bản mới nhất trên máy trạm kế toán." },
];

async function seedDemoTickets() {
  const year = new Date().getFullYear();
  let counter = (await db.sequence.findUnique({ where: { key: `ticket:${year}` } }))?.value ?? 0;

  for (const t of DEMO_TICKETS) {
    const existing = await db.ticket.findFirst({ where: { title: t.title } });
    if (existing) continue;

    counter++;
    const category = await db.ticketCategory.findUniqueOrThrow({ where: { code: t.cat } });
    const requester = await db.employee.findUniqueOrThrow({ where: { employeeCode: t.requester } });
    const assignee = t.assignee ? await db.user.findUnique({ where: { email: t.assignee } }) : null;
    const sla = await db.slaPolicy.findFirst({ where: { name: "Tiêu chuẩn", priority: t.priority } });

    const createdAt = new Date(Date.now() - t.ageHours * 3_600_000);
    const resolved = t.status === "RESOLVED" || t.status === "CLOSED";

    const ticket = await db.ticket.create({
      data: {
        code: `TK-${year}-${String(counter).padStart(4, "0")}`,
        title: t.title,
        description: t.description,
        categoryId: category.id,
        priority: t.priority,
        status: t.status,
        requesterId: requester.id,
        departmentId: requester.departmentId,
        assigneeId: assignee?.id,
        createdAt,
        responseDueAt: sla ? new Date(createdAt.getTime() + sla.responseMinutes * 60_000) : null,
        resolutionDueAt: sla ? new Date(createdAt.getTime() + sla.resolutionMinutes * 60_000) : null,
        firstResponseAt: assignee ? new Date(createdAt.getTime() + 25 * 60_000) : null,
        resolvedAt: resolved ? new Date(createdAt.getTime() + 3 * 3_600_000) : null,
        closedAt: t.status === "CLOSED" ? new Date(createdAt.getTime() + 5 * 3_600_000) : null,
        resolution: resolved ? "Đã xử lý và xác nhận với người dùng." : null,
      },
    });

    await db.ticketEvent.create({
      data: { ticketId: ticket.id, type: "created", message: "Tạo ticket", createdAt },
    });
    if (assignee) {
      await db.ticketEvent.create({
        data: { ticketId: ticket.id, type: "assigned", message: `Giao cho ${assignee.name}`, actorId: assignee.id, createdAt: new Date(createdAt.getTime() + 60_000) },
      });
    }
  }

  await db.sequence.upsert({
    where: { key: `ticket:${year}` },
    create: { key: `ticket:${year}`, value: counter },
    update: { value: counter },
  });
  console.log(`  demo tickets (${DEMO_TICKETS.length})`);
}

async function main() {
  console.log("Seeding reference data...");
  await seedSettings();
  await seedRoles();
  await seedAdmin();
  await seedLeaveTypes();
  await seedHolidays();
  await seedCatalog();
  await seedHelpdesk();
  await seedOrg();

  if (SEED_DEMO) {
    console.log("Seeding demo data...");
    await seedDemoEmployees();
    await seedDemoBalances();
    await seedDemoAssets();
    await seedDemoTickets();
  }

  console.log("\nDone.");
  console.log(`  Sign in as ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  if (SEED_DEMO) console.log("  Demo accounts use the password Demo@12345");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
