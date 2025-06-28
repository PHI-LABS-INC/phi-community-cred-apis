import { ApiDataFetcher } from "./ApiDataFetcher";
import { ApiHealthStatus } from "./ApiHealthStatus";
import ParametersTable from "./ParametersTable";
import RequestExample from "./RequestExample";
import ResponseExample from "./ResponseExample";
import { Parameter } from "@/app/types";

interface EndpointSectionProps {
  method: string;
  path: string;
  description: string;
  parameters: Parameter[];
}

export default function EndpointSection({
  method,
  path,
  description,
  parameters,
}: EndpointSectionProps) {
  return (
    <section id="verifytx" className="mb-8 sm:mb-12 ">
      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-3 sm:space-y-0 mb-6 sm:mb-8">
        <span
          className={`px-3 py-1 ${
            method === "GET"
              ? "bg-emerald-100/50 text-emerald-700"
              : "bg-indigo-100/50 text-indigo-700"
          } text-sm rounded-full font-medium w-fit`}
        >
          {method}
        </span>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{path}</h2>
      </div>

      <p className="text-slate-600 text-base sm:text-lg mb-6 sm:mb-8">
        {description}
      </p>

      <div>
        <ParametersTable parameters={parameters} />
        <ApiHealthStatus path={path} />
        <ApiDataFetcher path={path} />
        <RequestExample path={path} />
        <ResponseExample />
      </div>
    </section>
  );
}
