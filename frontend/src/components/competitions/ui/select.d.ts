import * as React from 'react';

export const Select: React.ComponentType<{
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}>;

export const SelectGroup: React.ComponentType<{ children?: React.ReactNode }>;

export const SelectValue: React.ComponentType<{
  placeholder?: string;
  className?: string;
}>;

export const SelectTrigger: React.ForwardRefExoticComponent<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children?: React.ReactNode;
    className?: string;
  } & React.RefAttributes<HTMLButtonElement>
>;

export const SelectContent: React.ForwardRefExoticComponent<
  {
    children?: React.ReactNode;
    className?: string;
    position?: 'item-aligned' | 'popper';
  } & React.RefAttributes<HTMLDivElement>
>;

export const SelectLabel: React.ForwardRefExoticComponent<
  React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>
>;

export const SelectItem: React.ForwardRefExoticComponent<
  {
    value: string;
    disabled?: boolean;
    className?: string;
    children?: React.ReactNode;
  } & React.RefAttributes<HTMLDivElement>
>;

export const SelectSeparator: React.ForwardRefExoticComponent<
  React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>
>;

export const SelectScrollUpButton: React.ForwardRefExoticComponent<
  React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>
>;

export const SelectScrollDownButton: React.ForwardRefExoticComponent<
  React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>
>;
