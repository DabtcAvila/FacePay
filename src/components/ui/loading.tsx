import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const loadingVariants = cva(
  "inline-flex items-center justify-center",
  {
    variants: {
      variant: {
        spinner: "animate-spin rounded-full border-2 border-gray-200 border-t-blue-600",
        dots: "flex space-x-1",
        skeleton: "animate-pulse bg-gray-200 rounded",
        pulse: "animate-pulse-fast",
        glow: "animate-glow-pulse rounded-full bg-gradient-to-r from-blue-500 to-purple-500",
        fintech: "biometric-scanner animate-pulse-glow",
      },
      size: {
        sm: "w-4 h-4",
        md: "w-6 h-6", 
        lg: "w-8 h-8",
        xl: "w-12 h-12",
      }
    },
    defaultVariants: {
      variant: "spinner",
      size: "md",
    },
  }
)

export interface LoadingProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof loadingVariants> {
  text?: string
}

const Loading = React.forwardRef<HTMLDivElement, LoadingProps>(
  ({ className, variant, size, text, ...props }, ref) => {
    if (variant === "dots") {
      return (
        <div
          ref={ref}
          className={cn("flex items-center space-x-2", className)}
          {...props}
        >
          <div className="loading-dots">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          {text && <span className="text-sm text-gray-600 ml-2">{text}</span>}
        </div>
      )
    }

    if (variant === "skeleton") {
      return (
        <div
          ref={ref}
          className={cn(loadingVariants({ variant, size }), "skeleton-loading", className)}
          {...props}
        />
      )
    }

    return (
      <div
        ref={ref}
        className={cn("flex items-center space-x-2", className)}
        {...props}
      >
        <div className={loadingVariants({ variant, size })} />
        {text && <span className="text-sm text-gray-600">{text}</span>}
      </div>
    )
  }
)
Loading.displayName = "Loading"

// Skeleton loader component for content placeholders
const Skeleton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { lines?: number }
>(({ className, lines = 1, ...props }, ref) => {
  return (
    <div ref={ref} className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-shimmer bg-[length:200%_100%]"
          style={{
            width: index === lines - 1 && lines > 1 ? '75%' : '100%'
          }}
        />
      ))}
    </div>
  )
})
Skeleton.displayName = "Skeleton"

// Professional loading overlay for the entire screen
const LoadingOverlay = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { text?: string; variant?: 'default' | 'fintech' }
>(({ className, text = "Loading...", variant = "default", ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50",
        className
      )}
      {...props}
    >
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-8 text-center shadow-2xl">
        <Loading 
          variant={variant === "fintech" ? "fintech" : "glow"} 
          size="xl" 
          className="mb-4 justify-center"
        />
        <p className="text-gray-700 font-medium">{text}</p>
      </div>
    </div>
  )
})
LoadingOverlay.displayName = "LoadingOverlay"

export { Loading, Skeleton, LoadingOverlay, loadingVariants }