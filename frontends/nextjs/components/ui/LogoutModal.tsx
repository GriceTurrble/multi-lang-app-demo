"use client";

import { ConfirmModal } from "./ConfirmModal";

type Props = {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function LogoutModal({ open, onConfirm, onCancel }: Props) {
  return (
    <ConfirmModal
      open={open}
      title="Log out"
      message="Are you sure you want to log out?"
      confirmLabel="Log out"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
