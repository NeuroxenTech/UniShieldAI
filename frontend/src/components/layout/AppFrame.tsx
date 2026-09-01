import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppFrame() {
  return (
    <div className="h-full bg-[#050810] text-white overflow-hidden">
      <Sidebar />
      <TopBar />
      <main className="absolute top-16 left-16 right-0 bottom-0 overflow-y-auto thin-scroll">
        <div className="min-h-full ambient">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
