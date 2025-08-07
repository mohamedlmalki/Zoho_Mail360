import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { BarChart3, Loader2, RefreshCw } from "lucide-react";
import { apiRequest } from '@/lib/queryClient';

// This defines the structure of a single bounce record from our database
type BounceRecord = {
    id: number;
    recipient: string;
    bounceType: string;
    accountKey: string;
    createdAt: string;
};

export default function BounceDashboard() {
  // useQuery is a powerful hook that fetches and caches data from your API.
  const { data: bounces, isLoading, isError, refetch } = useQuery<BounceRecord[]>({
    queryKey: ['/api/bounces'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/bounces');
      return res.json();
    }
  });

  // Log the fetched data to the browser console for debugging
  if (bounces) {
    console.log("Fetched Bounces:", bounces);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-6xl mx-auto fade-in">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <BarChart3 className="h-8 w-8 text-primary mr-3" />
            <h1 className="text-3xl font-bold text-slate-800">Bounce & Delivery Dashboard</h1>
          </div>
          <p className="text-slate-600">Live statistics for your email campaigns.</p>
        </div>

        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Bounce Logs</CardTitle>
                <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </CardHeader>
            <CardContent>
                {isLoading && (
                    <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="ml-4 text-slate-500">Loading bounce data...</p>
                    </div>
                )}
                {isError && (
                    <div className="text-red-500 p-8 text-center">
                        <p>Error: Could not fetch bounce data from the server.</p>
                    </div>
                )}
                {bounces && (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Recipient</TableHead>
                                <TableHead>Bounce Type</TableHead>
                                <TableHead>Account Key</TableHead>
                                <TableHead>Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {bounces.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-slate-400 py-8">
                                        No bounces have been recorded yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                bounces.map((bounce) => (
                                    <TableRow key={bounce.id}>
                                        <TableCell className="font-medium">{bounce.recipient}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                bounce.bounceType === 'hard' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {bounce.bounceType}
                                            </span>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">{bounce.accountKey}</TableCell>
                                        <TableCell>{new Date(bounce.createdAt).toLocaleString()}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}