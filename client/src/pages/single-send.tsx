import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Mail, User, AtSign, Type, Edit3, CheckCircle } from "lucide-react";
import { singleEmailSchema, type SingleEmail, type EmailAccount } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function SingleSend() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSuccess, setShowSuccess] = useState(false);

  const { data: accounts, isLoading: accountsLoading } = useQuery<EmailAccount[]>({
    queryKey: ['/api/accounts']
  });

  const form = useForm<SingleEmail>({
    resolver: zodResolver(singleEmailSchema),
    defaultValues: {
      accountSelect: "",
      toAddress: "",
      subject: "",
      content: "",
    },
  });

  // Auto-select first account when accounts load
  React.useEffect(() => {
    if (accounts && accounts.length > 0 && !form.getValues("accountSelect")) {
      form.setValue("accountSelect", accounts[0].name);
    }
  }, [accounts, form]);

  const sendEmailMutation = useMutation({
    mutationFn: async (data: SingleEmail) => {
      const res = await apiRequest('POST', '/api/send-single-email', data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Email sent successfully!",
        description: `Message ID: ${data.messageId}`,
      });
      setShowSuccess(true);
      form.reset();
      setTimeout(() => setShowSuccess(false), 5000);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SingleEmail) => {
    setShowSuccess(false);
    sendEmailMutation.mutate(data);
  };

  if (accountsLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-4xl mx-auto fade-in">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-3">Send Single Email</h1>
          <p className="text-slate-600">Compose and send individual emails through your Zoho Mail360 account</p>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-6 py-4 rounded-xl">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-3" />
              <span>Email sent successfully!</span>
            </div>
          </div>
        )}

        {/* Main Email Composer Card */}
        <Card className="bg-white rounded-2xl shadow-lg border border-slate-200">
          <CardContent className="p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="form-single-email">
                
                {/* Account Selection */}
                <FormField
                  control={form.control}
                  name="accountSelect"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-slate-700 flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        Select Account
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-account">
                        <FormControl>
                          <SelectTrigger className="form-input w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 bg-white">
                            <SelectValue placeholder="Choose an account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accounts?.map((account) => (
                            <SelectItem key={account.account_key} value={account.account_key}>
                              {account.name} ({account.fromAddress})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Recipient */}
                <FormField
                  control={form.control}
                  name="toAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-slate-700 flex items-center">
                        <AtSign className="h-4 w-4 mr-2" />
                        To
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="recipient@example.com"
                          className="form-input w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300"
                          data-testid="input-to-address"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Subject */}
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-slate-700 flex items-center">
                        <Type className="h-4 w-4 mr-2" />
                        Subject
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter email subject"
                          className="form-input w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300"
                          data-testid="input-subject"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Content */}
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-slate-700 flex items-center">
                        <Edit3 className="h-4 w-4 mr-2" />
                        Message Content
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Textarea
                            placeholder="Compose your email message here..."
                            rows={10}
                            className="form-input w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 resize-y"
                            data-testid="textarea-content"
                            {...field}
                          />
                          <div className="absolute bottom-4 right-4 text-xs text-slate-400">
                            {field.value?.length || 0} characters
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Send Button */}
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={sendEmailMutation.isPending}
                    className="inline-flex items-center px-6 py-3 bg-primary hover:bg-blue-600 text-white font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                    data-testid="button-send-single"
                  >
                    {sendEmailMutation.isPending ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5 mr-2" />
                        Send Email
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
