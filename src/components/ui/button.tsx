import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-semibold text-sm transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 touch-target mobile-tap-highlight",
  {
    variants: {
      variant: {
        // Primary FacePay brand button
        default: "bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-lg hover:from-blue-700 hover:to-purple-700 hover:shadow-xl hover:scale-105",
        
        // Success/Confirm button
        success: "bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg shadow-lg hover:from-green-700 hover:to-emerald-700 hover:shadow-xl hover:scale-105",
        
        // Danger/Cancel button
        destructive: "bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg shadow-lg hover:from-red-700 hover:to-pink-700 hover:shadow-xl hover:scale-105",
        
        // Outlined button
        outline: "border-2 border-gray-200 bg-white/50 backdrop-blur-sm text-foreground rounded-lg shadow-sm hover:bg-white hover:border-blue-500 hover:shadow-md dark:border-gray-700 dark:bg-gray-800/50 dark:hover:bg-gray-800",
        
        // Secondary glass button
        secondary: "bg-white/10 backdrop-blur-sm border border-white/20 text-foreground rounded-lg shadow-lg hover:bg-white/20 hover:border-white/30 hover:shadow-xl hover:scale-105",
        
        // Ghost button
        ghost: "text-foreground rounded-lg hover:bg-accent hover:text-accent-foreground",
        
        // Link button
        link: "text-blue-600 underline-offset-4 hover:underline dark:text-blue-400",
        
        // Biometric authentication button
        biometric: "bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-full shadow-lg hover:shadow-glow hover:scale-105 biometric-scan-mobile",
        
        // Payment flow button
        payment: "bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl shadow-xl hover:shadow-glow-green hover:scale-105 payment-flow-glow",
        
        // Premium glass button
        glass: "card-glass text-foreground rounded-xl hover:shadow-strong hover:scale-105",
        
        // Warning button
        warning: "bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg shadow-lg hover:from-yellow-600 hover:to-orange-600 hover:shadow-xl hover:scale-105"
      },
      size: {
        sm: "h-9 px-3 text-sm rounded-md",
        default: "h-10 px-4 py-2 text-sm rounded-lg",
        lg: "h-12 px-8 py-3 text-base rounded-lg",
        xl: "h-14 px-10 py-4 text-lg rounded-xl",
        icon: "h-10 w-10 rounded-lg",
        "icon-sm": "h-8 w-8 rounded-md",
        "icon-lg": "h-12 w-12 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {!loading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!loading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }