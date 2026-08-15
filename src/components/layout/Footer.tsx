export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-white text-base font-bold mb-2 font-poppins">College Library</h3>
            <p className="text-xs leading-relaxed max-w-sm text-slate-400">
              Empowering students and faculty with comprehensive digital and physical resources to foster academic excellence and research innovation.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-2">Quick Links</h4>
            <ul className="space-y-1.5 text-xs">
              <li><a href="/about" className="hover:text-blue-400 transition-colors">About Us</a></li>
              <li><a href="/collections" className="hover:text-blue-400 transition-colors">Collections</a></li>
              <li><a href="/digital-resources" className="hover:text-blue-400 transition-colors">Digital Resources</a></li>
              <li><a href="/faq" className="hover:text-blue-400 transition-colors">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-2">Contact</h4>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li>123 University Avenue</li>
              <li>Academic Block A</li>
              <li>library@college.edu</li>
              <li>+1 (555) 123-4567</li>
            </ul>
          </div>
        </div>
        <div className="mt-6 pt-3 text-center text-xs font-normal text-slate-400">
          &copy; {new Date().getFullYear()} College Library. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
