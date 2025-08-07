import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Plus, Loader2, Mail, Users, Filter, Code, Eye } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type EmailAccount } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";

// Schema for the add account form
const addAccountSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  displayName: z.string().min(1, "Display name is required"),
  emailid: z.string().email("Invalid email address"),
});

type AddAccount = z.infer<typeof addAccountSchema>;

// Corrected schema for a single email address from the Zoho API
const zohoSubAccountSchema = z.object({
  account_key: z.string(),
  emailAddress: z.string().email(),
  displayName: z.string(),
  type: z.string(),
  enabled: z.boolean(),
  isOAuthAcc: z.boolean(),
  incomingBlocked: z.boolean(),
  outgoingBlocked: z.boolean(),
});

type ZohoSubAccount = z.infer<typeof zohoSubAccountSchema>;

// API response schema for fetching all accounts
const zohoAccountsResponseSchema = z.object({
  status: z.object({
    code: z.number(),
    description: z.string(),
  }),
  data: z.array(zohoSubAccountSchema),
});


export default function AccountManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPrimaryAccountKey, setSelectedPrimaryAccountKey] = useState<string | null>(null);

  // Fetch the list of primary Zoho accounts from our backend
  const { data: primaryAccounts, isLoading: primaryAccountsLoading } = useQuery<EmailAccount[]>({
    queryKey: ['/api/accounts'],
    staleTime: Infinity
  });

  // Fetch the sub-accounts (from addresses) for the selected primary account from Zoho
  const { data: subAccounts, isLoading: subAccountsLoading } = useQuery({
    queryKey: ['/api/zoho-accounts', selectedPrimaryAccountKey],
    queryFn: async ({ queryKey }) => {
      const [_key, accountKey] = queryKey;
      if (!accountKey) return [];
      const res = await apiRequest('GET', `/api/zoho-accounts?accountKey=${accountKey}`);
      const data = await res.json();
      
      const parsedData = zohoAccountsResponseSchema.parse(data);
      
      return parsedData.data;
    },
    enabled: !!selectedPrimaryAccountKey,
    staleTime: Infinity,
  });

  const form = useForm<AddAccount>({
    resolver: zodResolver(addAccountSchema),
    defaultValues: {
      name: "",
      displayName: "",
      emailid: "",
    },
  });

  const addAccountMutation = useMutation({
    mutationFn: async (data: AddAccount) => {
      const payload = { ...data, accountType: 1 };
      const res = await apiRequest('POST', '/api/add-native-account', payload);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Account added!",
        description: `Account '${data.data.name}' has been added successfully.`,
      });
      // Invalidate queries to refetch the primary account list
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add account",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AddAccount) => {
    addAccountMutation.mutate(data);
  };
  
  // Set the first primary account as selected by default
  useEffect(() => {
    if (primaryAccounts && primaryAccounts.length > 0 && !selectedPrimaryAccountKey) {
      setSelectedPrimaryAccountKey(primaryAccounts[0].account_key);
    }
  }, [primaryAccounts]);

  return (
    <div className="space-y-6">
      {/* Add Account Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Account
        </h3>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., My Personal Account" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Jane Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="emailid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="e.g., jane.doe@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={addAccountMutation.isPending}>
                {addAccountMutation.isPending ? "Adding..." : "Add Account"}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      <Separator />

      {/* View Accounts Table Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Mail className="h-4 w-4" /> All Accounts
        </h3>
        {primaryAccountsLoading ? (
            <div className="flex items-center justify-center h-12">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium leading-none">
                Select Primary Zoho Account:
              </p>
              <Select value={selectedPrimaryAccountKey || ''} onValueChange={setSelectedPrimaryAccountKey}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select an account" />
                </SelectTrigger>
                <SelectContent>
                  {primaryAccounts?.map((account) => (
                    <SelectItem key={account.account_key} value={account.account_key}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {subAccountsLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account ID</TableHead>
                    <TableHead>Email Address</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Account Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subAccounts && subAccounts.length > 0 ? (
                    subAccounts.map((account: ZohoSubAccount, index: number) => (
                      <TableRow key={account.account_key}>
                        <TableCell className="font-mono text-muted-foreground">{account.account_key}</TableCell>
                        <TableCell className="font-medium">{account.emailAddress}</TableCell>
                        <TableCell>{account.displayName}</TableCell>
                        <TableCell>{account.enabled ? 'Active' : 'Inactive'}</TableCell>
                        <TableCell>{account.type}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No sub-accounts found for the selected account.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}