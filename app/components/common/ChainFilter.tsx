"use client";

import { useState } from "react";
import { Endpoint } from "@/app/types";

interface ChainFilterProps {
  onChainFilter: (chain: string) => void;
  endpoints?: Endpoint[];
}

export default function ChainFilter({
  onChainFilter,
  endpoints = [],
}: ChainFilterProps) {
  const [selectedChain, setSelectedChain] = useState("all");

  const getChainCount = (chainId: string) => {
    if (chainId === "all") return endpoints.length;
    return endpoints.filter((endpoint) =>
      endpoint.path.toLowerCase().includes(`/api/${chainId}/`)
    ).length;
  };

  const chains = [
    {
      id: "all",
      name: "All",
      color: "bg-indigo-500",
      hoverColor: "hover:bg-indigo-600",
      selectedColor: "bg-indigo-500 shadow-indigo-200",
    },
    {
      id: "base",
      name: "Base",
      color: "bg-blue-500",
      hoverColor: "hover:bg-blue-600",
      selectedColor: "bg-blue-500 shadow-blue-200",
    },
    {
      id: "ethereum",
      name: "Ethereum",
      color: "bg-slate-600",
      hoverColor: "hover:bg-slate-700",
      selectedColor: "bg-slate-600 shadow-slate-200",
    },
    {
      id: "cyber",
      name: "Cyber",
      color: "bg-purple-500",
      hoverColor: "hover:bg-purple-600",
      selectedColor: "bg-purple-500 shadow-purple-200",
    },
    {
      id: "farcaster",
      name: "Farcaster",
      color: "bg-emerald-500",
      hoverColor: "hover:bg-emerald-600",
      selectedColor: "bg-emerald-500 shadow-emerald-200",
    },
  ];

  const handleChainSelect = (chainId: string) => {
    setSelectedChain(chainId);
    onChainFilter(chainId);
  };

  return (
    <div className="mb-6">
      <div className="text-xs font-semibold text-slate-400 tracking-wider uppercase mb-3">
        Filter by Chain
      </div>
      <div className="flex flex-wrap gap-2">
        {chains.map((chain) => {
          const count = getChainCount(chain.id);
          const isSelected = selectedChain === chain.id;

          return (
            <button
              key={chain.id}
              onClick={() => handleChainSelect(chain.id)}
              className={`group relative px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                isSelected
                  ? `${chain.selectedColor} text-white shadow-md transform scale-105`
                  : `bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-700 hover:shadow-sm`
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{chain.name}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 text-slate-500 group-hover:bg-slate-300"
                  }`}
                >
                  {count}
                </span>
              </div>

              {/* Subtle glow effect for selected item */}
              {isSelected && (
                <div
                  className={`absolute inset-0 ${chain.color} rounded-xl blur-sm opacity-20 -z-10`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
