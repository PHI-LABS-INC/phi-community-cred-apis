import EndpointLink from "../common/EndpointLink";
import Logo from "../common/Logo";
import SearchBar from "../common/SearchBar";
import { useState, useEffect } from "react";
import Image from "next/image";

interface Endpoint {
  method: string;
  path: string;
  id: string;
  description: string;
}

interface SidebarProps {
  endpoints: Endpoint[];
}

export default function Sidebar({ endpoints }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredEndpoints, setFilteredEndpoints] = useState(endpoints);

  // Close sidebar when screen size changes to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        // lg breakpoint
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

  const handleSearch = (query: string) => {
    const filtered = endpoints.filter(
      (endpoint) =>
        endpoint.description.toLowerCase().includes(query.toLowerCase()) ||
        endpoint.path.toLowerCase().includes(query.toLowerCase()) ||
        endpoint.id.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredEndpoints(filtered);
  };

  return (
    <>
      {/* Header with logo when sidebar is closed */}
      {!isOpen && (
        <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 px-4 flex items-center justify-between z-20">
          <div>
            <Image
              src="/logo.svg"
              alt="PHI Cred APIs Logo"
              width={57}
              height={32}
              className="h-8 w-auto"
            />
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className=" rounded-lg hover:bg-slate-100 transition-colors duration-200"
            aria-label="Open sidebar"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="black"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      )}

      <aside
        className={`${
          isOpen ? "translate-x-0" : "translate-x-full"
        } lg:translate-x-0 transform transition-transform duration-200 ease-in-out fixed lg:static w-[300px] min-h-screen bg-white border-l border-slate-200 right-0 top-0 overflow-y-auto z-10`}
        aria-label="Sidebar navigation"
      >
        <div className="sticky top-0 bg-white z-10 p-6 border-b border-slate-100">
          <Logo />
          <SearchBar onSearch={handleSearch} />
        </div>

        <nav className="p-4" aria-label="API endpoints navigation">
          <div className="text-xs font-semibold text-slate-400 tracking-wider uppercase mb-4 ml-2">
            API Endpoints
          </div>
          <div className="overflow-y-auto max-h-[calc(100vh-10rem)]">
            {filteredEndpoints.length > 0 ? (
              <ul role="list">
                {filteredEndpoints.map((endpoint) => (
                  <li
                    key={endpoint.id}
                    onClick={() => window.innerWidth < 1024 && setIsOpen(false)}
                  >
                    <EndpointLink endpoint={endpoint} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 text-sm ml-2">No endpoints found</p>
            )}
          </div>
        </nav>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-0 lg:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
