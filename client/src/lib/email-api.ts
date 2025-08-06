import { apiRequest } from "./queryClient";
import { type SingleEmail, type BulkEmail } from "@shared/schema";

export const emailApi = {
  getAccounts: async () => {
    const res = await apiRequest('GET', '/api/accounts');
    return res.json();
  },

  sendSingleEmail: async (data: SingleEmail) => {
    const res = await apiRequest('POST', '/api/send-single-email', data);
    return res.json();
  },

  sendBulkEmail: async (data: BulkEmail) => {
    const res = await apiRequest('POST', '/api/send-bulk-email', data);
    return res.json();
  },

  getBulkResults: async () => {
    const res = await apiRequest('GET', '/api/bulk-results');
    return res.json();
  },
};
