import { useApi } from "@/app/context/ApiContext";
import { Endpoint } from "@/app/types";

interface EndpointLinkProps {
  endpoint: Endpoint;
}

export default function EndpointLink({ endpoint }: EndpointLinkProps) {
  const { activeEndpoint, setActiveEndpoint } = useApi();
  const isActive = activeEndpoint === endpoint.id;

  // Extract chain from path for better visual organization
  const pathParts = endpoint.path.split("/");
  const chain = pathParts[2] || "";
  const endpointName = pathParts[3] || "";

  const getChainColor = (chain: string) => {
    switch (chain) {
      case "base":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "ethereum":
        return "bg-gray-50 text-gray-700 border-gray-200";
      case "cyber":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "farcaster":
        return "bg-green-50 text-green-700 border-green-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="mb-2">
      <button
        onClick={() => setActiveEndpoint(endpoint.id)}
        className={`w-full group relative overflow-hidden rounded-xl border-2 transition-all duration-200 hover:shadow-md hover:shadow-slate-200/50 ${
          isActive
            ? "bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200 shadow-md shadow-indigo-100/50"
            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        {/* Active indicator */}
        {isActive && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-blue-500" />
        )}

        <div className="p-4 text-left">
          {/* Header with method and chain */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span
                className={`font-mono text-xs font-semibold px-2.5 py-1 rounded-md shadow-sm ${
                  endpoint.method === "GET"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : endpoint.method === "POST"
                    ? "bg-blue-100 text-blue-800 border border-blue-200"
                    : "bg-gray-100 text-gray-800 border border-gray-200"
                }`}
              >
                {endpoint.method}
              </span>
              {chain && (
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-md border ${getChainColor(
                    chain
                  )}`}
                >
                  {chain.charAt(0).toUpperCase() + chain.slice(1)}
                </span>
              )}
            </div>

            {endpoint.supportsMultiWallet && (
              <div className="flex items-center">
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-violet-100 text-violet-700 border border-violet-200">
                  <svg
                    className="w-3 h-3 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zM12 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1V4zM12 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-3z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Multi
                </span>
              </div>
            )}
          </div>

          {/* Endpoint name */}
          <div className="mb-2">
            <h3
              className={`font-medium text-sm transition-colors ${
                isActive
                  ? "text-indigo-900"
                  : "text-slate-900 group-hover:text-indigo-700"
              }`}
            >
              {endpointName
                .split("-")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ")}
            </h3>
          </div>

          {/* Path */}
          <div
            className={`font-mono text-xs transition-colors ${
              isActive
                ? "text-indigo-600"
                : "text-slate-500 group-hover:text-indigo-600"
            }`}
          >
            {endpoint.path}
          </div>

          {/* Description preview */}
          <p
            className={`text-xs mt-2 line-clamp-2 transition-colors ${
              isActive
                ? "text-indigo-700"
                : "text-slate-600 group-hover:text-slate-700"
            }`}
          >
            {endpoint.description}
          </p>
        </div>

        {/* Hover effect overlay */}
        <div
          className={`absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
            isActive ? "opacity-100" : ""
          }`}
        />
      </button>
    </div>
  );
}
