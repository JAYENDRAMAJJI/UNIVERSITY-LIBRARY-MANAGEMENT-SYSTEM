import React, { useState } from 'react';
import { Image as ImageIcon, Sparkles, Eye, X } from 'lucide-react';

export default function Gallery() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);

  const images = [
    {
      id: 1,
      category: 'Infrastructure',
      title: 'Main Library Building Exterior',
      url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 2,
      category: 'Reading Hall',
      title: 'Central Air-Conditioned Study Hall',
      url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 3,
      category: 'Infrastructure',
      title: 'Digital Workstation Lab (50 High-Speed PCs)',
      url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 4,
      category: 'Events',
      title: 'Annual Campus Book Fair & Publisher Expo',
      url: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 5,
      category: 'Reading Hall',
      title: 'Journal & Periodicals Reference Section',
      url: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 6,
      category: 'Events',
      title: 'Research Methodology Workshop & Keynote',
      url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
    },
  ];

  const filteredImages = activeCategory === 'All' ? images : images.filter((img) => img.category === activeCategory);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-900 rounded-3xl p-8 text-white shadow-xl text-center">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-300 bg-white/10 px-3.5 py-1 rounded-full mb-3">
          <ImageIcon className="h-4 w-4" /> Campus Visual Gallery
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold font-poppins tracking-tight">Library Infrastructure Gallery</h1>
        <p className="text-slate-300 text-sm md:text-base max-w-xl mx-auto mt-2">
          Take a virtual tour of our campus reading halls, digital computer labs, and past academic events.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap justify-center gap-2">
        {['All', 'Infrastructure', 'Reading Hall', 'Events'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveCategory(tab)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              activeCategory === tab
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-200'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredImages.map((img) => (
          <div
            key={img.id}
            onClick={() => setSelectedPhoto(img)}
            className="group cursor-pointer rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-lg transition-all"
          >
            <div className="aspect-[4/3] relative overflow-hidden bg-slate-100">
              <img src={img.url} alt={img.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="inline-flex items-center gap-1.5 bg-white text-slate-900 text-xs font-bold px-4 py-2 rounded-xl shadow-lg">
                  <Eye className="w-4 h-4 text-blue-600" /> Preview Full Size
                </span>
              </div>
            </div>
            <div className="p-5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full mb-1 inline-block">
                {img.category}
              </span>
              <h3 className="font-bold text-slate-900 text-sm mt-1">{img.title}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Image Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white rounded-3xl overflow-hidden max-w-3xl w-full shadow-2xl space-y-4 p-4 relative">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-6 right-6 z-10 w-9 h-9 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-slate-950"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={selectedPhoto.url} alt={selectedPhoto.title} className="w-full h-[60vh] object-cover rounded-2xl" />
            <div className="px-2 pb-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
                {selectedPhoto.category}
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedPhoto.title}</h3>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
