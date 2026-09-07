import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function DashboardLayout({ children }: { children?: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="h-screen w-screen max-w-full overflow-hidden flex flex-col bg-slate-100 font-sans text-slate-900">
      {/* Top Sticky Header (Fixed Height h-20, shrink-0) */}
      <Navbar onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)} />

      {/* Main Workspace Split Layout Row */}
      <div className="flex flex-1 overflow-hidden relative w-full">
        {/* Fixed Stationary Sidebar */}
        <Sidebar isOpenMobile={mobileSidebarOpen} onCloseMobile={() => setMobileSidebarOpen(false)} />

        {/* Scrollable Main Content Viewport */}
        <main className="flex-1 w-full min-w-0 h-full overflow-y-auto overflow-x-hidden p-3 sm:p-5 md:p-6 lg:p-7 xl:p-8 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.08),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.06),_transparent_24%),linear-gradient(180deg,_#f8fafc_0%,_#eef4fb_100%)]">
          <div className="max-w-7xl mx-auto w-full min-w-0 space-y-4 sm:space-y-6">
            {children ?? <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
}
