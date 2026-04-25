"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-2xl border border-emerald-950/10 bg-white/65 p-1 text-emerald-950 shadow-sm shadow-emerald-950/10 backdrop-blur-sm dark:border-emerald-100/10 dark:bg-zinc-900/55 dark:text-emerald-100",
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "awp-focus-ring inline-flex items-center justify-center whitespace-nowrap rounded-xl px-3 py-1.5 text-sm font-semibold text-emerald-950 transition-[background-color,box-shadow,color] disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white/90 data-[state=active]:text-emerald-950 data-[state=active]:shadow-sm dark:text-emerald-200/90 dark:data-[state=active]:bg-zinc-800/90 dark:data-[state=active]:text-emerald-50 dark:data-[state=active]:shadow-md",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-3 awp-focus-ring",
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
