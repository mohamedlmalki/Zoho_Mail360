import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Mail, Send, Users, BarChart3, CheckCircle, XCircle, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type EmailResult } from "@shared/schema";

export default function Navigation() {
  const [location] = useLocation();

  const { data: results } = useQuery<EmailResult[]>({
    queryKey: ['/api/bulk-results'],
    refetchInterval: 2000, // Refresh every 2 seconds for real-time updates
  });

  // Also get current results from bulk-send page
  const { data: currentResults } = useQuery<EmailResult[]>({
    queryKey: ['/api/current-bulk-results'],
    enabled: false, // Only used for cache access
  });

  const isActive = (path: string) => {
    if (path === "/" || path === "/single-send") {
      return location === "/" || location === "/single-send";
    }
    return location === path;
  };

  // Calculate stats from stored results
  const allResults = results || [];
  const successCount = allResults.filter(r => r.status === 'Success').length;
  const failedCount = allResults.filter(r => r.status === 'Failed').length;
  const totalCount = allResults.length;
  const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0;

  // Debug logging
  console.log('Navbar stats:', { totalCount, successCount, failedCount, successRate, results });

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 glass-effect">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <div className="flex items-center space-x-2 cursor-pointer" data-testid="link-logo">
                <Mail className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold text-slate-800">Mail360 Manager</span>
              </div>
            </Link>
          </div>

          {/* Stats in Navbar - Always show when we have data */}
          {totalCount > 0 && (
            <div className="hidden md:flex items-center space-x-3 bg-slate-50 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-slate-700">
                  <span className="text-green-600 font-bold">{successCount}</span> Successful
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-slate-700">
                  <span className="text-red-600 font-bold">{failedCount}</span> Failed
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-slate-700">
                  <span className="text-blue-600 font-bold">{totalCount}</span> Total
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-purple-600" />
                <Badge className="bg-purple-100 text-purple-800 text-xs">
                  {successRate}% Success Rate
                </Badge>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-4">
            <Link href="/single-send">
              <Button
                variant={isActive("/single-send") ? "default" : "ghost"}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isActive("/single-send")
                    ? "text-white bg-primary hover:bg-blue-600"
                    : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                }`}
                data-testid="nav-single-send"
              >
                <Send className="h-4 w-4 mr-2" />
                Single Email
              </Button>
            </Link>
            <Link href="/bulk-send">
              <Button
                variant={isActive("/bulk-send") ? "default" : "ghost"}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isActive("/bulk-send")
                    ? "text-white bg-primary hover:bg-blue-600"
                    : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                }`}
                data-testid="nav-bulk-send"
              >
                <Users className="h-4 w-4 mr-2" />
                Bulk Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
