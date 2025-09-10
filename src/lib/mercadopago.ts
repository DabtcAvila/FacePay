import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
  options: {
    timeout: 5000,
    idempotencyKey: 'abc' // This should be unique per request in production
  }
});

export const payment = new Payment(client);
export const preference = new Preference(client);

export interface MercadoPagoPaymentData {
  transaction_amount: number;
  description: string;
  payment_method_id: string;
  payer: {
    email: string;
    first_name?: string;
    last_name?: string;
    identification?: {
      type: string;
      number: string;
    };
  };
  metadata?: Record<string, any>;
  installments?: number;
  token?: string; // For card payments
  issuer_id?: string;
  capture?: boolean;
  binary_mode?: boolean;
  external_reference?: string;
  statement_descriptor?: string;
  notification_url?: string;
  callback_url?: string;
}

export interface MercadoPagoPreferenceData {
  items: Array<{
    id?: string;
    title: string;
    description?: string;
    picture_url?: string;
    category_id?: string;
    quantity: number;
    currency_id?: string;
    unit_price: number;
  }>;
  payer?: {
    name?: string;
    surname?: string;
    email?: string;
    phone?: {
      area_code?: string;
      number?: string;
    };
    identification?: {
      type?: string;
      number?: string;
    };
    address?: {
      zip_code?: string;
      street_name?: string;
      street_number?: number;
    };
  };
  payment_methods?: {
    excluded_payment_methods?: Array<{ id: string }>;
    excluded_payment_types?: Array<{ id: string }>;
    installments?: number;
    default_installments?: number;
  };
  shipments?: {
    cost?: number;
    mode?: 'not_specified' | 'custom' | 'me2' | 'express';
    receiver_address?: {
      zip_code?: string;
      street_name?: string;
      street_number?: number;
      floor?: string;
      apartment?: string;
    };
  };
  back_urls?: {
    success?: string;
    failure?: string;
    pending?: string;
  };
  auto_return?: 'approved' | 'all';
  external_reference?: string;
  expires?: boolean;
  expiration_date_from?: string;
  expiration_date_to?: string;
  notification_url?: string;
  binary_mode?: boolean;
  taxes?: Array<{
    type: 'IVA' | 'INC';
    value: number;
  }>;
  statement_descriptor?: string;
  metadata?: Record<string, any>;
}

export const MERCADOPAGO_CONFIG = {
  PUBLIC_KEY: process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || '',
  ACCESS_TOKEN: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
  WEBHOOK_SECRET: process.env.MERCADOPAGO_WEBHOOK_SECRET || '',
  TEST_MODE: process.env.MERCADOPAGO_TEST_MODE === 'true',
  BINARY_MODE: true, // Payments are approved or rejected instantly
  STATEMENT_DESCRIPTOR: 'FACEPAY',
  SUPPORTED_PAYMENT_METHODS: [
    'credit_card',
    'debit_card',
    'ticket', // OXXO, 7-Eleven, etc.
    'bank_transfer',
    'atm',
    'wallet_purchase' // MercadoPago wallet
  ],
  EXCLUDED_PAYMENT_TYPES: [
    { id: 'digital_currency' }, // Exclude crypto for now
  ],
  CURRENCY: 'MXN', // Mexican Peso
  COUNTRY: 'MX'
};

export const createPaymentPreference = async (data: MercadoPagoPreferenceData) => {
  try {
    // Ensure all items have an id
    const itemsWithId = data.items.map((item, index) => ({
      ...item,
      id: item.id || `item-${index}-${Date.now()}`
    }));

    // Fix payer address street_number type
    const payer = data.payer ? {
      ...data.payer,
      address: data.payer.address ? {
        ...data.payer.address,
        street_number: data.payer.address.street_number ? String(data.payer.address.street_number) : undefined
      } : undefined
    } : undefined;

    // Fix shipments receiver_address street_number type
    const shipments = data.shipments ? {
      ...data.shipments,
      receiver_address: data.shipments.receiver_address ? {
        ...data.shipments.receiver_address,
        street_number: data.shipments.receiver_address.street_number ? String(data.shipments.receiver_address.street_number) : undefined
      } : undefined
    } : undefined;

    const response = await preference.create({
      body: {
        ...data,
        items: itemsWithId,
        payer,
        shipments,
        payment_methods: {
          ...data.payment_methods,
          excluded_payment_types: MERCADOPAGO_CONFIG.EXCLUDED_PAYMENT_TYPES,
        },
        binary_mode: MERCADOPAGO_CONFIG.BINARY_MODE,
        statement_descriptor: MERCADOPAGO_CONFIG.STATEMENT_DESCRIPTOR,
      }
    });
    
    return response;
  } catch (error) {
    console.error('Error creating MercadoPago preference:', error);
    throw error;
  }
};

export const createPayment = async (data: MercadoPagoPaymentData) => {
  try {
    // Convert issuer_id from string to number if present
    const issuer_id = data.issuer_id ? Number(data.issuer_id) : undefined;

    const response = await payment.create({
      body: {
        ...data,
        issuer_id,
        binary_mode: MERCADOPAGO_CONFIG.BINARY_MODE,
        statement_descriptor: MERCADOPAGO_CONFIG.STATEMENT_DESCRIPTOR,
        capture: data.capture !== false, // Auto-capture by default
      }
    });
    
    return response;
  } catch (error) {
    console.error('Error creating MercadoPago payment:', error);
    throw error;
  }
};

export const getPayment = async (paymentId: string) => {
  try {
    const response = await payment.get({ id: paymentId });
    return response;
  } catch (error) {
    console.error('Error getting MercadoPago payment:', error);
    throw error;
  }
};

export const capturePayment = async (paymentId: string, amount?: number) => {
  try {
    const captureData: any = {
      id: paymentId
    };
    
    if (amount) {
      captureData.transaction_amount = amount;
    }

    const response = await payment.capture(captureData);
    return response;
  } catch (error) {
    console.error('Error capturing MercadoPago payment:', error);
    throw error;
  }
};

export const refundPayment = async (paymentId: string, amount?: number) => {
  try {
    // Note: MercadoPago refunds need to be handled through the Refund resource
    // TODO: Implement proper refund functionality using MercadoPago Refund API
    throw new Error('Refund functionality not yet implemented - requires MercadoPago Refund API');
  } catch (error) {
    console.error('Error refunding MercadoPago payment:', error);
    throw error;
  }
};

export const cancelPayment = async (paymentId: string) => {
  try {
    const response = await payment.cancel({ id: paymentId });
    return response;
  } catch (error) {
    console.error('Error canceling MercadoPago payment:', error);
    throw error;
  }
};