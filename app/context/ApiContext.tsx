"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface ApiContextType {
  activeEndpoint: string;
  setActiveEndpoint: (id: string) => void;
}

const ApiContext = createContext<ApiContextType | null>(null);

export function ApiProvider({ children }: { children: ReactNode }) {
  const [activeEndpoint, setActiveEndpointState] = useState("introduction");
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize from URL on mount
  useEffect(() => {
    const endpointFromUrl = searchParams.get("endpoint");
    if (endpointFromUrl) {
      setActiveEndpointState(endpointFromUrl);
    }
  }, [searchParams]);

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
