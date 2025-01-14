import { useApi } from "@/app/context/ApiContext";

interface Endpoint {
  id: string;
  method: string;
  path: string;
  description: string;
}

interface EndpointLinkProps {
  endpoint: Endpoint;
}

export default function EndpointLink({ endpoint }: EndpointLinkProps) {
  const { activeEndpoint, setActiveEndpoint } = useApi();

  return (
    <div className="mb-1">
      <button
        onClick={() => setActiveEndpoint(endpoint.id)}
        className={`w-full flex items-center space-x-3 py-2.5 px-3 rounded-lg 
                   transition-colors group text-left
                   ${
                     activeEndpoint === endpoint.id
                       ? "bg-slate-50"
                       : "hover:bg-slate-50"
                   }`}
      >
        <span
          className={`font-mono text-xs font-medium px-2 py-1 rounded-md
                    ${
                      endpoint.method === "GET"
                        ? "bg-emerald-100 text-emerald-700"
                        : endpoint.method === "POST"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
        >
          {endpoint.method}
        </span>
        <span
          className={`text-sm transition-colors
                       ${
                         activeEndpoint === endpoint.id
                           ? "text-indigo-600"
                           : "text-slate-600 group-hover:text-indigo-600"
                       }`}
        >
          {endpoint.path}
        </span>
      </button>
    </div>
  );
}
