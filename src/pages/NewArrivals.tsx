import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, Star, Clock, Bookmark, CheckCircle } from 'lucide-react';
import { libraryStore } from '../services/libraryStore.service';
import { useAuth } from '../context/AuthContext';

export default function NewArrivals() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState(libraryStore.snapshot);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  const bookOfMonth = state.books.find((b) => b.isBookOfMonth) || state.books[0];

  const handleReserve = (bookId: string) => {
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }
    const res = libraryStore.reserveBook(bookId, user.email || user.id);
    setToast(res.message);
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-900 rounded-3xl p-8 text-white shadow-xl text-center">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-300 bg-white/10 px-3.5 py-1 rounded-full mb-3">
          <Star className="h-4 w-4" /> Fresh Accessions & Spotlight
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold font-poppins tracking-tight">New Library Arrivals</h1>
        <p className="text-slate-300 text-sm md:text-base max-w-xl mx-auto mt-2">
          Discover the latest text editions, reference manuals, and research titles added to our university catalog.
        </p>
      </div>

      {toast && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium animate-fadeIn">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Book of the Month Spotlight */}
      {bookOfMonth && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-950 rounded-3xl p-8 md:p-10 text-white flex flex-col md:flex-row gap-8 items-center shadow-xl border border-blue-500/20">
          <img src={bookOfMonth.coverUrl} alt={bookOfMonth.title} className="w-48 h-64 object-cover rounded-2xl border-2 border-white/20 shadow-2xl shrink-0" />
          <div className="space-y-3">
            <span className="inline-block px-3 py-1 bg-amber-400 text-slate-950 text-xs font-extrabold rounded-full uppercase tracking-wider">
              Book of the Month Spotlight
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-poppins">{bookOfMonth.title}</h2>
            <p className="text-blue-200 font-semibold text-xs">Author: {bookOfMonth.authorName} | Publisher: {bookOfMonth.publisherName}</p>
            <p className="text-slate-300 text-xs leading-relaxed max-w-2xl">{bookOfMonth.description}</p>

            <div className="pt-2 flex items-center gap-4">
              <button
                onClick={() => handleReserve(bookOfMonth.id)}
                className="bg-white text-blue-950 hover:bg-blue-50 font-bold px-6 py-2.5 rounded-xl text-xs shadow-md transition-all flex items-center gap-2"
              >
                <Bookmark className="h-4 w-4" /> Reserve Copy Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid of New Arrivals */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold font-poppins text-slate-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" /> Catalog Additions
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {state.books.map((book) => (
            <div key={book.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 hover:border-blue-300 transition-all space-y-3 flex flex-col justify-between">
              <div>
                <img src={book.coverUrl} alt={book.title} className="w-full h-44 object-cover rounded-2xl border border-slate-200 mb-3" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  {book.categoryName}
                </span>
                <h3 className="font-bold text-slate-900 text-sm mt-2 line-clamp-1">{book.title}</h3>
                <p className="text-xs text-slate-500">{book.authorName}</p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-700">{book.availableCopies} Available</span>
                <button onClick={() => handleReserve(book.id)} className="text-xs font-semibold text-blue-600 hover:underline">
                  Reserve
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
