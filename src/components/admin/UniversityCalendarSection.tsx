import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Search,
  Filter,
  Download,
  RotateCcw,
  Clock,
  Building2,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  CalendarDays,
  ListFilter,
  Sparkles,
  Info,
  Layers,
  ShieldCheck,
  Check,
  X,
  SlidersHorizontal,
  Sun,
  Moon,
  CalendarCheck2,
  CalendarX2,
  BookOpen,
  GraduationCap,
  BellRing,
} from 'lucide-react';
import {
  UniversityCalendarEvent,
  CalendarEventType,
  CalendarEventCategory,
  AttendanceRecord,
} from '../../types/library';
import {
  libraryStore,
  getLocalDateStr,
  getLocalDateTimeStr,
  getLibraryOperatingStatus,
} from '../../services/libraryStore.service';
import { useAuth } from '../../context/AuthContext';

interface UniversityCalendarSectionProps {
  events: UniversityCalendarEvent[];
  attendanceRecords?: AttendanceRecord[];
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const POPULAR_EVENT_PRESETS = [
  { label: 'Republic Day', title: 'Republic Day of India', type: 'HOLIDAY' as CalendarEventType, category: 'GAZETTED_NATIONAL' as CalendarEventCategory, isLibraryOpen: false },
  { label: 'Independence Day', title: 'Independence Day', type: 'HOLIDAY' as CalendarEventType, category: 'GAZETTED_NATIONAL' as CalendarEventCategory, isLibraryOpen: false },
  { label: 'Gandhi Jayanti', title: 'Mahatma Gandhi Jayanti', type: 'HOLIDAY' as CalendarEventType, category: 'GAZETTED_NATIONAL' as CalendarEventCategory, isLibraryOpen: false },
  { label: 'Sunday Exam Study', title: 'Sunday Mid-Term Exam Reading Day', type: 'WORKING_DAY' as CalendarEventType, category: 'EXAMINATION' as CalendarEventCategory, isLibraryOpen: true, openTime: '09:00', closeTime: '21:00' },
  { label: '24/7 Study Desk', title: 'Semester Prep 24/7 Extended Study Desk', type: 'EXAM_PERIOD' as CalendarEventType, category: 'EXAMINATION' as CalendarEventCategory, isLibraryOpen: true, openTime: '07:00', closeTime: '23:59' },
  { label: 'Foundation Day', title: 'University Foundation Day & Exhibition', type: 'SPECIAL_HOURS' as CalendarEventType, category: 'UNIVERSITY_DECLARED' as CalendarEventCategory, isLibraryOpen: true, openTime: '09:00', closeTime: '18:00' },
  { label: 'Maintenance', title: 'Library Catalog & Server Maintenance', type: 'HOLIDAY' as CalendarEventType, category: 'MAINTENANCE' as CalendarEventCategory, isLibraryOpen: false },
];

export default function UniversityCalendarSection({
  events,
  attendanceRecords = [],
}: UniversityCalendarSectionProps) {
  const { user } = useAuth();
  const isAdminOrStaff = user?.role === 'ADMIN' || user?.role === 'STAFF';

  // View Modes: 'MONTH' | 'LIST' | 'AGENDA'
  const [viewMode, setViewMode] = useState<'MONTH' | 'LIST' | 'AGENDA'>('MONTH');

  // Month Navigation State
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-11

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>(String(currentYear));

  // Selected Day Drawer / Detail Modal State
  const [selectedDayDateStr, setSelectedDayDateStr] = useState<string | null>(null);

  // Add / Edit Modal State
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<{
    date: string;
    endDate: string;
    title: string;
    type: CalendarEventType;
    category: CalendarEventCategory;
    isLibraryOpen: boolean;
    openTime: string;
    closeTime: string;
    customHoursText: string;
    description: string;
    declaredBy: string;
    affectedBranches: string[];
    isRecurringAnnually: boolean;
    notes: string;
  }>({
    date: getLocalDateStr(),
    endDate: '',
    title: '',
    type: 'HOLIDAY',
    category: 'UNIVERSITY_DECLARED',
    isLibraryOpen: false,
    openTime: '08:00',
    closeTime: '22:00',
    customHoursText: '',
    description: '',
    declaredBy: isAdminOrStaff ? `${user?.name || 'Chief Admin Librarian'} (Library Desk)` : 'Office of the Registrar',
    affectedBranches: ['Central Library & All Reading Halls'],
    isRecurringAnnually: false,
    notes: '',
  });

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Today's operating status preview
  const todayDateStr = getLocalDateStr(new Date());
  const todayStatus = useMemo(() => getLibraryOperatingStatus(new Date(), events), [events]);

  // Statistics Summary
  const stats = useMemo(() => {
    const list = events || [];
    const thisYearEvents = list.filter((e) => e.date.startsWith(String(currentYear)));
    const totalHolidays = thisYearEvents.filter((e) => e.type === 'HOLIDAY' || !e.isLibraryOpen).length;
    const workingDayOverrides = thisYearEvents.filter((e) => e.type === 'WORKING_DAY' || e.type === 'SPECIAL_HOURS').length;
    const examSpecialPeriods = thisYearEvents.filter((e) => e.type === 'EXAM_PERIOD').length;

    // Next upcoming holiday
    const upcoming = list
      .filter((e) => e.date >= todayDateStr && (e.type === 'HOLIDAY' || !e.isLibraryOpen))
      .sort((a, b) => a.date.localeCompare(b.date))[0];

    return {
      totalHolidays,
      workingDayOverrides,
      examSpecialPeriods,
      nextUpcomingHoliday: upcoming,
      totalCount: thisYearEvents.length,
    };
  }, [events, currentYear, todayDateStr]);

  // Navigate Months & Years
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleGoToToday = () => {
    setCurrentDate(new Date());
  };

  const handleSelectMonth = (mIndex: number) => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), mIndex, 1));
  };

  const handleSelectYear = (yearNum: number) => {
    setCurrentDate((prev) => new Date(yearNum, prev.getMonth(), 1));
  };

  // Month Grid Calculation
  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun, 1 = Mon ...
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const cells: {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSunday: boolean;
      events: UniversityCalendarEvent[];
      visitsCount: number;
    }[] = [];

    const pad = (n: number) => String(n).padStart(2, '0');

    // Previous month trailing days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevM = currentMonth === 0 ? 12 : currentMonth;
      const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevY}-${pad(prevM)}-${pad(dayNum)}`;
      const dayEvents = (events || []).filter(
        (e) => e.date === dateStr || (e.endDate && e.date <= dateStr && e.endDate >= dateStr)
      );
      cells.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayDateStr,
        isSunday: new Date(prevY, prevM - 1, dayNum).getDay() === 0,
        events: dayEvents,
        visitsCount: (attendanceRecords || []).filter((r) => r.date === dateStr).length,
      });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
      const dateStr = `${currentYear}-${pad(currentMonth + 1)}-${pad(dayNum)}`;
      const dayEvents = (events || []).filter(
        (e) => e.date === dateStr || (e.endDate && e.date <= dateStr && e.endDate >= dateStr)
      );
      cells.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: true,
        isToday: dateStr === todayDateStr,
        isSunday: new Date(currentYear, currentMonth, dayNum).getDay() === 0,
        events: dayEvents,
        visitsCount: (attendanceRecords || []).filter((r) => r.date === dateStr).length,
      });
    }

    // Next month leading days to complete grid cells
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const nextM = currentMonth + 2 > 12 ? 1 : currentMonth + 2;
      const nextY = currentMonth + 2 > 12 ? currentYear + 1 : currentYear;
      const dateStr = `${nextY}-${pad(nextM)}-${pad(dayNum)}`;
      const dayEvents = (events || []).filter(
        (e) => e.date === dateStr || (e.endDate && e.date <= dateStr && e.endDate >= dateStr)
      );
      cells.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayDateStr,
        isSunday: new Date(nextY, nextM - 1, dayNum).getDay() === 0,
        events: dayEvents,
        visitsCount: (attendanceRecords || []).filter((r) => r.date === dateStr).length,
      });
    }

    return cells;
  }, [currentYear, currentMonth, events, attendanceRecords, todayDateStr]);

  // Filtered Events for Table & Agenda View
  const filteredEvents = useMemo(() => {
    let list = events || [];

    if (selectedYearFilter !== 'ALL') {
      list = list.filter((e) => e.date.startsWith(selectedYearFilter));
    }

    if (selectedTypeFilter !== 'ALL') {
      if (selectedTypeFilter === 'HOLIDAY_ONLY') {
        list = list.filter((e) => e.type === 'HOLIDAY' || !e.isLibraryOpen);
      } else if (selectedTypeFilter === 'WORKING_ONLY') {
        list = list.filter((e) => e.type === 'WORKING_DAY' || e.isLibraryOpen);
      } else {
        list = list.filter((e) => e.type === selectedTypeFilter);
      }
    }

    if (selectedCategoryFilter !== 'ALL') {
      list = list.filter((e) => e.category === selectedCategoryFilter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.date.includes(q) ||
          (e.description && e.description.toLowerCase().includes(q)) ||
          (e.declaredBy && e.declaredBy.toLowerCase().includes(q)) ||
          (e.notes && e.notes.toLowerCase().includes(q))
      );
    }

    return [...list].sort((a, b) => a.date.localeCompare(b.date));
  }, [events, selectedYearFilter, selectedTypeFilter, selectedCategoryFilter, searchTerm]);

  // Open Modal for Add
  const handleOpenAddModal = (defaultDate?: string) => {
    setSelectedDayDateStr(null);
    setEditingEventId(null);
    setEventForm({
      date: defaultDate || getLocalDateStr(),
      endDate: '',
      title: '',
      type: 'HOLIDAY',
      category: 'UNIVERSITY_DECLARED',
      isLibraryOpen: false,
      openTime: '08:00',
      closeTime: '22:00',
      customHoursText: '',
      description: '',
      declaredBy: isAdminOrStaff ? `${user?.name || 'Chief Admin Librarian'} (Library Desk)` : 'Office of the Registrar',
      affectedBranches: ['Central Library & All Reading Halls'],
      isRecurringAnnually: false,
      notes: '',
    });
    setShowEventModal(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (event: UniversityCalendarEvent) => {
    setSelectedDayDateStr(null);
    setEditingEventId(event.id);
    setEventForm({
      date: event.date,
      endDate: event.endDate || '',
      title: event.title,
      type: event.type,
      category: event.category,
      isLibraryOpen: event.isLibraryOpen,
      openTime: event.openTime || '08:00',
      closeTime: event.closeTime || '22:00',
      customHoursText: event.customHoursText || '',
      description: event.description || '',
      declaredBy: event.declaredBy || 'Office of the Registrar',
      affectedBranches: event.affectedBranches || ['Central Library & All Reading Halls'],
      isRecurringAnnually: Boolean(event.isRecurringAnnually),
      notes: event.notes || '',
    });
    setShowEventModal(true);
  };

  // Save Event (Add / Edit)
  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.date || !eventForm.title.trim()) {
      showToast('Please enter date and schedule title.', 'error');
      return;
    }

    if (editingEventId) {
      const res = libraryStore.updateCalendarEvent(
        editingEventId,
        {
          ...eventForm,
          title: eventForm.title.trim(),
        },
        user?.name || 'Chief Admin Librarian'
      );
      if (res.success) {
        showToast(res.message, 'success');
        setShowEventModal(false);
      } else {
        showToast(res.message, 'error');
      }
    } else {
      const res = libraryStore.addCalendarEvent(
        {
          ...eventForm,
          title: eventForm.title.trim(),
        },
        user?.name || 'Chief Admin Librarian'
      );
      if (res.success) {
        showToast(res.message, 'success');
        setShowEventModal(false);
      } else {
        showToast(res.message, 'error');
      }
    }
  };

  // Delete Event
  const handleDeleteEvent = (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete calendar schedule '${title}'?`)) {
      const res = libraryStore.deleteCalendarEvent(id, user?.name || 'Chief Admin Librarian');
      if (res.success) {
        showToast(res.message, 'info');
      } else {
        showToast(res.message, 'error');
      }
    }
  };

  // Quick Toggle Holiday vs Working Day for selected date
  const handleQuickToggleDay = (dateStr: string, currentIsHoliday: boolean) => {
    const res = libraryStore.quickToggleDayHoliday(
      dateStr,
      !currentIsHoliday,
      undefined,
      user?.name || 'Chief Admin Librarian'
    );
    if (res.success) {
      showToast(res.message, 'success');
    }
  };

  // Quick Declare Upcoming Sunday as Working Day
  const handleQuickDeclareSundayWorkingDay = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilSunday = (7 - dayOfWeek) % 7 || 7;
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + daysUntilSunday);
    const sundayDateStr = getLocalDateStr(nextSunday);

    const res = libraryStore.quickDeclareWorkingDay(
      sundayDateStr,
      `Sunday Mid-Semester Exam Reading Day (${nextSunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`,
      '09:00',
      '21:00',
      user?.name || 'Chief Admin Librarian'
    );

    if (res.success) {
      showToast(`Declared Sunday (${sundayDateStr}) as an active working day (09:00 AM – 09:00 PM).`, 'success');
    }
  };

  // Reset to Defaults
  const handleResetDefaults = () => {
    if (
      window.confirm(
        'Reset university calendar to standard default gazetted holidays and university academic schedules?'
      )
    ) {
      const res = libraryStore.resetCalendarToDefault(user?.name || 'Chief Admin Librarian');
      if (res.success) {
        showToast(res.message, 'success');
      }
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const res = libraryStore.exportCalendarReportCSV(filteredEvents);
    if (res.success) {
      showToast(`Calendar exported successfully as ${res.filename}`, 'success');
    }
  };

  // Helper Badge Renderers
  const renderTypeBadge = (type: CalendarEventType, isOpen: boolean) => {
    switch (type) {
      case 'HOLIDAY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            University Holiday (Closed)
          </span>
        );
      case 'WORKING_DAY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Declared Working Day (Open)
          </span>
        );
      case 'SPECIAL_HOURS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Special Operating Hours
          </span>
        );
      case 'EXAM_PERIOD':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            Exam Extended Study Desk
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Academic Event
          </span>
        );
    }
  };

  const renderCategoryBadge = (category: CalendarEventCategory) => {
    const map: Record<CalendarEventCategory, { bg: string; text: string; label: string }> = {
      GAZETTED_NATIONAL: { bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-700', label: 'Gazetted National' },
      UNIVERSITY_DECLARED: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', label: 'University Declared' },
      FESTIVAL: { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700', label: 'Cultural Festival' },
      EXAMINATION: { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700', label: 'Examination Schedule' },
      MAINTENANCE: { bg: 'bg-slate-100 border-slate-300', text: 'text-slate-700', label: 'System Maintenance' },
      SEMESTER_BREAK: { bg: 'bg-cyan-50 border-cyan-200', text: 'text-cyan-700', label: 'Semester Vacation' },
      SPECIAL_SCHEDULE: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: 'Special Schedule' },
    };
    const c = map[category] || map.UNIVERSITY_DECLARED;
    return (
      <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    );
  };

  // Selected Day Details Data for Drawer / Modal
  const selectedDayData = useMemo(() => {
    if (!selectedDayDateStr) return null;
    const dayEvents = (events || []).filter(
      (e) => e.date === selectedDayDateStr || (e.endDate && e.date <= selectedDayDateStr && e.endDate >= selectedDayDateStr)
    );
    const dayRecords = (attendanceRecords || []).filter((r) => r.date === selectedDayDateStr);
    const dateObj = new Date(`${selectedDayDateStr}T00:00:00`);
    const isSunday = dateObj.getDay() === 0;
    const opStatus = getLibraryOperatingStatus(dateObj, events);

    return {
      dateStr: selectedDayDateStr,
      dateFormatted: dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      isSunday,
      opStatus,
      events: dayEvents,
      visitsCount: dayRecords.length,
      records: dayRecords,
    };
  }, [selectedDayDateStr, events, attendanceRecords]);

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold transition-all transform animate-in fade-in slide-in-from-bottom-5 duration-300 border ${
            toast.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700 shadow-emerald-900/30'
              : toast.type === 'error'
              ? 'bg-rose-900 text-white border-rose-700 shadow-rose-900/30'
              : 'bg-slate-900 text-white border-slate-700 shadow-slate-900/30'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          ) : (
            <Info className="h-4 w-4 text-blue-400 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-white/60 hover:text-white cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Top Banner: Short, Straight, Compact Modern Layout */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-4 sm:p-5 text-white border border-indigo-900/50 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Left Side: Title & Status Badge */}
        <div className="space-y-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2.5">
            <h2 className="text-lg sm:text-xl font-black font-poppins text-white tracking-tight whitespace-nowrap">
              University Calendar & Holidays
            </h2>

            {todayStatus.isOpen ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <span>Today: OPEN ({todayStatus.calendarEvent ? todayStatus.calendarEvent.title : 'Standard Working Day'})</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40 backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                <span>Today: CLOSED ({todayStatus.holidayName || todayStatus.statusText.replace(/^CLOSED\s*\(?|\)?$/gi, '')})</span>
              </span>
            )}
          </div>

          <p className="text-xs text-slate-300">
            Manage holidays, working days & library hours.
          </p>
        </div>

        {/* Right Side: Straight Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isAdminOrStaff && (
            <>
              <button
                type="button"
                onClick={() => handleOpenAddModal()}
                className="h-9 px-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>Add Holiday / Day</span>
              </button>

              <button
                type="button"
                onClick={handleQuickDeclareSundayWorkingDay}
                title="Declare upcoming Sunday as an open working day for exams"
                className="h-9 px-3.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white font-extrabold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
              >
                <Sun className="h-4 w-4 shrink-0" />
                <span>Declare Sunday Open</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5 text-blue-400 shrink-0" />
            <span>Export CSV</span>
          </button>

          {isAdminOrStaff && (
            <button
              type="button"
              onClick={handleResetDefaults}
              title="Reset to standard 2026/2027 university holidays"
              className="h-9 w-9 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white border border-white/10 transition-all flex items-center justify-center cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5 shrink-0" />
            </button>
          )}
        </div>
      </div>

      {/* Telemetry Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Holidays */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex items-center gap-3.5 group">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <CalendarX2 className="h-6 w-6 text-rose-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Holidays in {currentYear}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-2xl font-black font-poppins text-slate-900">{stats.totalHolidays}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                Closed Days
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Overrides */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex items-center gap-3.5 group">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <CalendarCheck2 className="h-6 w-6 text-emerald-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Working Day Overrides</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-2xl font-black font-poppins text-slate-900">{stats.workingDayOverrides}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Special Days
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Exam Periods */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex items-center gap-3.5 group">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <GraduationCap className="h-6 w-6 text-purple-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Exam Extended Desks</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-2xl font-black font-poppins text-slate-900">{stats.examSpecialPeriods}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
                Active Periods
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Next Holiday */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex items-center gap-3.5 group">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <BellRing className="h-6 w-6 text-indigo-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Next Upcoming Holiday</p>
            {stats.nextUpcomingHoliday ? (
              <div className="mt-0.5">
                <p className="text-xs font-bold text-slate-900 truncate" title={stats.nextUpcomingHoliday.title}>
                  {stats.nextUpcomingHoliday.title}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-mono">
                    {new Date(`${stats.nextUpcomingHoliday.date}T00:00:00`).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  {(() => {
                    const daysDiff = Math.ceil(
                      (new Date(`${stats.nextUpcomingHoliday.date}T00:00:00`).getTime() -
                        new Date(`${todayDateStr}T00:00:00`).getTime()) /
                        (1000 * 3600 * 24)
                    );
                    if (daysDiff === 0)
                      return (
                        <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          Today
                        </span>
                      );
                    if (daysDiff > 0)
                      return (
                        <span className="text-[10px] font-extrabold text-indigo-600">
                          (in {daysDiff}d)
                        </span>
                      );
                    return null;
                  })()}
                </div>
              </div>
            ) : (
              <p className="text-xs font-semibold text-slate-400 mt-1">No upcoming holidays</p>
            )}
          </div>
        </div>
      </div>

      {/* View Switcher & Month Selector Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Month Navigation for Grid View */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Standalone Modern Today Button */}
          <button
            type="button"
            onClick={handleGoToToday}
            className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
            title="Jump to Current Month & Today's Date"
          >
            <CalendarIcon className="w-3.5 h-3.5 text-indigo-600" />
            <span>Today</span>
          </button>

          <div className="flex items-center gap-1.5">
            <select
              value={currentMonth}
              onChange={(e) => handleSelectMonth(parseInt(e.target.value, 10))}
              className="bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-900 font-black text-xs sm:text-sm rounded-xl px-3 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={m} value={idx}>
                  {m}
                </option>
              ))}
            </select>

            <select
              value={currentYear}
              onChange={(e) => handleSelectYear(parseInt(e.target.value, 10))}
              className="bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-900 font-black text-xs sm:text-sm rounded-xl px-2.5 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            >
              {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 rounded-xl p-1 flex items-center border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('MONTH')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'MONTH'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>Month Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('LIST')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'LIST'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListFilter className="h-3.5 w-3.5" />
              <span>Table Schedule ({events.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('AGENDA')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'AGENDA'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Timeline View</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: INTERACTIVE MONTH GRID */}
      {viewMode === 'MONTH' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center text-xs font-black text-slate-600 uppercase tracking-wider py-3">
            <div className="text-rose-600">Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div className="text-slate-700">Sat</div>
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
            {calendarGrid.map((cell, idx) => {
              const hasEvents = cell.events.length > 0;
              const hasWorkingOverride = cell.events.some((e) => e.type === 'WORKING_DAY');

              return (
                <div
                  key={`${cell.dateStr}-${idx}`}
                  onClick={() => setSelectedDayDateStr(cell.dateStr)}
                  className={`min-h-[110px] sm:min-h-[125px] p-2 sm:p-2.5 transition-all flex flex-col justify-between group cursor-pointer relative ${
                    cell.isCurrentMonth ? 'bg-white' : 'bg-slate-50/40 text-slate-400'
                  } ${cell.isToday ? 'ring-2 ring-inset ring-indigo-500 bg-indigo-50/20' : ''} ${
                    cell.isSunday && !hasWorkingOverride ? 'bg-rose-50/20' : ''
                  } hover:bg-indigo-50/30`}
                >
                  {/* Cell Top Bar */}
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs sm:text-sm font-black w-6 h-6 flex items-center justify-center rounded-full ${
                          cell.isToday
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : cell.isSunday
                            ? 'text-rose-600'
                            : 'text-slate-800'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>

                      {cell.isToday && (
                        <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-indigo-100 text-indigo-800">
                          Today
                        </span>
                      )}
                    </div>

                    {/* Quick Add Button on Hover (Admin only) */}
                    {isAdminOrStaff && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAddModal(cell.dateStr);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-600 transition-all cursor-pointer"
                        title={`Add Schedule for ${cell.dateStr}`}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Day Events Badges */}
                  <div className="mt-1.5 space-y-1 overflow-hidden flex-1">
                    {/* Default Sunday Closed Pill (if no override) */}
                    {cell.isSunday && !hasEvents && cell.isCurrentMonth && (
                      <div className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold truncate">
                        Sunday Closed
                      </div>
                    )}

                    {cell.events.map((ev) => {
                      const isClosed = ev.type === 'HOLIDAY' || !ev.isLibraryOpen;
                      const isSpecial = ev.type === 'SPECIAL_HOURS' || ev.type === 'EXAM_PERIOD';
                      const isWorking = ev.type === 'WORKING_DAY';

                      return (
                        <div
                          key={ev.id}
                          title={`${ev.title} (${ev.type}) - ${ev.customHoursText || (isClosed ? 'Closed' : 'Open')}`}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold truncate flex items-center gap-1 border ${
                            isClosed
                              ? 'bg-rose-100/90 text-rose-900 border-rose-300'
                              : isWorking
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : isSpecial
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-purple-100 text-purple-900 border-purple-300'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              isClosed
                                ? 'bg-rose-600'
                                : isWorking
                                ? 'bg-emerald-600'
                                : isSpecial
                                ? 'bg-amber-600'
                                : 'bg-purple-600'
                            }`}
                          />
                          <span className="truncate">{ev.title}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Cell Bottom Stats */}
                  {cell.visitsCount > 0 && (
                    <div className="mt-1 text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <span>{cell.visitsCount} visits</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Calendar Legend */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-slate-600">
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-bold text-slate-800">Legend:</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>University Holiday / Closed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Declared Working Day / Open</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Special Operating Hours</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span>Exam Extended Study Desk</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500">
              💡 Tip: Click any date on the calendar to view full details or configure working day overrides.
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: SEARCHABLE & FILTERABLE TABLE SCHEDULE */}
      {viewMode === 'LIST' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
          {/* Search & Filter Header */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search occasion, holiday or keyword..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div>
              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="ALL">All Schedule Types</option>
                <option value="HOLIDAY_ONLY">🔴 University Holidays (Closed)</option>
                <option value="WORKING_ONLY">🟢 Declared Working Days (Open)</option>
                <option value="SPECIAL_HOURS">🟡 Special Operating Hours</option>
                <option value="EXAM_PERIOD">🟣 Exam Extended Study Desk</option>
              </select>
            </div>

            <div>
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                <option value="GAZETTED_NATIONAL">Gazetted National</option>
                <option value="UNIVERSITY_DECLARED">University Declared</option>
                <option value="FESTIVAL">Cultural Festival</option>
                <option value="EXAMINATION">Examination Schedule</option>
                <option value="MAINTENANCE">System Maintenance</option>
                <option value="SPECIAL_SCHEDULE">Special Schedule</option>
              </select>
            </div>

            <div>
              <select
                value={selectedYearFilter}
                onChange={(e) => setSelectedYearFilter(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="ALL">All Years</option>
                <option value="2025">Year 2025</option>
                <option value="2026">Year 2026</option>
                <option value="2027">Year 2027</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Date / Period</th>
                  <th className="py-3.5 px-4">Occasion & Description</th>
                  <th className="py-3.5 px-4">Schedule Type</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Operating Hours</th>
                  <th className="py-3.5 px-4">Declared By</th>
                  {isAdminOrStaff && <th className="py-3.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={isAdminOrStaff ? 7 : 6} className="text-center py-12 text-slate-400 font-semibold">
                      No calendar events match the current filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {ev.date}
                        {ev.endDate && (
                          <span className="block text-[11px] text-slate-400 font-normal">to {ev.endDate}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 min-w-[220px]">
                        <p className="font-extrabold text-slate-900">{ev.title}</p>
                        {ev.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 leading-relaxed">
                            {ev.description}
                          </p>
                        )}
                        {ev.isRecurringAnnually && (
                          <span className="inline-block mt-1 px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-100">
                            🔁 Annual Recurring
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderTypeBadge(ev.type, ev.isLibraryOpen)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderCategoryBadge(ev.category)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-800">
                        {ev.customHoursText || (ev.isLibraryOpen ? '08:00 AM – 10:00 PM' : 'Closed (Full Day)')}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {ev.declaredBy || 'Administration'}
                      </td>
                      {isAdminOrStaff && (
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(ev)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Edit Schedule Details"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEvent(ev.id, ev.title)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete Event"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: TIMELINE / AGENDA VIEW */}
      {viewMode === 'AGENDA' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black font-poppins text-slate-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-600" />
              <span>Chronological Academic Calendar Timeline</span>
            </h3>
            <span className="text-xs font-bold text-slate-500">
              {filteredEvents.length} events scheduled
            </span>
          </div>

          <div className="space-y-4">
            {filteredEvents.map((ev) => {
              const isPast = ev.date < todayDateStr;
              const isToday = ev.date === todayDateStr;
              const isClosed = ev.type === 'HOLIDAY' || !ev.isLibraryOpen;

              return (
                <div
                  key={ev.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isToday
                      ? 'bg-indigo-50/50 border-indigo-300 ring-2 ring-indigo-500/20'
                      : isPast
                      ? 'bg-slate-50/50 border-slate-200 opacity-75'
                      : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold shrink-0 border ${
                        isClosed
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold">
                        {new Date(`${ev.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className="text-base font-black leading-none">
                        {new Date(`${ev.date}T00:00:00`).getDate()}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900">{ev.title}</span>
                        {renderTypeBadge(ev.type, ev.isLibraryOpen)}
                        {renderCategoryBadge(ev.category)}
                        {isToday && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white">
                            Today
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                        {ev.description || 'University academic calendar milestone.'}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                        <span className="flex items-center gap-1 font-semibold">
                          <Clock className="h-3 w-3 text-slate-400" />
                          Hours: {ev.customHoursText || (ev.isLibraryOpen ? '08:00 AM – 10:00 PM' : 'Closed')}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-slate-400" />
                          {(ev.affectedBranches || ['Central Library']).join(', ')}
                        </span>
                        <span>•</span>
                        <span>By: {ev.declaredBy || 'Administration'}</span>
                      </div>
                    </div>
                  </div>

                  {isAdminOrStaff && (
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(ev)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(ev.id, ev.title)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT UNIVERSITY HOLIDAY & WORKING DAY */}
      {showEventModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  <CalendarDays className="h-5 w-5 text-indigo-300" />
                </div>
                <div>
                  <h3 className="text-lg font-black font-poppins text-white">
                    {editingEventId ? 'Edit Calendar Schedule' : 'Add University Holiday or Working Day'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Configure official library open/closed status, operating hours, and administrative notices.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowEventModal(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEvent} className="p-6 space-y-4">
              {/* Preset Quick Chips (only when creating new) */}
              {!editingEventId && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                      Fast-Fill Suggestions
                    </label>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    {POPULAR_EVENT_PRESETS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setEventForm((prev) => ({
                            ...prev,
                            title: p.title,
                            type: p.type,
                            category: p.category,
                            isLibraryOpen: p.isLibraryOpen,
                            openTime: p.openTime || '08:00',
                            closeTime: p.closeTime || '22:00',
                            customHoursText: p.isLibraryOpen ? `${p.openTime || '08:00'} – ${p.closeTime || '22:00'}` : 'Closed (Full Day)',
                          }));
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-xs font-bold border border-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        + {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Title & Occasion */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Occasion / Holiday / Schedule Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Republic Day, Sunday Mid-Term Exam Reading Day, Semester Vacation"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                />
              </div>

              {/* Date & End Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Event Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={eventForm.date}
                    onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Multi-day End Date <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="date"
                    value={eventForm.endDate}
                    onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Schedule Type & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Schedule Operational Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={eventForm.type}
                    onChange={(e) => {
                      const t = e.target.value as CalendarEventType;
                      const isOpen = t === 'WORKING_DAY' || t === 'SPECIAL_HOURS' || t === 'EXAM_PERIOD';
                      setEventForm({
                        ...eventForm,
                        type: t,
                        isLibraryOpen: isOpen,
                        customHoursText: isOpen ? `${eventForm.openTime} – ${eventForm.closeTime}` : 'Closed (Full Day)',
                      });
                    }}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="HOLIDAY">🔴 Holiday (Library Closed)</option>
                    <option value="WORKING_DAY">🟢 Working Day (Library Open)</option>
                    <option value="SPECIAL_HOURS">🟡 Special Hours (Custom)</option>
                    <option value="EXAM_PERIOD">🟣 Exam Study Desk</option>
                    <option value="ACADEMIC_EVENT">🔵 University Milestone</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Academic Category
                  </label>
                  <select
                    value={eventForm.category}
                    onChange={(e) => setEventForm({ ...eventForm, category: e.target.value as CalendarEventCategory })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="GAZETTED_NATIONAL">Gazetted National</option>
                    <option value="UNIVERSITY_DECLARED">University Declared</option>
                    <option value="FESTIVAL">Religious / Cultural</option>
                    <option value="EXAMINATION">Examination Period</option>
                    <option value="MAINTENANCE">Maintenance Closure</option>
                    <option value="SEMESTER_BREAK">Semester Break</option>
                    <option value="SPECIAL_SCHEDULE">Special Schedule</option>
                  </select>
                </div>
              </div>

              {/* Operating Hours (if library is open) */}
              {eventForm.isLibraryOpen && (
                <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-900">
                    <Clock className="h-4 w-4 text-emerald-700" />
                    <span>Configured Operating Hours on this Day</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-800 mb-1">Open Time</label>
                      <input
                        type="time"
                        value={eventForm.openTime}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEventForm({
                            ...eventForm,
                            openTime: val,
                            customHoursText: `${val} – ${eventForm.closeTime}`,
                          });
                        }}
                        className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-emerald-800 mb-1">Close Time</label>
                      <input
                        type="time"
                        value={eventForm.closeTime}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEventForm({
                            ...eventForm,
                            closeTime: val,
                            customHoursText: `${eventForm.openTime} – ${val}`,
                          });
                        }}
                        className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Declared By & Annual Recurring */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-center">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Declared By / Authority</label>
                  <input
                    type="text"
                    value={eventForm.declaredBy}
                    onChange={(e) => setEventForm({ ...eventForm, declaredBy: e.target.value })}
                    placeholder="e.g. Office of the Registrar"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="sm:pt-5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={eventForm.isRecurringAnnually}
                      onChange={(e) => setEventForm({ ...eventForm, isRecurringAnnually: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800">Repeat Annually Every Year</span>
                  </label>
                  <p className="text-[10px] text-slate-500 pl-6 mt-0.5">
                    Applies automatically in future academic years.
                  </p>
                </div>
              </div>

              {/* Description & Administrative Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description / Administrative Notice
                </label>
                <textarea
                  rows={2}
                  placeholder="Official notification details visible to students and faculty..."
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none leading-relaxed"
                />
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer active:scale-95"
                >
                  {editingEventId ? 'Save Changes' : 'Save Schedule to Calendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DAY DETAILS DRAWER / OVERVIEW */}
      {selectedDayDateStr && selectedDayData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  <CalendarIcon className="h-5 w-5 text-indigo-300" />
                </div>
                <div>
                  <h4 className="text-base font-black font-poppins text-white">{selectedDayData.dateFormatted}</h4>
                  <p className="text-xs text-slate-300 mt-0.5">Date: {selectedDayData.dateStr}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayDateStr(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Operating Status Pill on this date */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Operating Status on this Day
                </p>
                <div className="flex items-center gap-2">
                  {selectedDayData.opStatus.isOpen ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                      Library OPEN
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                      <XCircle className="h-3.5 w-3.5 text-rose-600" />
                      Library CLOSED ({selectedDayData.opStatus.holidayName || (selectedDayData.isSunday ? 'Sunday' : 'Closed')})
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 pt-1 leading-relaxed">
                  {selectedDayData.opStatus.reason}
                </p>
              </div>

              {/* Events on this Day */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black uppercase text-slate-700 tracking-wider">
                    Scheduled University Events ({selectedDayData.events.length})
                  </p>
                  {isAdminOrStaff && (
                    <button
                      type="button"
                      onClick={() => {
                        handleOpenAddModal(selectedDayData.dateStr);
                      }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Schedule
                    </button>
                  )}
                </div>

                {selectedDayData.events.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-500 text-center">
                    {selectedDayData.isSunday
                      ? 'Standard closed Sunday (No special overrides configured).'
                      : 'Standard working day with regular operating hours (8:00 AM – 10:00 PM).'}
                  </div>
                ) : (
                  selectedDayData.events.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-extrabold text-sm text-slate-900">{ev.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {renderTypeBadge(ev.type, ev.isLibraryOpen)}
                            {renderCategoryBadge(ev.category)}
                          </div>
                        </div>
                        {isAdminOrStaff && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                handleOpenEditModal(ev);
                              }}
                              className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleDeleteEvent(ev.id, ev.title);
                              }}
                              className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {ev.description && (
                        <p className="text-xs text-slate-600 leading-relaxed">{ev.description}</p>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Attendance on this Date */}
              {selectedDayData.visitsCount > 0 && (
                <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold">
                    <CheckCircle className="h-4 w-4 text-indigo-600" />
                    <span>{selectedDayData.visitsCount} visitors checked in on this date</span>
                  </div>
                </div>
              )}

              {/* Quick Action Buttons for Admins */}
              {isAdminOrStaff && (
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleQuickToggleDay(selectedDayData.dateStr, selectedDayData.opStatus.isHoliday || !selectedDayData.opStatus.isOpen);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer text-center"
                  >
                    {selectedDayData.opStatus.isOpen
                      ? '🔴 Mark as Holiday (Close)'
                      : '🟢 Declare as Working Day (Open)'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedDayDateStr(null)}
                    className="py-2 px-4 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
