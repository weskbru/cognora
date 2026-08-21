import type { ReactNode } from 'react';

export interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
}

export default function DeleteConfirmDialog(props: DeleteConfirmDialogProps): ReactNode;
