import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

    const url = new URL(request.url)
    const format = url.searchParams.get('format') || 'json' // json, pdf, html

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: params.id,
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

    if (!transaction) {
      return createErrorResponse('Transaction not found', 404)
    }

    // Only generate receipts for completed or refunded transactions
    if (!['completed', 'refunded'].includes(transaction.status)) {
      return createErrorResponse('Receipt only available for completed or refunded transactions', 400)
    }

    const metadata = transaction.metadata as Record<string, any> || {}
    const refundInfo = metadata.refund

    const receipt = {
      receiptId: `RCP-${transaction.id.slice(-8).toUpperCase()}`,
      transactionId: transaction.id,
      date: transaction.completedAt || transaction.createdAt,
      customer: {
        name: transaction.user.name || 'N/A',
        email: transaction.user.email,
      },
      transaction: {
        amount: transaction.amount,
        currency: transaction.currency,
        description: transaction.description || 'Payment',
        status: transaction.status,
        paymentMethod: {
          type: transaction.paymentMethod.type,
          provider: transaction.paymentMethod.provider,
          // Mask sensitive details
          lastFour: getLastFour(transaction.paymentMethod.details),
        },
      },
      ...(refundInfo && {
        refund: {
          amount: refundInfo.refundAmount,
          reason: refundInfo.reason,
          processedAt: refundInfo.refundedAt,
        },
      }),
      businessInfo: {
        name: 'FacePay',
        address: '123 Payment Street, Fintech City, FC 12345',
        taxId: 'TAX123456789',
        support: 'support@facepay.com',
      },
      generated: new Date().toISOString(),
    }

    // Handle different formats
    switch (format.toLowerCase()) {
      case 'html':
        return new NextResponse(generateHTMLReceipt(receipt), {
          headers: {
            'Content-Type': 'text/html',
            'Content-Disposition': `inline; filename="receipt-${receipt.receiptId}.html"`,
          },
        })
      
      case 'pdf':
        // In a real implementation, you would use a PDF generation library
        return createErrorResponse('PDF generation not implemented yet. Use format=html or format=json', 501)
      
      default:
        return createSuccessResponse(receipt)
    }

  } catch (error) {
    console.error('Generate receipt error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

function getLastFour(details: any): string {
  if (typeof details === 'object' && details !== null) {
    if (details.cardNumber) {
      return `****-${details.cardNumber.slice(-4)}`
    }
    if (details.accountNumber) {
      return `****-${details.accountNumber.slice(-4)}`
    }
    if (details.walletAddress) {
      return `${details.walletAddress.slice(0, 6)}...${details.walletAddress.slice(-4)}`
    }
  }
  return '****'
}

function generateHTMLReceipt(receipt: any): string {
  const isRefunded = receipt.transaction.status === 'refunded'
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Receipt - ${receipt.receiptId}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
            padding: 20px;
        }
        .receipt {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
        }
        .content {
            padding: 30px;
        }
        .section {
            margin-bottom: 30px;
            border-bottom: 1px solid #eee;
            padding-bottom: 20px;
        }
        .section:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }
        .section h2 {
            color: #4a5568;
            margin-bottom: 15px;
            font-size: 18px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        .info-label {
            font-weight: 600;
            color: #4a5568;
        }
        .info-value {
            color: #2d3748;
        }
        .amount {
            font-size: 24px;
            font-weight: bold;
            color: #2b6cb0;
        }
        .status {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status.completed {
            background: #c6f6d5;
            color: #22543d;
        }
        .status.refunded {
            background: #fed7d7;
            color: #c53030;
        }
        .footer {
            background: #f7fafc;
            padding: 20px 30px;
            text-align: center;
            color: #718096;
            font-size: 14px;
        }
        .refund-notice {
            background: #fef5e7;
            border-left: 4px solid #f6ad55;
            padding: 15px;
            margin-bottom: 20px;
        }
        @media print {
            body { background: white; padding: 0; }
            .receipt { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="receipt">
        <div class="header">
            <h1>${receipt.businessInfo.name}</h1>
            <p>Receipt #${receipt.receiptId}</p>
        </div>
        
        <div class="content">
            ${isRefunded ? `
            <div class="refund-notice">
                <strong>⚠️ REFUNDED TRANSACTION</strong><br>
                This transaction has been refunded. See refund details below.
            </div>
            ` : ''}
            
            <div class="section">
                <h2>Transaction Details</h2>
                <div class="info-row">
                    <span class="info-label">Transaction ID:</span>
                    <span class="info-value">${receipt.transactionId}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Date:</span>
                    <span class="info-value">${new Date(receipt.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Status:</span>
                    <span class="status ${receipt.transaction.status}">${receipt.transaction.status}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Description:</span>
                    <span class="info-value">${receipt.transaction.description}</span>
                </div>
            </div>

            <div class="section">
                <h2>Payment Information</h2>
                <div class="info-row">
                    <span class="info-label">Amount:</span>
                    <span class="info-value amount">${receipt.transaction.currency} ${receipt.transaction.amount.toFixed(2)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Payment Method:</span>
                    <span class="info-value">${receipt.transaction.paymentMethod.type.toUpperCase()} (${receipt.transaction.paymentMethod.provider})</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Card/Account:</span>
                    <span class="info-value">${receipt.transaction.paymentMethod.lastFour}</span>
                </div>
            </div>

            <div class="section">
                <h2>Customer Information</h2>
                <div class="info-row">
                    <span class="info-label">Name:</span>
                    <span class="info-value">${receipt.customer.name}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Email:</span>
                    <span class="info-value">${receipt.customer.email}</span>
                </div>
            </div>

            ${receipt.refund ? `
            <div class="section">
                <h2>Refund Information</h2>
                <div class="info-row">
                    <span class="info-label">Refund Amount:</span>
                    <span class="info-value amount">${receipt.transaction.currency} ${receipt.refund.amount.toFixed(2)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Reason:</span>
                    <span class="info-value">${receipt.refund.reason}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Processed:</span>
                    <span class="info-value">${new Date(receipt.refund.processedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</span>
                </div>
            </div>
            ` : ''}
        </div>

        <div class="footer">
            <p><strong>${receipt.businessInfo.name}</strong></p>
            <p>${receipt.businessInfo.address}</p>
            <p>Tax ID: ${receipt.businessInfo.taxId}</p>
            <p>Support: ${receipt.businessInfo.support}</p>
            <p style="margin-top: 15px; font-size: 12px;">Generated on ${new Date(receipt.generated).toLocaleString()}</p>
        </div>
    </div>
</body>
</html>
  `
}
// Prevent static generation
export const dynamic = 'force-dynamic'
