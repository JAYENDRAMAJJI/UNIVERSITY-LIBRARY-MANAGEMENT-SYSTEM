import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar, MapPin, Clock, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Events() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [registeredEvent, setRegisteredEvent] = useState<string | null>(null);

  const events = [
    {
      id: 1,
      title: 'Author Keynote: Artificial Intelligence in Modern Research',
      date: 'Nov 12, 2026',
      time: '2:00 PM - 4:00 PM',
      location: 'Central Reading Hall',
      description: 'Join us for an exclusive keynote and panel discussion with leading computer scientists on AI research frameworks.',
      status: 'Upcoming',
    },
    {
      id: 2,
      title: 'Workshop: Advanced IEEE Digital Repository Searching',
      date: 'Nov 18, 2026',
      time: '10:00 AM - 1:00 PM',
      location: 'Digital Workstation Lab',
      description: 'A hands-on workshop for postgraduate scholars on maximizing research discovery through open digital databases.',
      status: 'Upcoming',
    },
    {
      id: 3,
      title: 'Annual Campus Academic Book Fair 2026',
      date: 'Dec 05, 2026',
      time: '9:00 AM - 6:00 PM',
      location: 'University Library Quad',
      description: 'Exhibition featuring major international publishers, discounted reference textbooks, and journal subscriptions.',
      status: 'Upcoming',
    },
  ];

  const handleRegister = (title: string) => {
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }
    setRegisteredEvent(`Seat confirmed for "${title}". Event reminder added to your portal!`);
    setTimeout(() => setRegisteredEvent(null), 4000);
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-900 rounded-3xl p-8 text-white shadow-xl text-center">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-300 bg-white/10 px-3.5 py-1 rounded-full mb-3">
          <Calendar className="h-4 w-4" /> Academic Exhibitions & Seminars
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold font-poppins tracking-tight">Library Events & Workshops</h1>
        <p className="text-slate-300 text-sm md:text-base max-w-xl mx-auto mt-2">
          Participate in academic workshops, author talks, research paper writing sessions, and annual book exhibitions.
        </p>
      </div>

      {registeredEvent && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium animate-fadeIn">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{registeredEvent}</span>
        </div>
      )}

      <div className="space-y-6">
        {events.map((event) => (
          <div key={event.id} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row hover:border-blue-300 transition-all">
            <div className="bg-blue-50/80 w-full md:w-64 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100 text-center">
              <span className="text-xs font-extrabold text-blue-700 uppercase tracking-wider mb-1">{event.date.split(' ')[0]}</span>
              <span className="text-4xl font-extrabold font-poppins text-slate-900">{event.date.split(' ')[1].replace(',', '')}</span>
              <span className="text-xs text-slate-500 font-semibold">{event.date.split(' ')[2]}</span>
            </div>
            <div className="p-6 md:p-8 flex-1 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-bold font-poppins text-slate-900">{event.title}</h2>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase">
                    {event.status}
                  </span>
                </div>
                <p className="text-slate-600 text-xs leading-relaxed">{event.description}</p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-4 text-slate-500 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>{event.time}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span>{event.location}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleRegister(event.title)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-xs hover:opacity-95 transition-all"
                >
                  Reserve Event Seat
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
