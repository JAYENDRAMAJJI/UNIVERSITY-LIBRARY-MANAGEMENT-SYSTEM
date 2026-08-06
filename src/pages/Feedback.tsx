import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Star, Send, CheckCircle2, MessageSquare, Sparkles, ThumbsUp, RefreshCw } from 'lucide-react';
import { libraryStore } from '../services/libraryStore.service';
import { useAuth } from '../context/AuthContext';

export default function Feedback() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [category, setCategory] = useState('Book Collections');
  const [comments, setComments] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }
    if (rating === 0 || !comments) return;

    setIsSubmitting(true);

    setTimeout(() => {
      libraryStore.addAuditLog(
        user?.id || 'guest',
        user?.name || 'Guest Visitor',
        user?.role || 'GUEST',
        'SUBMIT_FEEDBACK',
        'FEEDBACK_MODULE',
        `Rating: ${rating}/5 Stars | Category: ${category} | Comments: ${comments}`
      );

      setIsSubmitting(false);
      setSubmitted(true);
    }, 600);
  };

  const handleReset = () => {
    setRating(0);
    setHoveredRating(0);
    setComments('');
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center min-h-[60vh] flex flex-col items-center justify-center space-y-6">
        <div className="w-20 h-20 bg-emerald-100/80 border border-emerald-200 rounded-3xl flex items-center justify-center shadow-lg shadow-emerald-100/50 animate-bounce">
          <ThumbsUp className="w-10 h-10 text-emerald-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-extrabold font-poppins text-slate-950">Thank You for Your Feedback!</h2>
          <p className="text-slate-600 max-w-lg mx-auto text-sm leading-relaxed">
            Your review and suggestions have been recorded cleanly in our library feedback portal. We continuously use member feedback to improve campus resources.
          </p>
        </div>
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm shadow-md shadow-blue-200 hover:opacity-95 transition-all"
        >
          <RefreshCw className="w-4 h-4" /> Submit Another Feedback
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-3xl p-8 text-white shadow-xl text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-300 bg-white/10 px-3.5 py-1 rounded-full mb-3">
          <MessageSquare className="h-4 w-4" /> Member Voice Portal
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold font-poppins tracking-tight">Library Experience Feedback</h1>
        <p className="text-slate-300 text-sm md:text-base max-w-xl mx-auto mt-2">
          Rate our physical and digital library services. Your input directly influences collection purchases and portal improvements.
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200/90 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rating Stars Section */}
          <div className="text-center bg-slate-50/80 p-6 rounded-2xl border border-slate-100 space-y-3">
            <label className="block text-sm font-bold text-slate-900 uppercase tracking-wider">
              1. Overall Library Experience Rating *
            </label>
            <div className="flex justify-center items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="focus:outline-none p-1.5 transition-all transform hover:scale-125 active:scale-95"
                >
                  <Star
                    className={`w-10 h-10 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? 'text-amber-400 fill-amber-400 drop-shadow-sm'
                        : 'text-slate-300 fill-slate-100'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs font-semibold text-slate-500">
              {rating > 0 ? `${rating} of 5 Stars Selected` : 'Click a star to rate'}
            </p>
          </div>

          {/* Feedback Category */}
          <div className="space-y-2">
            <label htmlFor="category" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              2. Feedback Category *
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
            >
              <option value="Book Collections">Book Collections & Catalog</option>
              <option value="Digital Resources">Digital E-Books & Research Papers</option>
              <option value="Facilities & Infrastructure">Study Spaces & Reading Halls</option>
              <option value="Circulation & Loan Services">Issue, Return & Fine Services</option>
              <option value="Other Suggestions">General Suggestions & Feedback</option>
            </select>
          </div>

          {/* Detailed Comments */}
          <div className="space-y-2">
            <label htmlFor="comments" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              3. Detailed Comments & Suggestions *
            </label>
            <textarea
              id="comments"
              rows={4}
              required
              placeholder="Share specific suggestions or describe your experience in detail..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white text-sm text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={rating === 0 || !comments || isSubmitting}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-bold text-sm shadow-md shadow-blue-200 hover:shadow-lg hover:shadow-blue-200/50 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" /> Submit Feedback Response
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
