import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Mail, User, Users, Type, Edit3, Upload, CheckCircle, XCircle, Code, Eye, Activity, BarChart3, Filter, Download, Search, Trash2, AlertTriangle, Copy, AtSign, Pause, Play, Square } from "lucide-react";
import { bulkEmailSchema, type BulkEmail, type EmailAccount, type EmailResult } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

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

function ResponseCodePopup({ result }: { result: EmailResult }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`px-3 py-1 text-xs font-mono ${
            result.status === 'Success' 
              ? 'text-green-700 border-green-300 hover:bg-green-50' 
              : 'text-red-700 border-red-300 hover:bg-red-50'
          }`}
          data-testid={`button-response-code-${result.recipient}`}
        >
          <Code className="h-3 w-3 mr-1" />
          {result.responseCode || 'N/A'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[70vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Full Response Details - {result.recipient}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center text-sm font-medium text-slate-700">
                <Mail className="h-4 w-4 mr-2" />
                Recipient
              </div>
              <p className="text-sm text-slate-600 font-mono bg-slate-100 p-2 rounded">
                {result.recipient}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center text-sm font-medium text-slate-700">
                <CheckCircle className="h-4 w-4 mr-2" />
                Status
              </div>
              <Badge className={`${
                result.status === 'Success' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {result.status}
              </Badge>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center text-sm font-medium text-slate-700">
              <Code className="h-4 w-4 mr-2" />
              Response Code
            </div>
            <p className={`text-sm font-mono p-2 rounded ${
              result.status === 'Success' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {result.responseCode || 'N/A'}
            </p>
          </div>

          {result.messageId && (
            <div className="space-y-2">
              <div className="flex items-center text-sm font-medium text-slate-700">
                <Mail className="h-4 w-4 mr-2" />
                Message ID
              </div>
              <p className="text-sm text-slate-600 font-mono bg-slate-100 p-2 rounded break-all">
                {result.messageId}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center text-sm font-medium text-slate-700">
              <Eye className="h-4 w-4 mr-2" />
              Full Zoho Response
            </div>
            <div className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-auto max-h-64">
              <pre className="text-xs whitespace-pre-wrap">
                {JSON.stringify(result.fullResponse, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function BulkSend() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showResults, setShowResults] = useState(false);
  const [currentResults, setCurrentResults] = useState<EmailResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [currentRecipientIndex, setCurrentRecipientIndex] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | 'Success' | 'Failed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [selectedPrimaryAccountKey, setSelectedPrimaryAccountKey] = useState<string | null>(null);

  const { data: primaryAccounts, isLoading: primaryAccountsLoading } = useQuery<EmailAccount[]>({
    queryKey: ['/api/accounts']
  });

  const { data: subAccounts, isLoading: subAccountsLoading } = useQuery<ZohoSubAccount[]>({
    queryKey: ['/api/zoho-accounts', selectedPrimaryAccountKey],
    queryFn: async ({ queryKey }) => {
      const [_key, accountKey] = queryKey;
      if (!accountKey) return [];
      const res = await apiRequest('GET', `/api/zoho-accounts?accountKey=${accountKey}`);
      const data = await res.json();
      return z.object({
        status: z.any(),
        data: z.array(zohoSubAccountSchema),
      }).parse(data).data;
    },
    enabled: !!selectedPrimaryAccountKey,
    staleTime: Infinity,
  });

  const { data: results } = useQuery<EmailResult[]>({
    queryKey: ['/api/bulk-results'],
    enabled: showResults,
  });

  const filteredResults = useMemo(() => {
    let filtered = [...(currentResults.length > 0 ? currentResults : results || [])];
    
    filtered = filtered.reverse();
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(result => result.status === statusFilter);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(result => 
        result.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (result.messageId && result.messageId.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    return filtered;
  }, [currentResults, results, statusFilter, searchTerm]);

  const exportToCSV = () => {
    const headers = ['#', 'Recipient', 'Status', 'Message ID', 'Response Code', 'Error'];
    const csvData = filteredResults.map((result, index) => [
      index + 1,
      result.recipient,
      result.status,
      result.messageId || 'N/A',
      result.responseCode || 'N/A',
      result.error || 'N/A'
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `bulk-email-results-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const form = useForm<BulkEmail>({
    resolver: zodResolver(bulkEmailSchema),
    defaultValues: {
      primaryAccountKey: "",
      accountSelect: "",
      recipients: "",
      subject: "",
      content: "",
    },
  });

  useEffect(() => {
    if (primaryAccounts && primaryAccounts.length > 0 && !selectedPrimaryAccountKey) {
      setSelectedPrimaryAccountKey(primaryAccounts[0].account_key);
    }
  }, [primaryAccounts, selectedPrimaryAccountKey]);

  useEffect(() => {
    if (subAccounts && subAccounts.length > 0) {
      form.setValue("primaryAccountKey", selectedPrimaryAccountKey as string);
      form.setValue("accountSelect", subAccounts[0].emailAddress);
    }
  }, [subAccounts, form, selectedPrimaryAccountKey]);


  const recipients = form.watch("recipients");
  const emailAnalysis = useMemo(() => {
    if (!recipients) return { valid: [], invalid: [], duplicates: [], total: 0 };
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const lines = recipients.split('\n').map(email => email.trim()).filter(email => email.length > 0);
    const emailCounts: Record<string, number> = {};
    const valid: string[] = [];
    const invalid: string[] = [];
    const duplicates: string[] = [];
    
    lines.forEach(email => {
      emailCounts[email] = (emailCounts[email] || 0) + 1;
      
      if (emailRegex.test(email)) {
        if (!valid.includes(email)) valid.push(email);
      } else {
        if (!invalid.includes(email)) invalid.push(email);
      }
    });
    
    Object.entries(emailCounts).forEach(([email, count]) => {
      if (count > 1 && !duplicates.includes(email)) {
        duplicates.push(email);
      }
    });
    
    return { valid, invalid, duplicates, total: lines.length };
  }, [recipients]);

  const recipientCount = emailAnalysis.total;

  const sendEmailsProgressively = async (formData: BulkEmail) => {
    setIsProcessing(true);
    setShowResults(true);
    setCurrentResults([]);
    setCurrentRecipientIndex(0);
    setIsPaused(false);
    setIsEnded(false);

    const recipientList = formData.recipients.split('\n').map(email => email.trim()).filter(email => email);
    const tempResults: EmailResult[] = [];

    for (let i = 0; i < recipientList.length; i++) {
      // Pause/End logic
      while (isPaused && !isEnded) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (isEnded) break;

      setCurrentRecipientIndex(i + 1);
      
      try {
        const singleEmailData = {
          primaryAccountKey: selectedPrimaryAccountKey,
          accountSelect: formData.accountSelect,
          toAddress: recipientList[i],
          subject: formData.subject,
          content: formData.content,
        };

        const res = await apiRequest('POST', '/api/send-single-email', singleEmailData);
        const result = await res.json();

        const emailResult: EmailResult = {
          recipient: recipientList[i],
          status: result.success ? 'Success' : 'Failed',
          messageId: result.messageId || null,
          responseCode: result.responseCode || null,
          error: result.success ? null : result.error,
          fullResponse: result.fullResponse || null,
        };

        tempResults.push(emailResult);
        setCurrentResults([...tempResults]);

        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error: any) {
        const emailResult: EmailResult = {
          recipient: recipientList[i],
          status: 'Failed',
          messageId: null,
          responseCode: 500,
          error: error.message,
          fullResponse: error,
        };
        tempResults.push(emailResult);
        setCurrentResults([...tempResults]);
      }
    }

    setIsProcessing(false);
    
    try {
      await apiRequest('POST', '/api/store-bulk-results', { results: tempResults });
    } catch (error) {
      console.log('Note: Could not store results for stats');
    }
    
    queryClient.invalidateQueries({ queryKey: ['/api/bulk-results'] });
    
    toast({
      title: "Bulk email process completed!",
      description: `Processed ${tempResults.length} recipients`,
    });
  };

  const sendBulkEmailMutation = useMutation({
    mutationFn: sendEmailsProgressively,
    onError: (error: any) => {
      setIsProcessing(false);
      toast({
        title: "Failed to send bulk emails",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BulkEmail) => {
    // Keep all emails, including duplicates and invalid ones, for processing
    const emailList = recipients.split('\n').map(email => email.trim()).filter(email => email.length > 0);
    
    console.log('Email processing:', {
      total: emailList.length,
      emailList: emailList
    });
    
    const cleanedData = {
      ...data,
      recipients: emailList.join('\n')
    };
    sendBulkEmailMutation.mutate(cleanedData);
  };

  const clearForm = () => {
    form.reset({
      primaryAccountKey: '',
      accountSelect: '',
      recipients: '',
      subject: '',
      content: ''
    });
    setShowEmailPreview(false);
  };

  const removeInvalidEmails = () => {
    const emailList = recipients.split('\n').map(email => email.trim()).filter(email => email.length > 0);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validEmails = emailList.filter(email => emailRegex.test(email));
    const uniqueValidEmails = Array.from(new Set(validEmails));
    form.setValue('recipients', uniqueValidEmails.join('\n'));
  };

  const removeDuplicates = () => {
    const emails = recipients.split('\n').map(email => email.trim()).filter(email => email.length > 0);
    const uniqueEmails = Array.from(new Set(emails));
    form.setValue('recipients', uniqueEmails.join('\n'));
  };

  if (primaryAccountsLoading) {
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
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-2">
            <BarChart3 className="h-6 w-6 text-primary mr-2" />
            <h1 className="text-2xl font-bold text-slate-800">Bulk Email Dashboard</h1>
          </div>
          <p className="text-sm text-slate-600">Send bulk emails and track results in real-time</p>
        </div>

        <Card className="bg-white rounded-lg shadow-md border border-slate-200">
          <CardContent className="p-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="form-bulk-email">
                
                {/* Primary Account Selection */}
                <FormItem>
                  <FormLabel className="text-xs font-medium text-slate-600 flex items-center">
                    <User className="h-3 w-3 mr-1" />
                    Primary Account
                  </FormLabel>
                  <Select onValueChange={setSelectedPrimaryAccountKey} value={selectedPrimaryAccountKey || ''} data-testid="select-primary-account">
                    <FormControl>
                      <SelectTrigger className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                        <SelectValue placeholder="Choose a primary account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {primaryAccounts?.map((account) => (
                        <SelectItem key={account.account_key} value={account.account_key}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>

                {/* Sub-account (From Address) Selection */}
                <FormField
                  control={form.control}
                  name="accountSelect"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-slate-600 flex items-center">
                        <AtSign className="h-3 w-3 mr-1" />
                        From Address
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} data-testid="select-sub-account">
                        <FormControl>
                          <SelectTrigger className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                            <SelectValue placeholder="Choose a from address" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subAccountsLoading ? (
                            <div className="flex items-center justify-center p-4">
                              <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            </div>
                          ) : (
                            subAccounts?.map((account) => (
                              <SelectItem key={account.account_key} value={account.emailAddress}>
                                {account.displayName} ({account.emailAddress})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Recipients */}
                <FormField
                  control={form.control}
                  name="recipients"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-slate-600 flex items-center justify-between">
                        <div className="flex items-center">
                          <Users className="h-3 w-3 mr-1" />
                          Recipients <span className="text-xs text-slate-400 ml-1">(One per line)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {emailAnalysis.invalid.length > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={removeInvalidEmails}
                              className="h-6 px-2 text-xs text-red-600 hover:bg-red-50"
                              data-testid="button-remove-invalid"
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Fix Invalid ({emailAnalysis.invalid.length})
                            </Button>
                          )}
                          {emailAnalysis.duplicates.length > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={removeDuplicates}
                              className="h-6 px-2 text-xs text-orange-600 hover:bg-orange-50"
                              data-testid="button-remove-duplicates"
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Remove Duplicates ({emailAnalysis.duplicates.length})
                            </Button>
                          )}
                        </div>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Textarea
                            placeholder="recipient1@example.com&#10;recipient2@example.com"
                            rows={5}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono resize-y"
                            data-testid="textarea-recipients"
                            {...field}
                          />
                          <div className="absolute top-2 right-2 flex items-center space-x-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => form.setValue('recipients', '')}
                              className="h-6 w-6 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                              data-testid="button-clear-recipients"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                            <div className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs">
                              {recipientCount}
                            </div>
                          </div>
                        </div>
                      </FormControl>
                      {recipients && (
                        <div className="flex items-center space-x-3 text-xs mt-2">
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span className="text-green-600 font-medium">{emailAnalysis.valid.length} Valid</span>
                          </div>
                          {emailAnalysis.invalid.length > 0 && (
                            <div className="flex items-center space-x-1">
                              <AlertTriangle className="h-3 w-3 text-red-600" />
                              <span className="text-red-600 font-medium">{emailAnalysis.invalid.length} Invalid</span>
                            </div>
                          )}
                          {emailAnalysis.duplicates.length > 0 && (
                            <div className="flex items-center space-x-1">
                              <Copy className="h-3 w-3 text-orange-600" />
                              <span className="text-orange-600 font-medium">{emailAnalysis.duplicates.length} Duplicates</span>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <FormMessage />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:text-blue-600 text-sm font-medium transition-colors"
                          data-testid="button-import-csv"
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          Import from CSV
                        </Button>
                      </div>
                    </FormItem>
                  )}
                />

                {/* Subject */}
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-slate-600 flex items-center">
                        <Type className="h-3 w-3 mr-1" />
                        Subject
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Email subject"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                          data-testid="input-bulk-subject"
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
                      <FormLabel className="text-xs font-medium text-slate-600 flex items-center">
                        <Edit3 className="h-3 w-3 mr-1" />
                        Content
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Email message..."
                          rows={6}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-y"
                          data-testid="textarea-bulk-content"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Action Buttons */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowEmailPreview(!showEmailPreview)}
                      className="px-3 py-2 text-sm"
                      data-testid="button-preview-email"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {showEmailPreview ? 'Hide Preview' : 'Preview Email'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={clearForm}
                      className="px-3 py-2 text-sm text-red-600 border-red-300 hover:bg-red-50"
                      data-testid="button-clear-form"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear
                    </Button>
                  </div>
                  {isProcessing ? (
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant={isPaused ? "default" : "secondary"}
                        onClick={() => setIsPaused(!isPaused)}
                      >
                        {isPaused ? <><Play className="h-4 w-4 mr-2" /> Resume</> : <><Pause className="h-4 w-4 mr-2" /> Pause</>}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => setIsEnded(true)}
                      >
                        <Square className="h-4 w-4 mr-2" /> End Job
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="submit"
                      disabled={emailAnalysis.total === 0}
                      className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg disabled:opacity-50"
                      data-testid="button-send-bulk"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send to {emailAnalysis.total} Recipients
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {showResults && (currentResults.length > 0 || (results && results.length > 0)) && (
        <div className="mt-6 fade-in">
          <Card className="bg-white rounded-lg shadow-md border border-slate-200">
            <CardHeader className="px-4 py-3 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-800 flex items-center">
                  <Activity className="h-4 w-4 mr-2" />
                  Email Results ({filteredResults.length} showing)
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="h-3 w-3 absolute left-2 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-32 h-7 pl-7 pr-2 text-xs border-slate-300"
                      data-testid="input-search-results"
                    />
                  </div>
                  
                  <Select value={statusFilter} onValueChange={(value: 'all' | 'Success' | 'Failed') => setStatusFilter(value)}>
                        <SelectTrigger className="w-24 h-7 text-xs border-slate-300" data-testid="select-status-filter">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="Success">Success</SelectItem>
                          <SelectItem value="Failed">Failed</SelectItem>
                        </SelectContent>
                      </Select>
                  
                  <Button
                    onClick={exportToCSV}
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    data-testid="button-export-csv"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-80 overflow-y-auto">
                {filteredResults.length === 0 ? (
                  <div className="px-4 py-8 text-center text-slate-500 text-sm">
                    No results match your filters
                  </div>
                ) : (
                  filteredResults.map((result, index) => (
                    <div 
                      key={index} 
                      className="px-4 py-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                      data-testid={`row-result-${index}`}
                    >
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex-1 grid grid-cols-5 gap-3 items-center">
                          <div className="w-8">
                            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                              {index + 1}
                            </span>
                          </div>
                          
                          <div className="truncate">
                            <p className="font-medium text-slate-800 truncate text-xs">{result.recipient}</p>
                          </div>
                          
                          <div>
                            <Badge 
                              className={`text-xs px-2 py-1 ${
                                result.status === 'Success' 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {result.status === 'Success' ? (
                                <CheckCircle className="h-3 w-3 mr-1" />
                              ) : (
                                <XCircle className="h-3 w-3 mr-1" />
                              )}
                              {result.status}
                            </Badge>
                          </div>
                          
                          <div className="text-xs text-slate-600 font-mono truncate">
                            {result.messageId ? result.messageId.substring(0, 12) + '...' : 'N/A'}
                          </div>
                          
                          <div className="text-right">
                            <ResponseCodePopup result={result} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}