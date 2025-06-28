import EndpointLink from "../common/EndpointLink";
import Logo from "../common/Logo";
import SearchBar from "../common/SearchBar";
import ChainFilter from "../common/ChainFilter";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Endpoint } from "@/app/types";

interface SidebarProps {
  endpoints: Endpoint[];
}

export default function Sidebar({ endpoints }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredEndpoints, setFilteredEndpoints] = useState(endpoints);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChain, setSelectedChain] = useState("all");

  // Close sidebar when screen size changes to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close sidebar when clicking escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const applyFilters = (query: string, chain: string) => {
    let filtered = endpoints;

    // Apply search filter
    if (query) {
      filtered = filtered.filter(
        (endpoint) =>
          endpoint.description.toLowerCase().includes(query.toLowerCase()) ||
          endpoint.path.toLowerCase().includes(query.toLowerCase()) ||
          endpoint.id.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Apply chain filter
    if (chain !== "all") {
      filtered = filtered.filter((endpoint) =>
        endpoint.path.toLowerCase().includes(`/api/${chain}/`)
      );
    }

    setFilteredEndpoints(filtered);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applyFilters(query, selectedChain);
  };

  const handleChainFilter = (chain: string) => {
    setSelectedChain(chain);
    applyFilters(searchQuery, chain);
  };

  return (
    <>
      {/* Enhanced mobile header */}
      {!isOpen && (
        <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 flex items-center justify-between z-20 shadow-sm">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.svg"
              alt="PHI Cred APIs Logo"
              width={57}
              height={32}
              className="h-8 w-auto"
            />
            <div className="text-sm font-medium text-slate-700">
              PHI Cred APIs
            </div>
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors duration-200 group"
            aria-label="Open sidebar"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-slate-600 group-hover:text-slate-900 transition-colors"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      )}

      <aside
        className={`${
          isOpen ? "translate-x-0" : "translate-x-full"
        } lg:translate-x-0 transform transition-transform duration-300 ease-out fixed lg:static w-[400px] h-[1650px] bg-white border-l border-slate-200 right-0 top-0 overflow-hidden z-10 shadow-2xl lg:shadow-none flex flex-col`}
        aria-label="Sidebar navigation"
      >
        {/* Enhanced sticky header */}
        <div className="flex-shrink-0 bg-white/95 backdrop-blur-sm border-b border-slate-100">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4 lg:justify-start">
              <Logo />
              {/* Close button for mobile */}
              <button
                onClick={() => setIsOpen(false)}
                className="lg:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors duration-200"
                aria-label="Close sidebar"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-slate-500"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <SearchBar onSearch={handleSearch} />
          </div>
        </div>

        <nav
          className="flex-1 overflow-hidden flex flex-col p-6 pt-0"
          aria-label="API endpoints navigation"
        >
          <div className="flex-shrink-0">
            <ChainFilter
              onChainFilter={handleChainFilter}
              endpoints={endpoints}
            />

            {/* Enhanced section header */}
            <div className="flex items-center justify-between mb-6">
              <div className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
                API Endpoints
              </div>
              <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                {filteredEndpoints.length}
              </div>
            </div>
          </div>

          {/* Enhanced endpoints list with scrolling */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {filteredEndpoints.length > 0 ? (
              <ul role="list" className="space-y-0 pb-4">
                {filteredEndpoints
                  .slice()
                  .reverse()
                  .map((endpoint) => (
                    <li
                      key={endpoint.id}
                      onClick={() =>
                        window.innerWidth < 1024 && setIsOpen(false)
                      }
                    >
                      <EndpointLink endpoint={endpoint} />
                    </li>
                  ))}
              </ul>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center py-12">
                  <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <svg
                      className="w-6 h-6 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-slate-500 text-sm font-medium">
                    No endpoints found
                  </p>
                  <p className="text-slate-400 text-xs mt-1">
                    Try adjusting your search or filters
                  </p>
                </div>
              </div>
            )}
          </div>
        </nav>
      </aside>

      {/* Enhanced overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-0 lg:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
