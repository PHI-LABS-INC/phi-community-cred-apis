import { createContext, useContext, useState, ReactNode } from "react";

interface ApiContextType {
  activeEndpoint: string;
  setActiveEndpoint: (id: string) => void;
}

const ApiContext = createContext<ApiContextType | null>(null);

export function ApiProvider({ children }: { children: ReactNode }) {
  const [activeEndpoint, setActiveEndpoint] = useState("introduction");

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
