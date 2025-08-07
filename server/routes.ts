import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { singleEmailSchema, bulkEmailSchema, type EmailAccount, type EmailResult } from "@shared/schema";
import axios from "axios";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { URLSearchParams } from "url";
import { fileURLToPath } from "url";

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

// Helper function to get all sub-accounts from the Zoho API
const getZohoSubAccounts = async (account: EmailAccount) => {
  await getZohoAccessToken(account);
  const accessToken = tokenCache[account.name].access_token;
  
  const zohoResponse = await axios.get(
    `https://mail360.zoho.com/api/accounts`,
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Zoho-oauthtoken ${accessToken}`
      }
    }
  );
  return zohoResponse.data;
};

// Helper function to send email via Zoho Mail360 API
const sendEmail = async (primaryAccountKey: string, fromAddress: string, mailOptions: any) => {
  try {
    const primaryAccounts = await storage.getEmailAccounts();
    const selectedPrimaryAccount = primaryAccounts.find(acc => acc.account_key === primaryAccountKey);

    if (!selectedPrimaryAccount) {
        throw new Error('Invalid primary account selected.');
    }

    // Get the correct sub-account key from Zoho API
    const subAccountsResponse = await getZohoSubAccounts(selectedPrimaryAccount);
    const subAccount = subAccountsResponse.data.find((acc: any) => acc.emailAddress === fromAddress);

    if (!subAccount) {
        throw new Error('From address not found in Zoho sub-accounts.');
    }

    await getZohoAccessToken(selectedPrimaryAccount);
    const accessToken = tokenCache[selectedPrimaryAccount.name].access_token;
    
    // Check if fromAddress is a valid email pattern before sending
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromAddress)) {
      throw new Error("Invalid fromAddress format.");
    }
    
    const response = await axios.post(
      `https://mail360.zoho.com/api/accounts/${subAccount.account_key}/messages`,
      { ...mailOptions, fromAddress },
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
      const selectedAccount = accounts.find(acc => acc.account_key === validatedData.primaryAccountKey);

      if (!selectedAccount) {
        return res.status(400).json({ message: "Invalid account selected." });
      }

      await getZohoAccessToken(selectedAccount);

      const mailOptions = {
        toAddress: validatedData.toAddress,
        subject: validatedData.subject,
        content: validatedData.content,
        mailFormat: 'html'
      };

      const result = await sendEmail(validatedData.primaryAccountKey, validatedData.accountSelect, mailOptions);

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
      const selectedAccount = accounts.find(acc => acc.account_key === validatedData.primaryAccountKey);

      if (!selectedAccount) {
        return res.status(400).json({ message: "Invalid account selected." });
      }

      await getZohoAccessToken(selectedAccount);

      const recipientList = validatedData.recipients.split('\n').map(email => email.trim()).filter(email => email);
      const results: EmailResult[] = [];

      for (const toAddress of recipientList) {
        const mailOptions = {
          toAddress: toAddress,
          subject: validatedData.subject,
          content: validatedData.content,
          mailFormat: 'html'
        };
        const result = await sendEmail(validatedData.primaryAccountKey, validatedData.accountSelect, mailOptions);
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
  
  // Add Native Zoho Account
  app.post("/api/add-native-account", async (req, res) => {
    try {
      const { name, emailid, displayName } = req.body;
      
      const accounts = await storage.getEmailAccounts();
      const selectedAccount = accounts.find(acc => acc.account_key === "Bd8l23G08828");

      if (!selectedAccount) {
        return res.status(400).json({ message: "No master account configured to add sub-accounts." });
      }

      await getZohoAccessToken(selectedAccount);
      const accessToken = tokenCache[selectedAccount.name].access_token;
      
      const zohoResponse = await axios.post(
        `https://mail360.zoho.com/api/accounts`,
        {
          emailid,
          displayName,
          accountType: "1"
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Zoho-oauthtoken ${accessToken}`
          }
        }
      );

      res.status(200).json({ 
        success: true, 
        message: "Account added successfully!",
        data: zohoResponse.data.data
      });

    } catch (error: any) {
      console.error("Error adding account:", error.response ? error.response.data : error.message);
      res.status(500).json({ message: error.message || "Failed to add account" });
    }
  });
  
  // Get All Zoho Sub-Accounts (from addresses) for a given primary account
  app.get("/api/zoho-accounts", async (req, res) => {
    try {
      const accountKey = req.query.accountKey as string;
      if (!accountKey) {
        return res.status(400).json({ message: "accountKey is required." });
      }

      const accounts = await storage.getEmailAccounts();
      const selectedAccount = accounts.find(acc => acc.account_key === accountKey);

      if (!selectedAccount) {
        return res.status(400).json({ message: "Invalid account selected." });
      }
      
      await getZohoAccessToken(selectedAccount);
      const accessToken = tokenCache[selectedAccount.name].access_token;
      
      const zohoResponse = await axios.get(
        `https://mail360.zoho.com/api/accounts`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Zoho-oauthtoken ${accessToken}`
          }
        }
      );

      // Log the full response from the Zoho API for debugging
      console.log('Zoho API Response for sub-accounts:', JSON.stringify(zohoResponse.data, null, 2));

      res.json(zohoResponse.data);

    } catch (error: any) {
      console.error("Error fetching Zoho sub-accounts:", error.response ? error.response.data : error.message);
      res.status(500).json({ message: error.message || "Failed to fetch accounts from Zoho." });
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