import React from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Mail,
  Phone,
  Clock,
  ChevronRight
} from 'lucide-react';
import BrandLogo from '../common/BrandLogo';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800/80 mt-auto font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        
        {/* Balanced 4-Column Grid Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 pb-10">
          
          {/* Column 1: Brand & Overview */}
          <div className="space-y-4">
            <BrandLogo variant="dark" size="md" showTagline={true} />
            
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Empowering students, faculty, and researchers with accessible physical and digital resources for learning, collaboration, and innovation.
            </p>

            <div className="pt-1">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                24/7 Digital Library Access
              </span>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-3 sm:pl-4 lg:pl-6">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider font-poppins">
              Quick Links
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/about" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 group">
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 transition-colors" />
                  <span>About Us</span>
                </Link>
              </li>
              <li>
                <Link to="/collections" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 group">
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 transition-colors" />
                  <span>Collections</span>
                </Link>
              </li>
              <li>
                <Link to="/digital-resources" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 group">
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 transition-colors" />
                  <span>Digital Resources</span>
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 group">
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 transition-colors" />
                  <span>FAQ</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Services & Help */}
          <div className="space-y-3 sm:pl-4 lg:pl-6">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider font-poppins">
              Services & Help
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/book-search" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 group">
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 transition-colors" />
                  <span>Catalog Search</span>
                </Link>
              </li>
              <li>
                <Link to="/services" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 group">
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 transition-colors" />
                  <span>Library Services</span>
                </Link>
              </li>
              <li>
                <Link to="/downloads" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 group">
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 transition-colors" />
                  <span>Downloads & Papers</span>
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 group">
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 transition-colors" />
                  <span>Help Desk</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Operating Hours */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider font-poppins">
              Contact & Hours
            </h4>
            <div className="space-y-2.5 text-xs text-slate-400">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="leading-snug">
                  123 University Avenue, Academic Block A, Ground Floor
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                <a href="mailto:library@college.edu" className="hover:text-white transition-colors">
                  library@college.edu
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-blue-400 shrink-0" />
                <a href="tel:+15551234567" className="hover:text-white transition-colors">
                  +1 (555) 123-4567
                </a>
              </div>
              <div className="flex items-start gap-2.5 pt-1">
                <Clock className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-200 font-semibold block">Mon – Fri: 8:00 AM – 10:00 PM</span>
                  <span className="text-[11px] text-slate-400">Sat: 9:00 AM – 4:00 PM (Closed Sun & Holidays)</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Centered Copyright */}
        <div className="pt-6 text-center text-xs text-slate-500 font-medium">
          <p>
            &copy; {currentYear} University Library Enterprise Portal. All rights reserved.
          </p>
        </div>

      </div>
    </footer>
  );
}
