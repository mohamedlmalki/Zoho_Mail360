import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { singleEmailSchema, bulkEmailSchema, type EmailAccount, type EmailResult } from "@shared/schema";
import axios from "axios";

// Global cache for access tokens
const tokenCache: Record<string, { access_token: string; expires_at: number }> = {};

// Helper function to get a new Zoho access token using a refresh token
const getNewAccessToken = async (account: EmailAccount) => {
  console.log(`Generating new access token for: ${account.name}`);
  
  const params = new URLSearchParams();
  params.append('refresh_token', account.refresh_token);
  params.append('client_id', account.client_id);
  params.append('client_secret', account.client_secret);
  params.append('grant_type', 'refresh_token');

  try {
    const response = await axios.post(
      'https://accounts.zoho.com/oauth/v2/token',
      params,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const { access_token, expires_in } = response.data;
    console.log(`Successfully generated new token for ${account.name}`);
    return { access_token, expires_in };
  } catch (error: any) {
    console.error('Error getting access token:', error.response ? error.response.data : error.message);
    throw new Error('Failed to authenticate with Zoho.');
  }
};

// Helper function to ensure we have a valid access token for the selected account
const getZohoAccessToken = async (account: EmailAccount) => {
  const accountId = account.name;
  const currentTime = Date.now();
  const cachedToken = tokenCache[accountId];

  if (!cachedToken || currentTime >= cachedToken.expires_at) {
    try {
      const { access_token, expires_in } = await getNewAccessToken(account);
      tokenCache[accountId] = {
        access_token: access_token,
        expires_at: currentTime + (expires_in * 1000) - 60000
      };
      console.log('New access token generated and stored in cache.');
    } catch (error) {
      console.error('Error getting access token:', error);
      throw new Error('Failed to authenticate with Zoho.');
    }
  }
};

// Helper function to send email via Zoho Mail360 API
const sendEmail = async (account: EmailAccount, mailOptions: any) => {
  try {
    const accessToken = tokenCache[account.name].access_token;
    const response = await axios.post(
      `https://mail360.zoho.com/api/accounts/${account.account_key}/messages`,
      mailOptions,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Zoho-oauthtoken ${accessToken}`
        }
      }
    );
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('Error sending email:', error.response ? error.response.data : error.message);
    return { success: false, error: error.response ? error.response.data : error.message };
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get email accounts
  app.get("/api/accounts", async (req, res) => {
    try {
      const accounts = await storage.getEmailAccounts();
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ message: "Failed to load email accounts" });
    }
  });

  // Send single email
  app.post("/api/send-single-email", async (req, res) => {
    try {
      const validatedData = singleEmailSchema.parse(req.body);
      const accounts = await storage.getEmailAccounts();
      const selectedAccount = accounts.find(acc => acc.account_key === validatedData.accountSelect);

      if (!selectedAccount) {
        return res.status(400).json({ message: "Invalid account selected." });
      }

      await getZohoAccessToken(selectedAccount);

      const mailOptions = {
        fromAddress: selectedAccount.fromAddress,
        toAddress: validatedData.toAddress,
        subject: validatedData.subject,
        content: validatedData.content,
        mailFormat: 'html'
      };

      const result = await sendEmail(selectedAccount, mailOptions);

      if (result.success) {
        res.json({ 
          success: true, 
          messageId: result.data.data.messageId,
          responseCode: 200,
          fullResponse: result.data,
          message: "Email sent successfully!" 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Failed to send email", 
          responseCode: result.error?.status || 500,
          fullResponse: result.error,
          error: result.error 
        });
      }
    } catch (error: any) {
      console.error("Error sending single email:", error);
      res.status(500).json({ message: error.message || "Failed to send email" });
    }
  });

  // Send bulk email
  app.post("/api/send-bulk-email", async (req, res) => {
    try {
      const validatedData = bulkEmailSchema.parse(req.body);
      const accounts = await storage.getEmailAccounts();
      const selectedAccount = accounts.find(acc => acc.account_key === validatedData.accountSelect);

      if (!selectedAccount) {
        return res.status(400).json({ message: "Invalid account selected." });
      }

      await getZohoAccessToken(selectedAccount);

      const recipientList = validatedData.recipients.split('\n').map(email => email.trim()).filter(email => email);
      const results: EmailResult[] = [];

      for (const toAddress of recipientList) {
        const mailOptions = {
          fromAddress: selectedAccount.fromAddress,
          toAddress: toAddress,
          subject: validatedData.subject,
          content: validatedData.content,
          mailFormat: 'html'
        };
        const result = await sendEmail(selectedAccount, mailOptions);
        results.push({
          recipient: toAddress,
          status: result.success ? 'Success' : 'Failed',
          messageId: result.success ? result.data.data.messageId : null,
          responseCode: result.success ? 200 : (result.error?.status || 500),
          error: result.success ? null : result.error,
          fullResponse: result.success ? result.data : result.error
        });
      }

      await storage.storeEmailResults(results);
      res.json({ success: true, results });
    } catch (error: any) {
      console.error("Error sending bulk email:", error);
      res.status(500).json({ message: error.message || "Failed to send bulk email" });
    }
  });

  // Get bulk email results
  app.get("/api/bulk-results", async (req, res) => {
    try {
      const results = await storage.getEmailResults();
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Failed to load email results" });
    }
  });

  // Store bulk results for navbar stats
  app.post("/api/store-bulk-results", async (req, res) => {
    try {
      const { results } = req.body;
      if (Array.isArray(results)) {
        await storage.storeEmailResults(results);
        res.json({ success: true });
      } else {
        res.status(400).json({ error: 'Results must be an array' });
      }
    } catch (error) {
      console.error('Error storing bulk results:', error);
      res.status(500).json({ error: 'Failed to store results' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
