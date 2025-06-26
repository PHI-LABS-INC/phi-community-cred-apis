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
  const [addresses, setAddresses] = useState<string>("");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Build URL with address and optionally addresses parameter
      let url = `${baseUrl}${path}?address=${address}`;
      if (addresses.trim()) {
        url += `&addresses=${encodeURIComponent(addresses.trim())}`;
      }

      const response = await fetch(url);
      const result: ApiResponse = await response.json();
      setData(result);
    } catch {
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [address, addresses, baseUrl, path]);

  useEffect(() => {
    // Reset state when path changes
    setAddress("");
    setAddresses("");
    setData(null);
    setLoading(false);
    setError(null);
  }, [path]);

  return (
    <div className="mb-8">
      <h3 className="text-xl font-bold mb-4 text-slate-900">Test Endpoint</h3>

      <div className="flex flex-col space-y-4">
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row justify-between space-y-4 sm:space-y-0 sm:space-x-4">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter primary wallet address (required)"
              className="flex-1 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none"
            />
            <button
              onClick={fetchData}
              disabled={!address.trim()}
              className="px-4 py-2 w-full sm:w-auto bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition duration-300 disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              Fetch Data
            </button>
          </div>

          <div className="flex flex-col">
            <input
              type="text"
              value={addresses}
              onChange={(e) => setAddresses(e.target.value)}
              placeholder="Enter additional addresses (optional, comma-separated)"
              className="border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none"
            />
            <p className="text-sm text-slate-600 mt-1">
              Example: 0x1234...,0x5678...,0x9abc...
            </p>
          </div>
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
