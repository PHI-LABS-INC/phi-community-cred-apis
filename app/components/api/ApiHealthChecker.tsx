"use client";

import { useState, useCallback } from "react";
import { endpoints } from "@/data/api-config";
import { Endpoint } from "@/app/types";

interface HealthCheckResult {
  endpoint: Endpoint;
  status: "pending" | "success" | "error" | "timeout";
  responseTime?: number;
  statusCode?: number;
  error?: string;
}

const TEST_ADDRESS = "0x55A4696Ba64F8a050632b19AeF734E30E85f5Dfc"; // Valid test Ethereum address

export default function ApiHealthChecker() {
  const [isChecking, setIsChecking] = useState(false);
  const [results, setResults] = useState<HealthCheckResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);

  const checkEndpointHealth = async (
    endpoint: Endpoint
  ): Promise<HealthCheckResult> => {
    const startTime = Date.now();

    try {
      const url = `${window.location.origin}${endpoint.path}?address=${TEST_ADDRESS}`;

      // Create abort controller for timeout handling (better browser compatibility)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        method: endpoint.method,
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      return {
        endpoint,
        status: response.ok ? "success" : "error",
        responseTime,
        statusCode: response.status,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      if (
        error instanceof Error &&
        (error.name === "AbortError" || error.name === "TimeoutError")
      ) {
        return {
          endpoint,
          status: "timeout",
          responseTime,
          error: "Request timeout (10s)",
        };
      }

      return {
        endpoint,
        status: "error",
        responseTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  const runHealthCheck = useCallback(async () => {
    setIsChecking(true);
    setShowResults(true);

    // Initialize results with pending status
    const initialResults = endpoints.map((endpoint) => ({
      endpoint,
      status: "pending" as const,
    }));
    setResults(initialResults);

    // Check all endpoints in parallel with some concurrency control
    const batchSize = 5; // Check 5 endpoints at a time
    const batches = [];

    for (let i = 0; i < endpoints.length; i += batchSize) {
      batches.push(endpoints.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async (endpoint) => {
        const result = await checkEndpointHealth(endpoint);

        // Update results as each endpoint completes
        setResults((prev) =>
          prev.map((r) => (r.endpoint.id === endpoint.id ? result : r))
        );

        return result;
      });

      // Wait for current batch to complete before starting next batch
      await Promise.all(batchPromises);
    }

    setIsChecking(false);
    setLastCheckTime(new Date());
  }, []);

  const getStatusIcon = (status: HealthCheckResult["status"]) => {
    switch (status) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "timeout":
        return "⏱️";
      case "pending":
        return "⏳";
      default:
        return "❓";
    }
  };

  const getStatusColor = (status: HealthCheckResult["status"]) => {
    switch (status) {
      case "success":
        return "text-green-600 bg-green-50 border-green-200";
      case "error":
        return "text-red-600 bg-red-50 border-red-200";
      case "timeout":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "pending":
        return "text-blue-600 bg-blue-50 border-blue-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const successCount = results.filter((r) => r.status === "success").length;
  const errorCount = results.filter((r) => r.status === "error").length;
  const timeoutCount = results.filter((r) => r.status === "timeout").length;
  const pendingCount = results.filter((r) => r.status === "pending").length;

  return (
    <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            🔍 API Health Monitor
          </h3>
          <p className="text-slate-600 text-sm">
            Check the health and response time of all {endpoints.length} API
            endpoints
          </p>
          {lastCheckTime && (
            <p className="text-slate-500 text-xs mt-1">
              Last checked: {lastCheckTime.toLocaleTimeString()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {showResults && !isChecking && (
            <button
              onClick={runHealthCheck}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-all duration-200 text-sm"
            >
              🔄 Refresh
            </button>
          )}

          <button
            onClick={runHealthCheck}
            disabled={isChecking}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
          >
            {isChecking ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                Checking...
              </span>
            ) : (
              "🚀 Run Health Check"
            )}
          </button>
        </div>
      </div>

      {showResults && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-green-50 rounded-xl border border-green-200">
              <div className="text-2xl font-bold text-green-600">
                {successCount}
              </div>
              <div className="text-xs text-green-600 font-medium">Healthy</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-xl border border-red-200">
              <div className="text-2xl font-bold text-red-600">
                {errorCount}
              </div>
              <div className="text-xs text-red-600 font-medium">Errors</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-xl border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">
                {timeoutCount}
              </div>
              <div className="text-xs text-yellow-600 font-medium">
                Timeouts
              </div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-xl border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">
                {pendingCount}
              </div>
              <div className="text-xs text-blue-600 font-medium">Pending</div>
            </div>
          </div>

          {/* Detailed Results */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h4 className="font-medium text-slate-900">Detailed Results</h4>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {results.map((result) => (
                <div
                  key={result.endpoint.id}
                  className="flex items-center justify-between p-4 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-lg">
                        {getStatusIcon(result.status)}
                      </span>
                      <span className="font-mono text-sm text-slate-700 truncate">
                        {result.endpoint.path}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 ml-8">
                      {result.endpoint.description}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ml-4">
                    {result.responseTime && (
                      <span className="text-xs text-slate-500 font-mono">
                        {result.responseTime}ms
                      </span>
                    )}

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                        result.status
                      )}`}
                    >
                      {result.statusCode
                        ? `${result.status.toUpperCase()} (${
                            result.statusCode
                          })`
                        : result.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
