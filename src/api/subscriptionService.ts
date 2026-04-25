import apiClient from './client';

export interface SubscriptionStatus {
  subscription_active: boolean;
  subscription_status: string | null;
  has_payment_method: boolean;
  price: string;
  public_key: string;
}

export interface CreatePreapprovalResponse {
  subscription_active: boolean;
  subscription_status: string;
  transaction_uuid?: string;
  payment_pending?: boolean;
}

export const subscriptionService = {
  async getStatus(): Promise<SubscriptionStatus> {
    const response = await apiClient.get<{ status: string; data: SubscriptionStatus }>(
      '/v2/subscription/status'
    );
    return response.data.data;
  },

  async createPreapproval(cardToken: string): Promise<CreatePreapprovalResponse> {
    const response = await apiClient.post<{ status: string; data: CreatePreapprovalResponse }>(
      '/v2/subscription/create-preapproval',
      { token: cardToken }
    );
    return response.data.data;
  },
};
