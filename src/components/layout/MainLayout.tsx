import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import Breadcrumbs from './Breadcrumbs';

export default function MainLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 font-sans text-slate-900">
      <Navbar />
      <Breadcrumbs />
      <main className="flex-grow max-w-7xl 2xl:max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 w-full py-4 sm:py-6 lg:py-8 min-w-0">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
