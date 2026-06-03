import * as React from 'react';
import type { VariantProps } from 'class-variance-authority';

export declare const badgeVariants: (props?: { variant?: 'default' | 'secondary' | 'destructive' | 'outline' }) => string;

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps): React.ReactElement;
