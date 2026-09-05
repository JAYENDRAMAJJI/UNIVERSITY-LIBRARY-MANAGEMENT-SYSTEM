import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle } from 'lucide-react';
import { libraryStore } from '../services/libraryStore.service';
import { useAuth } from '../context/AuthContext';

export default function Contact() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    subject: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }
    if (!formData.email || !formData.message) return;

    libraryStore.addAuditLog(
      'guest',
      `${formData.firstName} ${formData.lastName}`.trim() || 'Visitor',
      'GUEST',
      'CONTACT_INQUIRY',
      'CONTACT_DESK',
      `Subject: ${formData.subject} | Email: ${formData.email}`
    );

    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
    setFormData({ firstName: '', lastName: '', email: '', subject: '', message: '' });
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-900 rounded-3xl p-8 text-white shadow-xl text-center">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-300 bg-white/10 px-3.5 py-1 rounded-full mb-3">
          <Mail className="h-4 w-4" /> University Central Desk
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold font-poppins tracking-tight">Contact Library Administration</h1>
        <p className="text-slate-300 text-sm md:text-base max-w-xl mx-auto mt-2">
          Have questions regarding circulation policies, research access, or member cards? Send us an official inquiry.
        </p>
      </div>

      {submitted && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium animate-fadeIn">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>Your message has been dispatched cleanly to the Head Librarian desk. We will respond via email.</span>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* Info Card */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
          <h2 className="text-2xl font-bold font-poppins text-slate-900">Library Contact Desk</h2>

          <div className="space-y-5 text-sm">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Physical Location</h3>
                <p className="text-slate-600 text-xs mt-1">123 University Avenue, Academic Block A<br />Central Quad Campus, City 12345</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Telephone Lines</h3>
                <p className="text-slate-600 text-xs mt-1">+1 (555) 123-4567 | Ext: 4001 (Reference Desk)</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Official Email Addresses</h3>
                <p className="text-slate-600 text-xs mt-1">library@college.edu | reference@college.edu</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Circulation Desk Hours</h3>
                <p className="text-slate-600 text-xs mt-1">Mon–Fri: 8:00 AM – 10:00 PM | Sat: 9:00 AM – 4:00 PM | Sun & Holidays: Closed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Message Form */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
          <h2 className="text-2xl font-bold font-poppins text-slate-900 mb-6">Send an Inquiry</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Subject</label>
              <input
                type="text"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Message *</label>
              <textarea
                rows={4}
                required
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-md shadow-blue-200 hover:opacity-95 transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" /> Send Official Inquiry
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
