import { useState, useCallback, useEffect } from "react";
import { CheckCircleIcon, XCircleIcon } from "lucide-react";

interface HealthStatus {
  mint_eligibility: boolean;
  data: string;
  signature: string;
  latency?: number;
}

interface ApiHealthStatusProps {
  path: string;
}

export function ApiHealthStatus({ path }: ApiHealthStatusProps) {
  const baseUrl = window.location.origin;
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({
    mint_eligibility: false,
    data: "",
    signature: "",
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [showHealth, setShowHealth] = useState<boolean>(false);

  const checkEndpointHealth = useCallback(async (endpoint: string) => {
    setLoading(true);
    setShowHealth(false);
    try {
      const startTime = performance.now();
      const response = await fetch(
        `${baseUrl}${endpoint}?address=0x742d35Cc6634C0532925a3b844Bc454e4438f44e`
      );
      const latency = performance.now() - startTime;
      const result = await response.json();

      console.log(result);
      const isHealthy =
        typeof result.mint_eligibility === "boolean" &&
        result.data !== "NaN" &&
        result.data !== "error" &&
        typeof result.signature === "string";

      setHealthStatus({
        mint_eligibility: isHealthy,
        data: result.data,
        signature: result.signature,
        latency: Math.round(latency),
      });
      setShowHealth(true);
    } catch {
      setHealthStatus({
        mint_eligibility: false,
        data: "",
        signature: "",
      });
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    setShowHealth(false);
  }, [path]);

  const getSquareColor = (index: number, latency: number) => {
    if (!healthStatus.mint_eligibility) {
      return "bg-transparent border-red-500";
    }
    const greenSquares = Math.max(0, 10 - Math.floor(latency / 500));
    return index < greenSquares ? "bg-green-500" : "bg-red-500";
  };

  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row justify-between mb-4">
        <h3 className="text-xl font-bold text-slate-900">API Health Status</h3>
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 border border-slate-200 rounded-lg shadow-sm space-y-4 sm:space-y-0">
        <div className="flex-1">
          <h4 className="text-md text-slate-900 break-words">{path}</h4>
        </div>

        <div className="flex items-center gap-4 flex-1 justify-center">
          {loading ? (
            <div className="flex items-center gap-1">
              {[...Array(10)].map((_, index) => (
                <div
                  key={index}
                  className="w-3 h-3 rounded-full bg-slate-200 animate-pulse"
                ></div>
              ))}
              <div className="w-12 h-3 bg-slate-200 animate-pulse ml-2"></div>
            </div>
          ) : (
            showHealth && (
              <>
                {healthStatus.latency !== undefined && (
                  <div className="flex items-center gap-1">
                    {[...Array(10)].map((_, index) => (
                      <div
                        key={index}
                        className={`w-3 h-3 rounded-full border ${getSquareColor(
                          index,
                          healthStatus.latency!
                        )}`}
                      ></div>
                    ))}
                    <span className="text-sm text-slate-500 ml-2">
                      {healthStatus.latency}ms
                    </span>
                  </div>
                )}
                <span className="inline-flex items-center gap-1 text-xs font-medium">
                  {healthStatus.mint_eligibility ? (
                    <>
                      <CheckCircleIcon className="w-5 h-5 text-green-500" />
                      <span className="text-green-700">Healthy</span>
                    </>
                  ) : (
                    <>
                      <XCircleIcon className="w-5 h-5 text-red-500" />
                      <span className="text-red-700">Unhealthy</span>
                    </>
                  )}
                </span>
              </>
            )
          )}
        </div>

        <button
          onClick={() => checkEndpointHealth(path)}
          className="px-4 py-2 w-full sm:w-auto bg-green-500 text-white rounded-lg hover:bg-green-600 focus:ring-green-400 transition duration-300 flex-1 sm:flex-none"
        >
          Check Health
        </button>
      </div>
    </div>
  );
}
