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
      <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* Balanced 4-Column Compact Grid Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 pb-5 border-b border-slate-800/60">
          
          {/* Column 1: Brand & Overview */}
          <div className="space-y-2.5">
            <BrandLogo variant="dark" size="sm" showTagline={true} />
            
            <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs">
              Empowering students, faculty, and researchers with accessible physical and digital resources.
            </p>

            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                24/7 Digital Library Access
              </span>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-2 sm:pl-2 lg:pl-4">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider font-poppins">
              Quick Links
            </h4>
            <ul className="space-y-1.5 text-[11px]">
              <li>
                <Link to="/about" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 group">
                  <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-blue-400 transition-colors" />
                  <span>About Us</span>
                </Link>
              </li>
              <li>
                <Link to="/collections" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 group">
                  <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-blue-400 transition-colors" />
                  <span>Collections</span>
                </Link>
              </li>
              <li>
                <Link to="/digital-resources" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 group">
                  <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-blue-400 transition-colors" />
                  <span>Digital Resources</span>
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 group">
                  <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-blue-400 transition-colors" />
                  <span>FAQ</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Services & Help */}
          <div className="space-y-2 sm:pl-2 lg:pl-4">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider font-poppins">
              Services & Help
            </h4>
            <ul className="space-y-1.5 text-[11px]">
              <li>
                <Link to="/book-search" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 group">
                  <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-blue-400 transition-colors" />
                  <span>Catalog Search</span>
                </Link>
              </li>
              <li>
                <Link to="/services" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 group">
                  <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-blue-400 transition-colors" />
                  <span>Library Services</span>
                </Link>
              </li>
              <li>
                <Link to="/downloads" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 group">
                  <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-blue-400 transition-colors" />
                  <span>Downloads & Papers</span>
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 group">
                  <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-blue-400 transition-colors" />
                  <span>Help Desk</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Operating Hours */}
          <div className="space-y-2">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider font-poppins">
              Contact & Hours
            </h4>
            <div className="space-y-1.5 text-[11px] text-slate-400">
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <p className="leading-snug">
                  123 University Avenue, Block A
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <a href="mailto:library@college.edu" className="hover:text-white transition-colors">
                  library@college.edu
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <a href="tel:+15551234567" className="hover:text-white transition-colors">
                  +1 (555) 123-4567
                </a>
              </div>
              <div className="flex items-start gap-2 pt-0.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-200 font-medium block">Mon – Fri: 8:00 AM – 10:00 PM</span>
                  <span className="text-[10px] text-slate-400">Sat: 9:00 AM – 4:00 PM (Closed Sun & Holidays)</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Compact Centered Copyright */}
        <div className="pt-4 text-center text-[11px] text-slate-500 font-medium">
          <p>
            &copy; {currentYear} University Library Enterprise Portal. All rights reserved.
          </p>
        </div>

      </div>
    </footer>
  );
}
