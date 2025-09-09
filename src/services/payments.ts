import Stripe from 'stripe'
import { ethers } from 'ethers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export class PaymentService {
  // Stripe Payment Methods
  static async createPaymentIntent(amount: number, currency: string = 'usd') {
    return await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
    })
  }

  static async createPaymentMethod(type: string, card?: any) {
    return await stripe.paymentMethods.create({
      type: type as any,
      card,
    })
  }

  static async attachPaymentMethodToCustomer(paymentMethodId: string, customerId: string) {
    return await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    })
  }

  static async createCustomer(email: string, name?: string) {
    return await stripe.customers.create({
      email,
      name,
    })
  }

  // Ethereum/Web3 Payment Methods
  static async createEthereumPayment(
    recipientAddress: string, 
    amountInEth: string, 
    privateKey: string
  ) {
    const provider = new ethers.JsonRpcProvider(
      `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
    )
    
    const wallet = new ethers.Wallet(privateKey, provider)
    
    const transaction = {
      to: recipientAddress,
      value: ethers.parseEther(amountInEth),
      gasLimit: 21000,
    }

    return await wallet.sendTransaction(transaction)
  }

  static async getEthBalance(address: string): Promise<string> {
    const provider = new ethers.JsonRpcProvider(
      `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
    )
    
    const balance = await provider.getBalance(address)
    return ethers.formatEther(balance)
  }

  static validateEthereumAddress(address: string): boolean {
    return ethers.isAddress(address)
  }
}