import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function DashboardLayout({ children }: { children?: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="h-[100dvh] min-h-[100dvh] w-full max-w-full overflow-hidden flex flex-col bg-slate-100 font-sans text-slate-900">
      {/* Top Sticky Header (Fixed Height h-20, shrink-0) */}
      <Navbar onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)} />

      {/* Main Workspace Split Layout Row */}
      <div className="flex flex-1 overflow-hidden relative w-full min-w-0">
        {/* Fixed Stationary Sidebar */}
        <Sidebar isOpenMobile={mobileSidebarOpen} onCloseMobile={() => setMobileSidebarOpen(false)} />

        {/* Scrollable Main Content Viewport */}
        <main className="flex-1 w-full min-w-0 h-full overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-5 lg:p-6 xl:p-7 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.08),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.06),_transparent_24%),linear-gradient(180deg,_#f8fafc_0%,_#eef4fb_100%)]">
          <div className="w-full max-w-[1720px] 2xl:max-w-[1920px] mx-auto min-w-0 space-y-4 sm:space-y-5 lg:space-y-6">
            {children ?? <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
}
