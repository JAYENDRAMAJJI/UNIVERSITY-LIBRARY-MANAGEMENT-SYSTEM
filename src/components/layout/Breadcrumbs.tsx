import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export default function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  if (pathnames.length === 0) return null;

  return (
    <nav className="flex px-4 sm:px-6 lg:px-8 py-3.5 bg-slate-50 border-b border-slate-200" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2 text-base text-slate-500 max-w-7xl mx-auto w-full">
        <li>
          <Link to="/" className="hover:text-blue-800 flex items-center transition-colors">
            <Home className="w-5 h-5" />
            <span className="sr-only">Home</span>
          </Link>
        </li>
        {pathnames.map((value, index) => {
          const last = index === pathnames.length - 1;
          const to = `/${pathnames.slice(0, index + 1).join('/')}`;
          
          // Format the value (e.g., 'book-search' -> 'Book Search')
          const title = value
            .split('-')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

          return (
            <li key={to} className="flex items-center">
              <ChevronRight className="w-5 h-5 mx-1 text-slate-400" />
              {last ? (
                <span className="font-semibold text-slate-900" aria-current="page">
                  {title}
                </span>
              ) : (
                <Link to={to} className="hover:text-blue-800 transition-colors">
                  {title}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
