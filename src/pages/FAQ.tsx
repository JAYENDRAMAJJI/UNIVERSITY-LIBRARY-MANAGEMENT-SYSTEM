import React, { useState } from 'react';
import { ChevronDown, Search, HelpCircle, Sparkles } from 'lucide-react';

const FAQ_DATA = [
  {
    question: 'How do I become an active library member?',
    answer: 'All registered college students and faculty members are automatically enrolled into the library database. Your University ID Card functions as your library card. External research scholars can register via the Library Membership form at the main circulation desk.',
  },
  {
    question: 'What are the borrowing limits and borrowing periods for Students & Faculty?',
    answer: 'Undergraduate students can borrow up to 5 books for 7 days. Faculty members can borrow up to 10 books for 30 days. Renewals can be performed up to 2 times via your online student or faculty portal unless the book is reserved by another member.',
  },
  {
    question: 'What are the overdue fine rates and penalty policies?',
    answer: 'An overdue fine of ₹10.00 per day is automatically calculated upon book return. If an accession copy is damaged or lost, the member is responsible for replacing the edition or settling the replacement cost.',
  },
  {
    question: 'How do I access digital e-books, journals, and exam question banks remotely?',
    answer: 'Remote access is available 24/7. Log into your student or faculty portal, navigate to the Digital Library tab, and search or download research papers, syllabus PDFs, and previous semester question banks.',
  },
  {
    question: 'How does the book reservation queue work?',
    answer: 'If a book is currently checked out, you can click "Reserve Hold" on the Library Catalog search page. When the copy is returned, you will be notified and placed in a 48-hour pickup window priority queue.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFaqs = FAQ_DATA.filter(
    (faq) => faq.question.toLowerCase().includes(searchTerm.toLowerCase()) || faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-900 rounded-3xl p-8 text-white shadow-xl text-center">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-300 bg-white/10 px-3.5 py-1 rounded-full mb-3">
          <HelpCircle className="h-4 w-4" /> Member Help & FAQs
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold font-poppins tracking-tight">Frequently Asked Questions</h1>
        <p className="text-slate-300 text-sm md:text-base max-w-xl mx-auto mt-2">
          Find clear answers regarding library policies, catalog search, borrowing allowances, overdue fines, and digital downloads.
        </p>
      </div>

      {/* Search Input */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 relative max-w-2xl mx-auto">
        <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search FAQs (e.g. borrowing period, fines, e-books)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {/* Accordion Items */}
      <div className="max-w-3xl mx-auto space-y-4">
        {filteredFaqs.map((faq, index) => (
          <div key={index} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:border-blue-300 transition-all">
            <button
              className="w-full px-6 py-4 text-left flex justify-between items-center focus:outline-none font-bold text-slate-900 text-sm"
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
            >
              <span>{faq.question}</span>
              <ChevronDown className={`w-5 h-5 text-blue-600 transition-transform ${openIndex === index ? 'rotate-180' : ''}`} />
            </button>
            {openIndex === index && (
              <div className="px-6 pb-4 pt-2 text-slate-600 text-xs leading-relaxed border-t border-slate-100 bg-slate-50/50">
                {faq.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
