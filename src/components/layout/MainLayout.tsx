import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import Breadcrumbs from './Breadcrumbs';

export default function MainLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 font-sans text-slate-900">
      <Navbar />
      <Breadcrumbs />
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-6 sm:py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
