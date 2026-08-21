import type { ComponentPropsWithoutRef, ElementRef, ForwardRefExoticComponent, RefAttributes } from 'react';
import type * as TabsPrimitive from '@radix-ui/react-tabs';

export const Tabs: ForwardRefExoticComponent<
  ComponentPropsWithoutRef<typeof TabsPrimitive.Root> & RefAttributes<ElementRef<typeof TabsPrimitive.Root>>
>;
export const TabsList: ForwardRefExoticComponent<
  ComponentPropsWithoutRef<typeof TabsPrimitive.List> & RefAttributes<ElementRef<typeof TabsPrimitive.List>>
>;
export const TabsTrigger: ForwardRefExoticComponent<
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & RefAttributes<ElementRef<typeof TabsPrimitive.Trigger>>
>;
export const TabsContent: ForwardRefExoticComponent<
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content> & RefAttributes<ElementRef<typeof TabsPrimitive.Content>>
>;
