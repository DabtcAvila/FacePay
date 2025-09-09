import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import { z } from 'zod'

const bulkOperationSchema = z.object({
  operation: z.enum(['refund', 'cancel', 'export']),
  transactionIds: z.array(z.string()).min(1, 'At least one transaction ID required'),
  params: z.record(z.any()).optional(), // Operation-specific parameters
})

const exportSchema = z.object({
  format: z.enum(['csv', 'json']).default('csv'),
  includeRefunded: z.boolean().default(true),
  includeMetadata: z.boolean().default(false),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const { operation, transactionIds, params } = bulkOperationSchema.parse(body)

    // Verify all transactions belong to the user
    const transactions = await prisma.transaction.findMany({
      where: {
        id: { in: transactionIds },
        userId: auth.user.userId,
      },
      include: {
        paymentMethod: {
          select: {
            id: true,
            type: true,
            provider: true,
            details: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    })

    if (transactions.length !== transactionIds.length) {
      return createErrorResponse('Some transactions not found or do not belong to you', 404)
    }

    let result: any

    switch (operation) {
      case 'refund':
        result = await processBulkRefunds(transactions, params)
        break
      case 'cancel':
        result = await processBulkCancellations(transactions, params)
        break
      case 'export':
        const exportParams = exportSchema.parse(params || {})
        result = await exportTransactions(transactions, exportParams)
        break
      default:
        return createErrorResponse('Invalid operation', 400)
    }

    return createSuccessResponse(result, `Bulk ${operation} completed`)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error.errors[0].message, 400)
    }
    
    console.error('Bulk operation error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function processBulkRefunds(transactions: any[], params: any) {
  const results = {
    successful: [] as any[],
    failed: [] as any[],
  }

  const reason = params?.reason || 'Bulk refund operation'

  for (const transaction of transactions) {
    try {
      // Only process completed transactions
      if (transaction.status !== 'completed') {
        results.failed.push({
          transactionId: transaction.id,
          reason: `Transaction status is ${transaction.status}, only completed transactions can be refunded`,
        })
        continue
      }

      // Create refund data
      const refundData = {
        refundAmount: transaction.amount,
        reason,
        refundedAt: new Date().toISOString(),
        refundedBy: transaction.userId,
        originalAmount: transaction.amount,
        bulkOperation: true,
      }

      // Update transaction
      const updatedTransaction = await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'refunded',
          metadata: {
            ...(transaction.metadata as Record<string, any> || {}),
            refund: refundData,
          },
        },
      })

      results.successful.push({
        transactionId: transaction.id,
        refundAmount: transaction.amount,
        refundId: `refund_${transaction.id}_${Date.now()}`,
      })

    } catch (error) {
      results.failed.push({
        transactionId: transaction.id,
        reason: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return {
    operation: 'refund',
    processed: transactions.length,
    successful: results.successful.length,
    failed: results.failed.length,
    results,
  }
}

async function processBulkCancellations(transactions: any[], params: any) {
  const results = {
    successful: [] as any[],
    failed: [] as any[],
  }

  const reason = params?.reason || 'Bulk cancellation operation'

  for (const transaction of transactions) {
    try {
      // Only cancel pending transactions
      if (transaction.status !== 'pending') {
        results.failed.push({
          transactionId: transaction.id,
          reason: `Transaction status is ${transaction.status}, only pending transactions can be cancelled`,
        })
        continue
      }

      // Update transaction to failed status
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'failed',
          metadata: {
            ...(transaction.metadata as Record<string, any> || {}),
            cancellation: {
              reason,
              cancelledAt: new Date().toISOString(),
              cancelledBy: transaction.userId,
              bulkOperation: true,
            },
          },
        },
      })

      results.successful.push({
        transactionId: transaction.id,
        cancelledAt: new Date().toISOString(),
      })

    } catch (error) {
      results.failed.push({
        transactionId: transaction.id,
        reason: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return {
    operation: 'cancel',
    processed: transactions.length,
    successful: results.successful.length,
    failed: results.failed.length,
    results,
  }
}

async function exportTransactions(transactions: any[], params: any) {
  const { format, includeRefunded, includeMetadata } = params

  // Filter transactions based on parameters
  let filteredTransactions = transactions
  if (!includeRefunded) {
    filteredTransactions = transactions.filter(t => t.status !== 'refunded')
  }

  // Prepare export data
  const exportData = filteredTransactions.map(transaction => {
    const metadata = transaction.metadata as Record<string, any> || {}
    const refundInfo = metadata.refund
    
    const baseData = {
      transactionId: transaction.id,
      date: transaction.createdAt,
      completedAt: transaction.completedAt,
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.status,
      description: transaction.description,
      customerName: transaction.user.name,
      customerEmail: transaction.user.email,
      paymentType: transaction.paymentMethod.type,
      paymentProvider: transaction.paymentMethod.provider,
    }

    // Add refund information if applicable
    if (refundInfo) {
      Object.assign(baseData, {
        refundAmount: refundInfo.refundAmount,
        refundReason: refundInfo.reason,
        refundedAt: refundInfo.refundedAt,
      })
    }

    // Add metadata if requested
    if (includeMetadata) {
      Object.assign(baseData, {
        metadata: JSON.stringify(metadata),
      })
    }

    return baseData
  })

  if (format === 'csv') {
    const csv = convertToCSV(exportData)
    return {
      format: 'csv',
      filename: `transactions_export_${new Date().toISOString().split('T')[0]}.csv`,
      data: csv,
      recordCount: exportData.length,
    }
  }

  return {
    format: 'json',
    filename: `transactions_export_${new Date().toISOString().split('T')[0]}.json`,
    data: exportData,
    recordCount: exportData.length,
  }
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return ''

  const headers = Object.keys(data[0])
  const csvHeaders = headers.join(',')
  
  const csvRows = data.map(row => 
    headers.map(header => {
      const value = row[header]
      if (value === null || value === undefined) return ''
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return String(value)
    }).join(',')
  )

  return [csvHeaders, ...csvRows].join('\n')
}