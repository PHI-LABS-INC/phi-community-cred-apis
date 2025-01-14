"use client";
import { ApiProvider } from "@/app/context/ApiContext";
import Sidebar from "@/app/components/layout/Sidebar";
import MainContent from "@/app/components/layout/MainContent";
import { endpoints } from "@/data/api-config";
import ApiContent from "@/app/components/api/ApiContent";

export default function Home() {
  return (
    <ApiProvider>
      <div className="flex bg-slate-50 overflow-hidden">
        <Sidebar endpoints={endpoints} />
        <MainContent>
          <ApiContent />
        </MainContent>
      </div>
    </ApiProvider>
  );
}
