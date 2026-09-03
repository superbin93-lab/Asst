"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Eye, MoreHorizontal, Pencil, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { ConfirmDialog, useConfirmState } from "@/components/shared/confirm-dialog";
import { deleteAsset } from "./actions";

export function AssetRowActions({
  assetId,
  assetTag,
  assetName,
  status,
  canAssign,
  canUpdate,
  canDelete,
}: {
  assetId: string;
  assetTag: string;
  assetName: string;
  status: string;
  canAssign: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const t = useTranslations("common");
  const ta = useTranslations("assets");
  const router = useRouter();
  const confirm = useConfirmState();

  const assignable = status === "IN_STOCK" || status === "RESERVED";

  return (
    <>
      <Dropdown>
        <DropdownTrigger asChild>
          <Button variant="ghost" size="iconSm" aria-label={t("labels.actions")}>
            <MoreHorizontal />
          </Button>
        </DropdownTrigger>
        <DropdownContent>
          <DropdownItem asChild>
            <Link href={`/assets/${assetId}`}>
              <Eye />
              {t("actions.viewDetail")}
            </Link>
          </DropdownItem>

          {canUpdate ? (
            <DropdownItem asChild>
              <Link href={`/assets/${assetId}/edit`}>
                <Pencil />
                {t("actions.edit")}
              </Link>
            </DropdownItem>
          ) : null}

          {canAssign && assignable ? (
            <DropdownItem onSelect={() => router.push(`/assets/${assetId}?action=assign`)}>
              <UserPlus />
              {ta("assignment.assignTitle")}
            </DropdownItem>
          ) : null}

          {canDelete ? (
            <>
              <DropdownSeparator />
              <DropdownItem tone="danger" onSelect={() => setTimeout(confirm.openDialog, 0)}>
                <Trash2 />
                {t("actions.delete")}
              </DropdownItem>
            </>
          ) : null}
        </DropdownContent>
      </Dropdown>

      <ConfirmDialog
        open={confirm.open}
        onOpenChange={confirm.setOpen}
        title={t("confirmDelete.title")}
        description={t("confirmDelete.description", { name: `${assetTag} - ${assetName}` })}
        confirmLabel={t("confirmDelete.confirm")}
        successMessage={t("toast.deleted")}
        action={() => deleteAsset(assetId)}
      />
    </>
  );
}
