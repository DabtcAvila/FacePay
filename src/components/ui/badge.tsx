import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        // Primary brand badge
        default: "border-transparent bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm",
        
        // Secondary badge
        secondary: "border-transparent bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700",
        
        // Success badge
        success: "border-transparent bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-sm",
        
        // Destructive/Error badge
        destructive: "border-transparent bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-sm",
        
        // Warning badge
        warning: "border-transparent bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-sm",
        
        // Info badge
        info: "border-transparent bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-sm",
        
        // Outline badge
        outline: "border-gray-300 text-gray-700 bg-white hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:bg-transparent dark:hover:bg-gray-800",
        
        // Status badges for fintech
        active: "border-transparent bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        inactive: "border-transparent bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
        pending: "border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
        verified: "border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
        premium: "border-transparent bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md",
        
        // Payment status badges
        paid: "border-transparent bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        unpaid: "border-transparent bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
        processing: "border-transparent bg-blue-100 text-blue-800 animate-pulse dark:bg-blue-900/30 dark:text-blue-300",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        default: "px-3 py-1 text-xs",
        lg: "px-4 py-1.5 text-sm",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode
}

function Badge({ className, variant, size, icon, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {icon && <span className="mr-1">{icon}</span>}
      {children}
    </div>
  )
}

export { Badge, badgeVariants }