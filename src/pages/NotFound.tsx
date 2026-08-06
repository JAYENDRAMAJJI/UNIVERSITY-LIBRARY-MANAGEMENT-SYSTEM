import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-bold font-poppins text-slate-900 mb-4">404</h1>
      <h2 className="text-2xl font-medium text-slate-700 mb-6">Page Not Found</h2>
      <p className="text-slate-500 mb-8 max-w-md">
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      <Link 
        to="/" 
        className="bg-blue-800 hover:bg-blue-900 text-white font-medium px-6 py-3 rounded-md transition-colors"
      >
        Return to Home
      </Link>
    </div>
  );
}
