export interface RazorpayWebhookPayload {
  event: string;
  created_at: number;
  entity: string;
  payload: {
    payment_link?: {
      id: string;
      amount: number;
      amount_paid: number;
      cancelled_at?: number;
      created_at: number;
      currency: string;
      customer?: {
        contact: string;
        email: string;
        name: string;
      };
      description: string;
      expire_by?: number;
      expired_at?: number;
      first_min_partial_amount?: number;
      notes?: Record<string, any>;
      notify?: {
        email?: boolean;
        sms?: boolean;
      };
      payments?: {
        entity: string;
        count: number;
        items: Array<{
          id: string;
          entity: string;
          amount: number;
          currency: string;
          status: string;
          method: string;
          description: string;
          amount_refunded: number;
          refund_status: string;
          captured: boolean;
          card_id: string;
          bank?: string;
          wallet?: string;
          vpa?: string;
          email: string;
          contact: string;
          notes?: Record<string, any>;
          fee?: number;
          tax?: number;
          acquirer_data?: Record<string, any>;
          created_at: number;
        }>;
      };
      reference_id?: string;
      short_url: string;
      source: string;
      status: string;
      updated_at: number;
      upi_link?: boolean;
      user_id?: string;
      whatsapp_link?: boolean;
    };
    payment?: {
      id: string;
      entity: string;
      amount: number;
      currency: string;
      status: string;
      method: string;
      description: string;
      amount_refunded: number;
      refund_status: string;
      captured: boolean;
      email: string;
      contact: string;
      notes?: Record<string, any>;
      fee?: number;
      tax?: number;
      created_at: number;
    };
  };
}

export interface PaymentWebhookEvent {
  event:
    | "payment_link.paid"
    | "payment_link.failed"
    | "payment_link.expired"
    | "payment_link.cancelled"
    | "payment.captured"
    | "payment.failed";
  paymentLinkId?: string;
  paymentId?: string;
  amount?: number;
  currency?: string;
  status?: string;
  timestamp: Date;
  payload: RazorpayWebhookPayload;
}

export interface PaymentCallbackMetadata {
  visit_id: string;
  patient_id: string;
  therapist_id: string;
  therapy_type?: string;
  session_date?: string;
  [key: string]: any;
}
