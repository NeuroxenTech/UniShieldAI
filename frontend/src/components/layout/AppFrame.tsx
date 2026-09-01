import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppFrame() {
  return (
    <div className="h-full bg-[#0A0A14] text-white overflow-hidden">
      <Sidebar />
      <TopBar />
      <main className="absolute top-16 bottom-14 left-0 right-0 md:bottom-0 md:left-16 overflow-y-auto thin-scroll">
        <div className="min-h-full ambient">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
