"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface ApiContextType {
  activeEndpoint: string;
  setActiveEndpoint: (id: string) => void;
}

const ApiContext = createContext<ApiContextType | null>(null);

// Separate component to handle search params
function SearchParamsHandler({
  onEndpointChange,
}: {
  onEndpointChange: (endpoint: string) => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const endpointFromUrl = searchParams.get("endpoint");
    if (endpointFromUrl) {
      onEndpointChange(endpointFromUrl);
    }
  }, [searchParams, onEndpointChange]);

  return null;
}

export function ApiProvider({ children }: { children: ReactNode }) {
  const [activeEndpoint, setActiveEndpointState] = useState("introduction");
  const router = useRouter();

  const handleEndpointChange = (endpoint: string) => {
    setActiveEndpointState(endpoint);
  };

  const setActiveEndpoint = (id: string) => {
    setActiveEndpointState(id);

    // Update URL without causing page refresh
    const newUrl =
      id === "introduction"
        ? window.location.pathname
        : `${window.location.pathname}?endpoint=${encodeURIComponent(id)}`;

    router.replace(newUrl, { scroll: false });
  };

  return (
    <ApiContext.Provider value={{ activeEndpoint, setActiveEndpoint }}>
      <Suspense fallback={null}>
        <SearchParamsHandler onEndpointChange={handleEndpointChange} />
      </Suspense>
      {children}
    </ApiContext.Provider>
  );
}

export function useApi() {
  const context = useContext(ApiContext);
  if (context === null) {
    throw new Error("useApi must be used within an ApiProvider");
  }
  return context;
}
