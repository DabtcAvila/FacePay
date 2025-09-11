import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-xl border bg-card text-card-foreground shadow-sm transition-all duration-300",
  {
    variants: {
      variant: {
        // Default clean card
        default: "bg-white/80 backdrop-blur-xl border-white/20 shadow-xl dark:bg-gray-900/80 dark:border-gray-700/30",
        
        // Premium glass card
        glass: "bg-white/10 backdrop-blur-2xl border-white/20 shadow-2xl dark:bg-gray-900/10 dark:border-gray-700/30",
        
        // Elevated card with strong shadow
        elevated: "bg-white border-gray-200 shadow-strong hover:shadow-xl dark:bg-gray-900 dark:border-gray-700",
        
        // Interactive card with hover effects
        interactive: "bg-white/80 backdrop-blur-xl border-white/20 shadow-xl hover:shadow-2xl hover:scale-[1.02] cursor-pointer dark:bg-gray-900/80 dark:border-gray-700/30",
        
        // Payment card styling
        payment: "bg-gradient-to-br from-white via-white to-gray-50 border-gray-200 shadow-xl hover:shadow-2xl dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 dark:border-gray-700",
        
        // Success/confirmation card
        success: "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg dark:from-green-900/20 dark:to-emerald-900/20 dark:border-green-800/50",
        
        // Error/warning card
        error: "bg-gradient-to-br from-red-50 to-pink-50 border-red-200 shadow-lg dark:from-red-900/20 dark:to-pink-900/20 dark:border-red-800/50",
        
        // Warning card
        warning: "bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200 shadow-lg dark:from-yellow-900/20 dark:to-orange-900/20 dark:border-yellow-800/50"
      },
      size: {
        sm: "p-4 rounded-lg",
        default: "p-6 rounded-xl",
        lg: "p-8 rounded-2xl",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, size }), className)}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-2 p-6 pb-4", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-xl font-bold leading-tight tracking-tight text-foreground",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground leading-relaxed", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("px-6 pb-6 pt-2", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center justify-between px-6 py-4 bg-gray-50/50 rounded-b-xl dark:bg-gray-800/50", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }