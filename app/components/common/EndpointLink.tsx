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
                       ? "bg-gray-100"
                       : "hover:bg-gray-100"
                   }`}
      >
        <span
          className={`font-mono text-xs font-medium px-2 py-1 rounded-md
                    ${
                      endpoint.method === "GET"
                        ? "bg-green-200 text-green-800"
                        : endpoint.method === "POST"
                        ? "bg-blue-200 text-blue-800"
                        : "bg-gray-200 text-gray-800"
                    }`}
        >
          {endpoint.method}
        </span>
        <span
          className={`text-sm transition-colors
                       ${
                         activeEndpoint === endpoint.id
                           ? "text-green-700"
                           : "text-gray-700 group-hover:text-green-700"
                       }`}
        >
          {endpoint.path}
        </span>
      </button>
    </div>
  );
}
