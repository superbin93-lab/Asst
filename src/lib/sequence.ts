import "server-only";
import { db } from "./db";
import { getSettings } from "./settings";

type TxClient = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/**
 * Atomically bumps a named counter. Runs inside the caller's transaction when
 * one is supplied so a failed insert never burns a number.
 */
async function nextValue(key: string, client: TxClient | typeof db = db): Promise<number> {
  const row = await client.sequence.upsert({
    where: { key },
    create: { key, value: 1 },
    update: { value: { increment: 1 } },
  });
  return row.value;
}

const pad = (n: number, width = 4) => String(n).padStart(width, "0");

export async function nextAssetTag(client?: TxClient): Promise<string> {
  const { assetTagPrefix } = await getSettings();
  const year = new Date().getFullYear();
  const n = await nextValue(`asset:${year}`, client);
  return `${assetTagPrefix}-${year}-${pad(n)}`;
}

export async function nextTicketCode(client?: TxClient): Promise<string> {
  const { ticketCodePrefix } = await getSettings();
  const year = new Date().getFullYear();
  const n = await nextValue(`ticket:${year}`, client);
  return `${ticketCodePrefix}-${year}-${pad(n)}`;
}

export async function nextLeaveCode(client?: TxClient): Promise<string> {
  const { leaveCodePrefix } = await getSettings();
  const year = new Date().getFullYear();
  const n = await nextValue(`leave:${year}`, client);
  return `${leaveCodePrefix}-${year}-${pad(n)}`;
}

export async function nextEmployeeCode(client?: TxClient): Promise<string> {
  const n = await nextValue("employee", client);
  return `NV${pad(n)}`;
}

export async function nextConsumableCode(client?: TxClient): Promise<string> {
  const n = await nextValue("consumable", client);
  return `VT${pad(n)}`;
}
