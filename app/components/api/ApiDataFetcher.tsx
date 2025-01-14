import { useState, useCallback, useEffect } from "react";

interface ApiDataFetcherProps {
  path: string;
}

interface ApiResponse {
  [key: string]: unknown;
}

export function ApiDataFetcher({ path }: ApiDataFetcherProps) {
  const baseUrl = window.location.origin;
  const [address, setAddress] = useState<string>("");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${baseUrl}${path}?address=${address}`);
      const result: ApiResponse = await response.json();
      setData(result);
    } catch {
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [address, baseUrl, path]);

  useEffect(() => {
    // Reset state when path changes
    setAddress("");
    setData(null);
    setLoading(false);
    setError(null);
  }, [path]);

  return (
    <div className="mb-8">
      <h3 className="text-xl font-bold mb-4 text-slate-900">Test Endpoint</h3>

      <div className="flex flex-col space-y-4">
        <div className="flex flex-col sm:flex-row justify-between space-y-4 sm:space-y-0 sm:space-x-4">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter wallet address"
            className="flex-1 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none "
          />
          <button
            onClick={fetchData}
            className="px-4 py-2 w-full sm:w-auto bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition duration-300"
          >
            Fetch Data
          </button>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 shadow-sm overflow-auto">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-slate-200 rounded"></div>
                <div className="h-4 bg-slate-200 rounded"></div>
                <div className="h-4 bg-slate-200 rounded"></div>
              </div>
            </div>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : data ? (
            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 shadow-sm overflow-auto">
              <pre className="text-sm text-slate-800 break-words">
                <code>{JSON.stringify(data, null, 2)}</code>
              </pre>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
