import React, { useState, useEffect } from 'react';
import { Book, FileText, Newspaper, Monitor, Archive, GraduationCap, ArrowRight } from 'lucide-react';
import { libraryStore } from '../services/libraryStore.service';
import { Link } from 'react-router-dom';

export default function Collections() {
  const [state, setState] = useState(libraryStore.snapshot);

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setState);
    return () => sub.unsubscribe();
  }, []);

  const totalBookCopies = state.books.reduce((sum, b) => sum + b.totalCopies, 0);

  const collections = [
    {
      title: 'Academic Books',
      icon: Book,
      count: `${totalBookCopies} Copies`,
      description: 'Comprehensive collection of textbooks, reference books, and academic literature across all departments.',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Peer-Reviewed Journals',
      icon: FileText,
      count: '1,200+ Volumes',
      description: 'National and international peer-reviewed journals to support cutting-edge research.',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Digital E-Books',
      icon: Monitor,
      count: `${state.digitalResources.length} Repositories`,
      description: 'Digital library access to e-books, accessible 24/7 from anywhere through our portal.',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Research & Dissertations',
      icon: GraduationCap,
      count: '500+ Papers',
      description: 'Doctoral thesis and master dissertations submitted by faculty and postgraduate scholars.',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold font-poppins tracking-tight">University Library Collections</h1>
          <p className="text-slate-300 text-sm md:text-base max-w-2xl mt-2">
            Explore our vast repository of knowledge. Our collections are continuously updated to provide the latest academic resources.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {collections.map((item) => (
          <div key={item.title} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between space-y-4">
            <div>
              <div className={`w-12 h-12 rounded-xl ${item.bgColor} flex items-center justify-center mb-4`}>
                <item.icon className={`w-6 h-6 ${item.color}`} />
              </div>
              <h3 className="text-xl font-bold font-poppins text-slate-900 mb-1">{item.title}</h3>
              <div className="text-lg font-bold text-blue-700 mb-2">{item.count}</div>
              <p className="text-slate-600 text-xs leading-relaxed">{item.description}</p>
            </div>

            <Link to="/book-search" className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
              Explore Collection <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
