import { useApi } from "@/app/context/ApiContext";
import { endpoints, parameters } from "@/data/api-config";
import EndpointSection from "./EndpointSection";

export default function ApiContent() {
  const { activeEndpoint } = useApi();

  if (activeEndpoint === "introduction") {
    return (
      <section id="introduction" className="mb-8  sm:mb-12 text-slate-900">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4 text-slate-900 tracking-tight">
          PHI Community Creds API
        </h1>
        <p className="text-slate-600 text-base sm:text-lg mb-4 sm:mb-6">
          A comprehensive API for verifying and managing PHI community creds
          through seamless PHI.box integration
        </p>
        <div className="prose prose-slate max-w-none">
          <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">
            API-Based Cred Verification
          </h2>
          <p className="mb-3 sm:mb-4 text-sm sm:text-base">
            This API provides a robust solution for real-time cred verification
            through PHI.box integration. It enables verifiers to perform
            detailed cred eligibility checks with customizable criteria while
            maintaining high security standards.
          </p>

          <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">
            Key Features:
          </h3>
          <ul className="list-disc pl-4 sm:pl-6 mb-3 sm:mb-4 text-sm sm:text-base">
            <li>
              Dynamic cred eligibility verification with customizable criteria
            </li>
            <li>Real-time cred validation and secure signature generation</li>
            <li>Seamless integration with the PHI.box ecosystem</li>
            <li>
              Comprehensive JSON responses with detailed cred eligibility status
            </li>
            <li>Built-in error handling and validation</li>
          </ul>

          <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">
            Benefits:
          </h3>
          <ul className="list-disc pl-4 sm:pl-6 mb-3 sm:mb-4 text-sm sm:text-base">
            <li>
              Advanced support for complex cred verification logic and off-chain
              data
            </li>
            <li>Flexible and instantly updatable cred verification criteria</li>
            <li>Extensive documentation and developer support</li>
            <li>Optimized performance with minimal latency</li>
          </ul>
        </div>
      </section>
    );
  }

  const endpoint = endpoints.find((e) => e.id === activeEndpoint);

  if (!endpoint) {
    return (
      <div className="text-center py-8 sm:py-12">
        <p className="text-slate-600 text-sm sm:text-base">
          Endpoint not found
        </p>
      </div>
    );
  }

  return (
    <EndpointSection
      method={endpoint.method}
      path={endpoint.path}
      description={`API endpoint for ${endpoint.id} cred - ${endpoint.description}`}
      parameters={parameters}
    />
  );
}
