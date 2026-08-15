import React from 'react';
import { Monitor, Printer, Wifi, BookOpen, Users, Clock, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LibraryServices() {
  const services = [
    { title: 'Membership & Library Cards', icon: Users, description: 'Faculty, students, and staff receive official digital library cards with QR codes for circulation checkout.' },
    { title: 'Central Reading Hall', icon: BookOpen, description: 'Air-conditioned quiet zones seating up to 500 students with dedicated electrical power ports and ergonomic seating.' },
    { title: 'High-Speed Campus Wi-Fi', icon: Wifi, description: 'High-speed Wi-Fi throughout the library building. Log in using student or faculty network credentials.' },
    { title: 'Reference Desk Assistance', icon: Users, description: 'Expert reference librarians available to assist with literature reviews, thesis citations, and database searches.' },
    { title: 'Photocopy & Document Printing', icon: Printer, description: 'Self-service printing kiosks and scanning stations located on the ground floor.' },
    { title: 'Library Catalog Kiosks', icon: Monitor, description: 'Interactive catalog search kiosks available on all floors for real-time book availability and shelf location search.' },
  ];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-900 rounded-3xl p-8 text-white shadow-xl text-center">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-300 bg-white/10 px-3.5 py-1 rounded-full mb-3">
          <Sparkles className="h-4 w-4" /> Academic Support & Facilities
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold font-poppins tracking-tight">Library Services & Facilities</h1>
        <p className="text-slate-300 text-sm md:text-base max-w-xl mx-auto mt-2">
          Comprehensive physical and digital services designed to empower learning, collaborative study, and research.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service, index) => (
          <div key={index} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <service.icon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold font-poppins text-slate-900">{service.title}</h3>
            <p className="text-slate-600 text-xs leading-relaxed">{service.description}</p>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 rounded-3xl p-8 md:p-10 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div>
          <h2 className="text-2xl font-bold font-poppins mb-1">Need Reference Assistance?</h2>
          <p className="text-blue-200 text-xs">Our reference librarians are available to assist you with finding resources and citation guides.</p>
        </div>
        <Link
          to="/contact"
          className="bg-white text-blue-950 font-bold px-6 py-3 rounded-2xl text-xs hover:bg-blue-50 transition-colors whitespace-nowrap"
        >
          Contact Reference Desk
        </Link>
      </div>
    </div>
  );
}
