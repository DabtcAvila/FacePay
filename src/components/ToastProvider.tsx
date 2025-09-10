'use client'

import React from 'react'
import { AnimatePresence } from 'framer-motion'
import { Toast, ToastViewport, ToastAction } from './ui/toast'
import { useToast } from '@/hooks/useToast'

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  )
}

function Toaster() {
  const { toasts, dismiss, update } = useToast()

  return (
    <ToastViewport>
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const { id, action, onClose, ...toastProps } = toast

          return (
            <Toast
              key={id}
              {...toastProps}
              onClose={() => {
                dismiss(id)
                onClose?.()
              }}
              action={
                action ? (
                  <ToastAction
                    altText={action.altText}
                    onClick={() => {
                      action.onClick()
                      // Don't auto-dismiss when action is clicked
                      // Let the action handler decide
                    }}
                  >
                    {action.label}
                  </ToastAction>
                ) : undefined
              }
            />
          )
        })}
      </AnimatePresence>
    </ToastViewport>
  )
}

export { Toaster }