import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  description?: string | null;
  children?: ReactNode;
}

export default function PageHeader(props: PageHeaderProps): ReactNode;
