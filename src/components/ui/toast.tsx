'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info, Loader2 } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full',
  {
    variants: {
      variant: {
        default: 'border bg-background text-foreground',
        success: 'border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-900/20 dark:text-green-100',
        error: 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-900/20 dark:text-red-100',
        warning: 'border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-100',
        info: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-100',
        loading: 'border-gray-200 bg-gray-50 text-gray-900 dark:border-gray-800 dark:bg-gray-900/20 dark:text-gray-100',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

const ToastProvider = React.forwardRef<
  React.ElementRef<typeof motion.div>,
  React.ComponentPropsWithoutRef<typeof motion.div>
>(({ className, ...props }, ref) => (
  <motion.div
    ref={ref}
    className={cn(
      'fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]',
      className
    )}
    {...props}
  />
))
ToastProvider.displayName = 'ToastProvider'

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof motion.ol>,
  React.ComponentPropsWithoutRef<typeof motion.ol>
>(({ className, ...props }, ref) => (
  <motion.ol
    ref={ref}
    className={cn(
      'fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]',
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = 'ToastViewport'

interface ToastProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof toastVariants> {
  title?: string
  description?: string
  action?: React.ReactNode
  onClose?: () => void
  duration?: number
  persistent?: boolean
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant, title, description, action, onClose, duration = 5000, persistent = false, ...props }, ref) => {
    const [isVisible, setIsVisible] = React.useState(true)
    const [timeLeft, setTimeLeft] = React.useState(duration)
    const timeoutRef = React.useRef<NodeJS.Timeout>()
    const intervalRef = React.useRef<NodeJS.Timeout>()

    React.useEffect(() => {
      if (!persistent && duration > 0) {
        // Start countdown
        const startTime = Date.now()
        intervalRef.current = setInterval(() => {
          const elapsed = Date.now() - startTime
          const remaining = Math.max(0, duration - elapsed)
          setTimeLeft(remaining)
        }, 100)

        // Auto dismiss
        timeoutRef.current = setTimeout(() => {
          handleClose()
        }, duration)
      }

      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    }, [duration, persistent])

    const handleClose = () => {
      setIsVisible(false)
      setTimeout(() => onClose?.(), 300) // Wait for exit animation
    }

    const getIcon = () => {
      switch (variant) {
        case 'success':
          return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
        case 'error':
          return <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
        case 'warning':
          return <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        case 'info':
          return <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        case 'loading':
          return <Loader2 className="h-5 w-5 text-gray-600 dark:text-gray-400 animate-spin" />
        default:
          return null
      }
    }

    const progressPercentage = persistent ? 0 : ((timeLeft / duration) * 100)

    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={ref}
            className={cn(toastVariants({ variant }), className)}
            initial={{ opacity: 0, y: -100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -100, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            {...props}
          >
            <div className="flex items-start space-x-3 flex-1">
              {getIcon()}
              <div className="grid gap-1 flex-1">
                {title && (
                  <div className="text-sm font-semibold leading-none tracking-tight">
                    {title}
                  </div>
                )}
                {description && (
                  <div className="text-sm opacity-90 leading-relaxed">
                    {description}
                  </div>
                )}
                {action && (
                  <div className="mt-2">
                    {action}
                  </div>
                )}
              </div>
            </div>

            {onClose && (
              <button
                onClick={handleClose}
                className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* Progress bar for auto-dismiss */}
            {!persistent && duration > 0 && (
              <motion.div
                className="absolute bottom-0 left-0 h-1 bg-current opacity-30"
                initial={{ width: '100%' }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.1, ease: 'linear' }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    )
  }
)
Toast.displayName = 'Toast'

const ToastTitle = React.forwardRef<
  React.ElementRef<'div'>,
  React.ComponentPropsWithoutRef<'div'>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm font-semibold', className)}
    {...props}
  />
))
ToastTitle.displayName = 'ToastTitle'

const ToastDescription = React.forwardRef<
  React.ElementRef<'div'>,
  React.ComponentPropsWithoutRef<'div'>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm opacity-90', className)}
    {...props}
  />
))
ToastDescription.displayName = 'ToastDescription'

type ToastActionElement = React.ReactElement<typeof ToastAction>

const ToastAction = React.forwardRef<
  React.ElementRef<'button'>,
  React.ComponentPropsWithoutRef<'button'> & {
    altText: string
  }
>(({ className, altText, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      'inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive',
      className
    )}
    aria-label={altText}
    {...props}
  />
))
ToastAction.displayName = 'ToastAction'

const ToastClose = React.forwardRef<
  React.ElementRef<'button'>,
  React.ComponentPropsWithoutRef<'button'>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      'absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100',
      className
    )}
    aria-label="Close"
    {...props}
  >
    <X className="h-4 w-4" />
  </button>
))
ToastClose.displayName = 'ToastClose'

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastAction,
  ToastClose,
}