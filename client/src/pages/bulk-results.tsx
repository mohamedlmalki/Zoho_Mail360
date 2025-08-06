import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, CheckCircle, XCircle, Mail, ArrowLeft, Download, Code, Eye, Activity, BarChart3 } from "lucide-react";
import { type EmailResult } from "@shared/schema";

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

export default function BulkResults() {
  const [, setLocation] = useLocation();

  const { data: results, isLoading } = useQuery<EmailResult[]>({
    queryKey: ['/api/bulk-results']
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-slate-800 mb-3">No Results Found</h1>
          <p className="text-slate-600 mb-8">No bulk email results to display</p>
          <Button 
            onClick={() => setLocation('/bulk-send')}
            data-testid="button-back-to-bulk"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Send Bulk Email
          </Button>
        </div>
      </div>
    );
  }

  const successCount = results.filter(r => r.status === 'Success').length;
  const failedCount = results.filter(r => r.status === 'Failed').length;
  const totalCount = results.length;
  const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-6xl mx-auto fade-in">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <BarChart3 className="h-8 w-8 text-primary mr-3" />
            <h1 className="text-3xl font-bold text-slate-800">Bulk Email Dashboard</h1>
          </div>
          <p className="text-slate-600">Complete analysis of your bulk email sending operation</p>
        </div>

        {/* Enhanced Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Successful</p>
                  <p className="text-3xl font-bold" data-testid="text-success-count">{successCount}</p>
                </div>
                <CheckCircle className="h-10 w-10 text-green-100" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-2xl shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm font-medium">Failed</p>
                  <p className="text-3xl font-bold" data-testid="text-failed-count">{failedCount}</p>
                </div>
                <XCircle className="h-10 w-10 text-red-100" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Emails</p>
                  <p className="text-3xl font-bold" data-testid="text-total-count">{totalCount}</p>
                </div>
                <Mail className="h-10 w-10 text-blue-100" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Success Rate</p>
                  <p className="text-3xl font-bold">{successRate}%</p>
                </div>
                <Activity className="h-10 w-10 text-purple-100" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Button
            onClick={() => setLocation('/bulk-send')}
            className="inline-flex items-center px-6 py-3 bg-primary hover:bg-blue-600 text-white font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
            data-testid="button-send-another"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Send Another Bulk Email
          </Button>
          <Button
            variant="outline"
            className="inline-flex items-center px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-xl border border-slate-300 transition-all duration-300"
            data-testid="button-export-results"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Results
          </Button>
        </div>

        {/* Enhanced Results List */}
        <Card className="bg-white rounded-2xl shadow-lg border border-slate-200">
          <CardHeader className="px-6 py-4 border-b border-slate-200">
            <CardTitle className="text-lg font-semibold text-slate-800 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Detailed Results
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-200">
              {results.map((result, index) => (
                <div 
                  key={index} 
                  className="px-6 py-4 hover:bg-slate-50 transition-colors duration-150"
                  data-testid={`row-result-${index}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                      {/* Recipient */}
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Recipient</p>
                        <p className="text-sm font-medium text-slate-800 break-all">
                          {result.recipient}
                        </p>
                      </div>

                      {/* Status */}
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Status</p>
                        <Badge 
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            result.status === 'Success' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
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

                      {/* Message ID */}
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Message ID</p>
                        <p className="text-sm text-slate-600 font-mono break-all">
                          {result.messageId || 'N/A'}
                        </p>
                      </div>

                      {/* Response Code */}
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Response Code</p>
                        <ResponseCodePopup result={result} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
