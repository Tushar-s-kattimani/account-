import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  BookOpen, 
  Users, 
  BarChart3, 
  Database,
  Sun, 
  Moon, 
  Search, 
  Download, 
  Upload, 
  Trash2, 
  Printer, 
  Check, 
  X,
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  Tag, 
  FileText,
  RefreshCw,
  Info,
  ChevronRight
} from 'lucide-react';

// Interfaces
interface Transaction {
  id: string;
  date: string;
  formNumber: string;
  type: 'Credit' | 'Debit';
  amount: number;
  reason: string;
  person: string;
  category: 'Salary' | 'Expense' | 'Material Purchase' | 'Income' | 'Other';
  notes: string;
  createdAt: string;
}

interface Note {
  id: string;
  date: string;
  title: string;
  content: string;
  createdAt: string;
}



// Heuristic name parsing helpers for description field
const extractWorkersFromReason = (reason: string): string[] => {
  // Try matching patterns to extract who was paid
  const patterns = [
    /salary (?:paid )?to\s+([^,.\n;]+)/i,
    /wages (?:paid )?to\s+([^,.\n;]+)/i,
    /payment (?:paid )?to\s+([^,.\n;]+)/i,
    /salary\s+for\s+([^,.\n;]+)/i,
    /wages\s+for\s+([^,.\n;]+)/i,
    /salary\s+([^,.\n;]+)/i,
    /wages\s+([^,.\n;]+)/i,
    /([^,.\n;]+)\s+(?:salary|wages|wage)/i
  ];

  let namesPart = "";
  for (const pattern of patterns) {
    const match = reason.match(pattern);
    if (match && match[1]) {
      namesPart = match[1];
      break;
    }
  }

  if (!namesPart) {
    // Fallback: Filter out common keywords
    const words = reason.split(/\s+/).filter(w => {
      const wl = w.toLowerCase();
      return !['salary', 'wages', 'wage', 'paid', 'to', 'for', 'worker', 'payment', 'rs', 'amount', 'rupees'].includes(wl);
    });
    if (words.length > 0) {
      namesPart = words.join(' ');
    }
  }

  if (!namesPart) return [];

  // Strip leading prepositions
  let cleanNamesPart = namesPart.replace(/^\s*\b(of|to|for|paid to|payment to)\b\s*/i, '');
  
  // Remove trailing explanations starting with for, on, at, etc.
  const splitByTrail = cleanNamesPart.split(/\s+\b(for|on|at|due|regarding|monthly|weekly|daily|rs|in|of)\b/i);
  cleanNamesPart = splitByTrail[0];

  // Split by comma, "and", "&"
  const individualNames = cleanNamesPart
    .split(/,|\band\b|&/i)
    .map(n => n.trim())
    .filter(n => {
      const nl = n.toLowerCase();
      return n.length > 1 && !['salary', 'wages', 'wage', 'paid', 'to', 'for', 'worker', 'payment', 'rs', 'amount', 'rupees'].includes(nl);
    });

  return individualNames;
};

const extractPersonFromReason = (reason: string, category: string): string => {
  const lower = reason.toLowerCase();
  
  if (category === 'Salary' || lower.includes('salary') || lower.includes('wages') || lower.includes('worker payment')) {
    const workers = extractWorkersFromReason(reason);
    return workers.length > 0 ? workers.join(', ') : 'General Staff';
  }

  // For other categories, try to find "from [Name]" or "to [Name]"
  const fromMatch = reason.match(/\bfrom\s+([^,.\n;]+)/i);
  if (fromMatch && fromMatch[1]) {
    return fromMatch[1].replace(/^\s*\b(the|a|an)\b\s*/i, '').trim();
  }

  const toMatch = reason.match(/\bto\s+([^,.\n;]+)/i);
  if (toMatch && toMatch[1]) {
    const cleaned = toMatch[1].replace(/^\s*\b(the|a|an)\b\s*/i, '').trim();
    if (cleaned.length > 0 && !cleaned.toLowerCase().includes('buy') && !cleaned.toLowerCase().includes('purchase')) {
      return cleaned;
    }
  }

  // Fallback default
  return '—';
};

// Initial Demo Data
const demoTransactions: Transaction[] = [
  {
    id: "tx-1",
    date: "2026-05-24", // Today in system time
    formNumber: "Form 1",
    type: "Credit",
    amount: 15000,
    reason: "Sold organic potatoes to fresh market",
    person: "Green Grocer Ltd",
    category: "Income",
    notes: "Payment received in cash, full settlement",
    createdAt: new Date("2026-05-24T10:30:00Z").toISOString()
  },
  {
    id: "tx-2",
    date: "2026-05-24", // Today
    formNumber: "Salary",
    type: "Debit",
    amount: 5000,
    reason: "Salary paid to Ravi for weeding",
    person: "Ravi Kumar",
    category: "Salary",
    notes: "Weekly wages paid online",
    createdAt: new Date("2026-05-24T12:00:00Z").toISOString()
  },
  {
    id: "tx-3",
    date: "2026-05-23",
    formNumber: "Form 1",
    type: "Debit",
    amount: 3200,
    reason: "Purchased NPK fertilizer bags",
    person: "Agri-Solutions Ltd",
    category: "Material Purchase",
    notes: "Urgent purchase for corn field",
    createdAt: new Date("2026-05-23T09:15:00Z").toISOString()
  },
  {
    id: "tx-4",
    date: "2026-05-22",
    formNumber: "Form 3",
    type: "Credit",
    amount: 28000,
    reason: "Milk supply payment for first half of May",
    person: "Amul Dairy Cooperative",
    category: "Income",
    notes: "Bank transfer received",
    createdAt: new Date("2026-05-22T14:45:00Z").toISOString()
  },
  {
    id: "tx-5",
    date: "2026-05-22",
    formNumber: "Form 3",
    type: "Debit",
    amount: 4500,
    reason: "Cattle feed and feed supplements purchase",
    person: "Karan Feed Stores",
    category: "Material Purchase",
    notes: "Delivered to barn direct",
    createdAt: new Date("2026-05-22T16:00:00Z").toISOString()
  },
  {
    id: "tx-6",
    date: "2026-05-21",
    formNumber: "Form 4",
    type: "Debit",
    amount: 8000,
    reason: "Tractor diesel fuel fill-up",
    person: "HP Fuel Station",
    category: "Expense",
    notes: "Tractor hours: 412 hrs",
    createdAt: new Date("2026-05-21T11:20:00Z").toISOString()
  },
  {
    id: "tx-7",
    date: "2026-05-21",
    formNumber: "Salary",
    type: "Debit",
    amount: 6000,
    reason: "Wages paid to worker Suresh",
    person: "Suresh Patil",
    category: "Salary",
    notes: "Paid in cash",
    createdAt: new Date("2026-05-21T17:30:00Z").toISOString()
  },
  {
    id: "tx-8",
    date: "2026-05-20",
    formNumber: "Form 1",
    type: "Credit",
    amount: 12000,
    reason: "Sold grain stock surplus",
    person: "Vikas Grain Merchant",
    category: "Income",
    notes: "Bags picked up from farm depot",
    createdAt: new Date("2026-05-20T08:50:00Z").toISOString()
  }
];

export default function App() {
  // --- Persistent Storage State ---
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('farm2_transactions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing transactions, loading demo", e);
      }
    }
    return demoTransactions;
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('farm2_theme');
    return saved ? saved === 'dark' : true; // Default dark
  });

  const [formNames, setFormNames] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('farm2_form_names');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing form names", e);
      }
    }
    return {
      'Form 1': 'Form 1',
      'Form 2': 'Form 2',
      'Form 3': 'Form 3',
      'Form 4': 'Form 4',
      'Salary': 'Salary Account',
      'Shivakumar': 'Shivakumar Account'
    };
  });

  const [showRenameModal, setShowRenameModal] = useState<boolean>(false);
  const [tempFormNames, setTempFormNames] = useState<Record<string, string>>(() => ({
    'Form 1': 'Form 1',
    'Form 2': 'Form 2',
    'Form 3': 'Form 3',
    'Form 4': 'Form 4',
    'Salary': 'Salary Account',
    'Shivakumar': 'Shivakumar Account',
    ...JSON.parse(localStorage.getItem('farm2_form_names') || '{}')
  }));

  useEffect(() => {
    setTempFormNames(formNames);
  }, [formNames]);

  // --- Active Tab State ---
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [activeFormTab, setActiveFormTab] = useState<string>('Show All');

  // --- Search & Filters State ---
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterType, setFilterType] = useState<string>('All');

  // --- Single Entry Form State ---
  const todayStr = "2026-05-24"; // Using the system local time format matching state
  const [formData, setFormData] = useState({
    date: todayStr,
    formNumber: 'Form 1',
    type: 'Debit' as 'Credit' | 'Debit',
    amount: '',
    reason: '',
    category: 'Other' as Transaction['category'],
    notes: ''
  });

  // Synchronize form selection with the active accounts page tab
  useEffect(() => {
    if (activeFormTab !== 'Show All') {
      setFormData(prev => ({ ...prev, formNumber: activeFormTab }));
    }
  }, [activeFormTab]);

  // --- UI Toast & Popups ---
  const [toasts, setToasts] = useState<{id: string, title: string, message: string, type: 'success' | 'error' | 'info'}[]>([]);
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'synced'>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<string>("Just now");
  const [showClearModal, setShowClearModal] = useState<boolean>(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // --- Reports Config State ---
  const [reportType, setReportType] = useState<'daily' | 'monthly' | 'form-wise'>('daily');
  const [reportDate, setReportDate] = useState<string>(todayStr);
  const [reportMonth, setReportMonth] = useState<string>("2026-05");
  const [reportForm, setReportForm] = useState<string>("Show All");

  // --- Attendance States ---
  const [attendanceLaborers, setAttendanceLaborers] = useState<string[]>(() => {
    const saved = localStorage.getItem('farm2_attendance_laborers');
    return saved ? JSON.parse(saved) : ['Ravi Kumar', 'Suresh Patil'];
  });

  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, Record<string, 'Present' | 'Absent' | 'Half Day' | 'None'>>>(() => {
    const saved = localStorage.getItem('farm2_attendance_records');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing attendance records", e);
      }
    }
    return {};
  });

  const [attendanceMonth, setAttendanceMonth] = useState<string>("2026-05");
  const [attendanceDate, setAttendanceDate] = useState<string>(todayStr);
  const [markStatus, setMarkStatus] = useState<Record<string, 'Present' | 'Absent' | 'Half Day' | 'None'>>({});
  const [isRenamingLaborers, setIsRenamingLaborers] = useState<boolean>(false);
  const [tempLaborers, setTempLaborers] = useState<string[]>(['', '']);

  useEffect(() => {
    localStorage.setItem('farm2_attendance_laborers', JSON.stringify(attendanceLaborers));
  }, [attendanceLaborers]);

  useEffect(() => {
    localStorage.setItem('farm2_attendance_records', JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  useEffect(() => {
    const recordsForDate = attendanceRecords[attendanceDate] || {};
    const initial: Record<string, 'Present' | 'Absent' | 'Half Day' | 'None'> = {};
    attendanceLaborers.forEach(lab => {
      initial[lab] = recordsForDate[lab] || 'None';
    });
    setMarkStatus(initial);
  }, [attendanceDate, attendanceRecords, attendanceLaborers]);

  // --- Daily Notes State ---
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('farm2_notes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing notes, loading empty list", e);
      }
    }
    return [];
  });

  const [noteFormData, setNoteFormData] = useState({
    date: todayStr,
    title: '',
    content: ''
  });
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteSearchQuery, setNoteSearchQuery] = useState('');
  const [noteDateFilter, setNoteDateFilter] = useState('');

  useEffect(() => {
    localStorage.setItem('farm2_notes', JSON.stringify(notes));
  }, [notes]);

  // Save Note (Add or Update)
  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteFormData.title.trim()) {
      showToast("Missing Field", "Please enter a title for the note.", "error");
      return;
    }
    if (!noteFormData.content.trim()) {
      showToast("Missing Field", "Please enter some content for the note.", "error");
      return;
    }

    if (editingNote) {
      setNotes(prev => prev.map(n => n.id === editingNote.id ? {
        ...n,
        date: noteFormData.date,
        title: noteFormData.title.trim(),
        content: noteFormData.content.trim()
      } : n));
      showToast("Note Updated", "The note has been successfully modified.", "success");
      setEditingNote(null);
    } else {
      const newNote: Note = {
        id: 'note-' + Date.now(),
        date: noteFormData.date,
        title: noteFormData.title.trim(),
        content: noteFormData.content.trim(),
        createdAt: new Date().toISOString()
      };
      setNotes(prev => [newNote, ...prev]);
      showToast("Note Saved", "Daily note recorded successfully.", "success");
    }

    setNoteFormData({
      date: todayStr,
      title: '',
      content: ''
    });

    triggerCloudSync();
  };

  // Delete Note
  const handleDeleteNote = (id: string) => {
    if (confirm("Are you sure you want to delete this note?")) {
      setNotes(prev => prev.filter(n => n.id !== id));
      showToast("Note Deleted", "The note has been removed.", "success");
      triggerCloudSync();
    }
  };

  // Start Editing Note
  const handleEditNoteStart = (note: Note) => {
    setEditingNote(note);
    setNoteFormData({
      date: note.date,
      title: note.title,
      content: note.content
    });
  };

  // Cancel Editing Note
  const handleCancelEditNote = () => {
    setEditingNote(null);
    setNoteFormData({
      date: todayStr,
      title: '',
      content: ''
    });
  };

  // Filter Notes
  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      const matchesSearch = noteSearchQuery === '' ||
        n.title.toLowerCase().includes(noteSearchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(noteSearchQuery.toLowerCase());
      const matchesDate = noteDateFilter === '' || n.date === noteDateFilter;
      return matchesSearch && matchesDate;
    }).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [notes, noteSearchQuery, noteDateFilter]);

  // Attendance Calculations
  const datesInSelectedMonth = useMemo(() => {
    const [year, month] = attendanceMonth.split('-').map(Number);
    const numDays = new Date(year, month, 0).getDate();
    const list: string[] = [];
    for (let day = 1; day <= numDays; day++) {
      const dStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      list.push(dStr);
    }
    return list.reverse();
  }, [attendanceMonth]);

  const markedDatesInMonth = useMemo(() => {
    return datesInSelectedMonth.filter(date => {
      const dayRecord = attendanceRecords[date];
      if (!dayRecord) return false;
      return Object.values(dayRecord).some(status => status !== 'None');
    });
  }, [datesInSelectedMonth, attendanceRecords]);

  const monthlyStats = useMemo(() => {
    const stats: Record<string, { present: number; halfDay: number; absent: number; totalDays: number }> = {};
    attendanceLaborers.forEach(lab => {
      stats[lab] = { present: 0, halfDay: 0, absent: 0, totalDays: 0 };
    });

    datesInSelectedMonth.forEach(date => {
      const dayRecord = attendanceRecords[date];
      if (dayRecord) {
        attendanceLaborers.forEach(lab => {
          const status = dayRecord[lab];
          if (status === 'Present') {
            stats[lab].present += 1;
            stats[lab].totalDays += 1;
          } else if (status === 'Half Day') {
            stats[lab].halfDay += 1;
            stats[lab].totalDays += 0.5;
          } else if (status === 'Absent') {
            stats[lab].absent += 1;
          }
        });
      }
    });

    return stats;
  }, [datesInSelectedMonth, attendanceRecords, attendanceLaborers]);

  const datesInSelectedWeek = useMemo(() => {
    const list: string[] = [];
    const today = new Date("2026-05-24");
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      list.push(d.toISOString().split('T')[0]);
    }
    return list;
  }, []);

  const weeklyStats = useMemo(() => {
    const stats: Record<string, { present: number; halfDay: number; absent: number; totalDays: number }> = {};
    attendanceLaborers.forEach(lab => {
      stats[lab] = { present: 0, halfDay: 0, absent: 0, totalDays: 0 };
    });

    datesInSelectedWeek.forEach(date => {
      const dayRecord = attendanceRecords[date];
      if (dayRecord) {
        attendanceLaborers.forEach(lab => {
          const status = dayRecord[lab];
          if (status === 'Present') {
            stats[lab].present += 1;
            stats[lab].totalDays += 1;
          } else if (status === 'Half Day') {
            stats[lab].halfDay += 1;
            stats[lab].totalDays += 0.5;
          } else if (status === 'Absent') {
            stats[lab].absent += 1;
          }
        });
      }
    });

    return stats;
  }, [datesInSelectedWeek, attendanceRecords, attendanceLaborers]);

  const handleSaveAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    setAttendanceRecords(prev => ({
      ...prev,
      [attendanceDate]: {
        ...prev[attendanceDate],
        ...markStatus
      }
    }));
    showToast("Attendance Recorded", `Marked attendance for ${attendanceDate} successfully.`, "success");
    triggerCloudSync();
  };

  const handleSaveLaborerNames = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempLaborers[0].trim() || !tempLaborers[1].trim()) {
      showToast("Error", "Laborer names cannot be empty.", "error");
      return;
    }
    const oldLab1 = attendanceLaborers[0];
    const oldLab2 = attendanceLaborers[1];
    const newLab1 = tempLaborers[0].trim();
    const newLab2 = tempLaborers[1].trim();

    setAttendanceRecords(prev => {
      const updated: typeof attendanceRecords = {};
      Object.keys(prev).forEach(date => {
        const dayRecord = prev[date];
        updated[date] = {};
        if (dayRecord[oldLab1]) updated[date][newLab1] = dayRecord[oldLab1];
        if (dayRecord[oldLab2]) updated[date][newLab2] = dayRecord[oldLab2];
      });
      return updated;
    });

    setAttendanceLaborers([newLab1, newLab2]);
    setIsRenamingLaborers(false);
    showToast("Laborer Names Updated", "Worker records updated successfully.", "success");
  };

  // Save to LocalStorage on modifications
  useEffect(() => {
    localStorage.setItem('farm2_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('farm2_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Toast Helper
  const showToast = (title: string, message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Run a mock Cloud Sync effect when transaction count changes
  const triggerCloudSync = () => {
    setSyncState('syncing');
    setTimeout(() => {
      setSyncState('synced');
      const now = new Date();
      setLastSyncTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      showToast("Cloud Synced", "All records successfully backed up to cloud database.", "info");
    }, 1200);
  };

  // Auto detect category / type changes when reason is entered
  const handleReasonChange = (val: string) => {
    let category = formData.category;
    const lowerVal = val.toLowerCase();
    
    // Auto-detect Salary category
    if (lowerVal.includes('salary') || lowerVal.includes('wages') || lowerVal.includes('worker payment') || lowerVal.includes('payment to')) {
      category = 'Salary';
    } 
    // Auto-detect Material Purchase
    else if (lowerVal.includes('fertilizer') || lowerVal.includes('seed') || lowerVal.includes('pesticide') || lowerVal.includes('feed') || lowerVal.includes('cement') || lowerVal.includes('purchase')) {
      category = 'Material Purchase';
    }
    // Auto-detect Income
    else if (lowerVal.includes('sold') || lowerVal.includes('received from') || lowerVal.includes('sale') || lowerVal.includes('milk payment')) {
      category = 'Income';
    }

    setFormData(prev => {
      const nextCategory = category;
      let nextFormNumber = prev.formNumber;
      
      if (nextCategory === 'Salary') {
        nextFormNumber = 'Salary';
      } else if (prev.formNumber === 'Salary') {
        nextFormNumber = 'Form 1';
      }
      
      if (lowerVal.includes('shivakumar') || lowerVal.includes('shiva')) {
        nextFormNumber = 'Shivakumar';
      } else if (prev.formNumber === 'Shivakumar') {
        nextFormNumber = 'Form 1';
      }

      return {
        ...prev,
        reason: val,
        category: nextCategory,
        formNumber: nextFormNumber
      };
    });
  };

  // Handle new transaction submission
  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      showToast("Invalid Amount", "Please enter a valid positive number for amount.", "error");
      return;
    }
    if (!formData.reason.trim()) {
      showToast("Missing Field", "Please enter a description or reason for this entry.", "error");
      return;
    }

    const extractedPerson = extractPersonFromReason(formData.reason, formData.category);

    const newTx: Transaction = {
      id: 'tx-' + Date.now(),
      date: formData.date,
      formNumber: formData.formNumber,
      type: formData.type,
      amount: Number(formData.amount),
      reason: formData.reason.trim(),
      person: extractedPerson,
      category: formData.category,
      notes: formData.notes.trim(),
      createdAt: new Date().toISOString()
    };

    setTransactions(prev => [newTx, ...prev]);
    showToast(
      "Transaction Saved", 
      `Successfully recorded ₹${newTx.amount} in ${newTx.formNumber} (${newTx.category})`, 
      "success"
    );

    // Reset Form (maintain current Date and Form selection for faster repetitive entry)
    setFormData(prev => ({
      ...prev,
      amount: '',
      reason: '',
      notes: ''
    }));

    triggerCloudSync();
  };

  // Handle editing transaction
  const handleUpdateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;

    if (!editingTransaction.amount || isNaN(Number(editingTransaction.amount)) || Number(editingTransaction.amount) <= 0) {
      showToast("Invalid Amount", "Please enter a valid positive number for amount.", "error");
      return;
    }
    if (!editingTransaction.reason.trim()) {
      showToast("Missing Field", "Please enter a description or reason.", "error");
      return;
    }

    const extractedPerson = extractPersonFromReason(editingTransaction.reason, editingTransaction.category);

    setTransactions(prev => prev.map(t => t.id === editingTransaction.id ? {
      ...editingTransaction,
      person: extractedPerson,
      amount: Number(editingTransaction.amount)
    } : t));

    showToast("Transaction Updated", "The record has been updated successfully.", "success");
    setEditingTransaction(null);
    triggerCloudSync();
  };

  // Delete transaction
  const handleDeleteTransaction = (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;
    
    if (confirm(`Are you sure you want to delete the entry for ₹${tx.amount} (${tx.reason})?`)) {
      setTransactions(prev => prev.filter(t => t.id !== id));
      showToast("Transaction Deleted", "The record has been removed.", "success");
      triggerCloudSync();
    }
  };

  // Clean all data
  const handleClearAllData = () => {
    setTransactions([]);
    localStorage.removeItem('farm2_transactions');
    setShowClearModal(false);
    showToast("Database Cleared", "All account records have been permanently deleted.", "error");
    triggerCloudSync();
  };



  // Save Custom Account Names
  const handleSaveFormNames = (e: React.FormEvent) => {
    e.preventDefault();
    setFormNames(tempFormNames);
    localStorage.setItem('farm2_form_names', JSON.stringify(tempFormNames));
    showToast("Account Names Updated", "All form and account labels have been customized.", "success");
    setShowRenameModal(false);
  };

  // Backup data to JSON file
  const handleExportBackup = () => {
    const dataStr = JSON.stringify(transactions, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AccountBook_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Backup Created", "Database downloaded successfully as a JSON file.", "success");
  };

  // Import data from JSON file
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          // Rudimentary validation
          const isValid = parsed.every(t => t.id && t.date && t.formNumber && t.amount && t.type);
          if (isValid) {
            setTransactions(parsed);
            showToast("Backup Restored", `Successfully imported ${parsed.length} transactions.`, "success");
            triggerCloudSync();
          } else {
            showToast("Invalid Backup", "The upload file has incorrect transaction fields.", "error");
          }
        } else {
          showToast("Invalid Backup", "Format must be an array of transactions.", "error");
        }
      } catch (err) {
        showToast("Error Reading File", "Failed to parse backup JSON file.", "error");
      }
    };
    reader.readAsText(file);
    // clear input
    e.target.value = '';
  };

  // --- Dynamic Filtering Calculations ---
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Search Box (Reason, Person, Amount, Notes, FormNumber)
      const matchesSearch = searchQuery === '' || 
        t.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.person.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.formNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.amount.toString().includes(searchQuery) ||
        (t.notes && t.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      // Dropdown Filters
      const matchesCategory = filterCategory === 'All' || t.category === filterCategory;
      const matchesType = filterType === 'All' || t.type === filterType;

      return matchesSearch && matchesCategory && matchesType;
    });
  }, [transactions, searchQuery, filterCategory, filterType]);

  // --- Financial Summaries Today ---
  const dashboardStats = useMemo(() => {
    let creditToday = 0;
    let debitToday = 0;
    let totalCredit = 0;
    let totalDebit = 0;

    transactions.forEach(t => {
      if (t.type === 'Credit') {
        totalCredit += t.amount;
        if (t.date === todayStr) creditToday += t.amount;
      } else {
        totalDebit += t.amount;
        if (t.date === todayStr) debitToday += t.amount;
      }
    });

    return {
      receivedToday: creditToday,
      paidToday: debitToday,
      balanceToday: creditToday - debitToday,
      netBalance: totalCredit - totalDebit,
      totalCredit,
      totalDebit
    };
  }, [transactions]);

  // --- Form-wise balances summary ---
  const formBalances = useMemo(() => {
    const forms = ['Show All', 'Form 1', 'Form 2', 'Form 3', 'Form 4', 'Salary', 'Shivakumar'];
    const summary: Record<string, { credit: number; debit: number; balance: number; creditToday: number; debitToday: number; balanceToday: number }> = {};
    
    forms.forEach(f => {
      summary[f] = { credit: 0, debit: 0, balance: 0, creditToday: 0, debitToday: 0, balanceToday: 0 };
    });

    transactions.forEach(t => {
      // Accumulate into specific form
      if (summary[t.formNumber]) {
        if (t.type === 'Credit') {
          summary[t.formNumber].credit += t.amount;
          if (t.date === todayStr) {
            summary[t.formNumber].creditToday += t.amount;
          }
        } else {
          summary[t.formNumber].debit += t.amount;
          if (t.date === todayStr) {
            summary[t.formNumber].debitToday += t.amount;
          }
        }
      }

      // Accumulate into 'Show All'
      if (t.type === 'Credit') {
        summary['Show All'].credit += t.amount;
        if (t.date === todayStr) {
          summary['Show All'].creditToday += t.amount;
        }
      } else {
        summary['Show All'].debit += t.amount;
        if (t.date === todayStr) {
          summary['Show All'].debitToday += t.amount;
        }
      }
    });

    forms.forEach(f => {
      summary[f].balance = summary[f].credit - summary[f].debit;
      summary[f].balanceToday = summary[f].creditToday - summary[f].debitToday;
    });

    return summary;
  }, [transactions]);



  // --- CSV Export Helper ---
  const handleExportCSV = (data: Transaction[], filename: string) => {
    const headers = ['Date', 'Form', 'Type', 'Amount', 'Reason', 'Person', 'Category', 'Notes'];
    const rows = data.map(t => [
      t.date,
      t.formNumber,
      t.type,
      t.amount,
      `"${t.reason.replace(/"/g, '""')}"`,
      `"${t.person.replace(/"/g, '""')}"`,
      t.category,
      `"${(t.notes || '').replace(/"/g, '""')}"`
    ]);
    
    // Add BOM for proper UTF-8 Excel support (preserving ₹ symbol if typed)
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Excel Exported", `Saved ${data.length} records to CSV format.`, "success");
  };

  // Print Report Handler
  const handlePrint = () => {
    window.print();
  };

  // --- Report View Logic ---
  const reportTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (reportType === 'daily') {
        return t.date === reportDate;
      } else if (reportType === 'monthly') {
        return t.date.substring(0, 7) === reportMonth;
      } else if (reportType === 'form-wise') {
        return reportForm === 'Show All' || t.formNumber === reportForm;
      }
      return true;
    });
  }, [transactions, reportType, reportDate, reportMonth, reportForm]);

  const reportStats = useMemo(() => {
    let credit = 0;
    let debit = 0;
    reportTransactions.forEach(t => {
      if (t.type === 'Credit') credit += t.amount;
      else debit += t.amount;
    });
    return {
      credit,
      debit,
      balance: credit - debit
    };
  }, [reportTransactions]);

  // --- SVG Chart Coordinates Generation ---
  // Generate 7-day flow chart coordinates
  const chartCoordinates = useMemo(() => {
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      // Mock/adjust to match our 2026-05 dates
      // System local date is 2026-05-24
      const targetDate = new Date("2026-05-24");
      targetDate.setDate(targetDate.getDate() - i);
      dates.push(targetDate.toISOString().split('T')[0]);
    }

    const data = dates.map(d => {
      let credit = 0;
      let debit = 0;
      transactions.forEach(t => {
        if (t.date === d) {
          if (t.type === 'Credit') credit += t.amount;
          else debit += t.amount;
        }
      });
      return { date: d, credit, debit };
    });

    const maxAmt = Math.max(...data.map(d => Math.max(d.credit, d.debit)), 10000);
    
    // Map to SVG coordinates (Width: 600, Height: 200, padding left/right: 40, top/bottom: 20)
    const pointsCredit = data.map((d, index) => {
      const x = 40 + (index * (520 / 6));
      // Invert Y because SVG coordinates starts from top-left (0,0)
      const y = 180 - (d.credit / maxAmt * 140); 
      return { x, y, val: d.credit, date: d.date };
    });

    const pointsDebit = data.map((d, index) => {
      const x = 40 + (index * (520 / 6));
      const y = 180 - (d.debit / maxAmt * 140);
      return { x, y, val: d.debit, date: d.date };
    });

    return {
      pointsCredit,
      pointsDebit,
      maxAmt,
      dates: dates.map(d => d.substring(8, 10) + '/' + d.substring(5, 7)) // Short date formats
    };
  }, [transactions]);

  return (
    <div className={`app-container ${darkMode ? 'dark-theme' : 'light-theme'}`}>
      
      {/* --- Mobile Header Bar --- */}
      <header className="mobile-header mobile-only">
        <div className="mobile-header-left">
          <img 
            src="/DSC_2899.JPG" 
            alt="Logo" 
            className="mobile-header-logo" 
          />
          <span className="mobile-header-title">Shivakumar's Farm</span>
        </div>
        <button 
          className="mobile-theme-toggle"
          onClick={() => setDarkMode(!darkMode)}
          title="Toggle dark/light theme"
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>

      {/* --- Sidebar Navigation --- */}
      <aside className="sidebar desktop-only">
        <div>
          <div className="logo-container" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '8px' }}>
            <img 
              src="/DSC_2899.JPG" 
              alt="Logo" 
              className="logo-icon" 
              style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', background: 'transparent' }} 
            />
            <div>
              <h1 className="logo-text" style={{ fontSize: '22px' }}>Shivakumar's</h1>
              <p className="logo-subtitle" style={{ fontSize: '12px', marginTop: '2px' }}>Farm</p>
            </div>
          </div>

          <nav className="nav-menu">
            <div className="nav-section-title">General</div>
            
            <button 
              id="nav-dashboard"
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </button>

            <button 
              id="nav-new-entry"
              className={`nav-item ${activeTab === 'new-entry' ? 'active' : ''}`}
              onClick={() => setActiveTab('new-entry')}
            >
              <PlusCircle size={18} />
              <span>New Entry</span>
            </button>

            <div className="nav-section-title">Accounts</div>

            <button 
              id="nav-form-pages"
              className={`nav-item ${activeTab === 'form-pages' ? 'active' : ''}`}
              onClick={() => setActiveTab('form-pages')}
            >
              <BookOpen size={18} />
              <span>Form / Accounts</span>
            </button>

            <button 
              id="nav-notes"
              className={`nav-item ${activeTab === 'notes' ? 'active' : ''}`}
              onClick={() => setActiveTab('notes')}
            >
              <FileText size={18} />
              <span>Daily Notes</span>
            </button>

            <button 
              id="nav-attendance"
              className={`nav-item ${activeTab === 'attendance' ? 'active' : ''}`}
              onClick={() => setActiveTab('attendance')}
            >
              <Users size={18} />
              <span>Attendance Register</span>
            </button>



            <div className="nav-section-title">Analytics</div>

            <button 
              id="nav-reports"
              className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              <BarChart3 size={18} />
              <span>Reports & Export</span>
            </button>

            <button 
              id="nav-backup"
              className={`nav-item ${activeTab === 'backup' ? 'active' : ''}`}
              onClick={() => setActiveTab('backup')}
            >
              <Database size={18} />
              <span>Sync & Backup</span>
            </button>
          </nav>
        </div>

        <div className="sidebar-footer">
          {/* Cloud Sync indicators */}
          <div className="cloud-sync-bar">
            <div className="sync-status">
              <span className={`sync-dot ${syncState === 'syncing' ? 'syncing' : ''}`} />
              <span>{syncState === 'syncing' ? 'Syncing...' : 'Cloud Synced'}</span>
            </div>
            <span style={{ fontSize: '10px', opacity: 0.7 }}>{lastSyncTime}</span>
          </div>

          {/* Theme toggler */}
          <button 
            id="theme-toggler"
            className="theme-toggle-btn"
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? (
              <>
                <Sun size={16} />
                <span>Light Theme</span>
              </>
            ) : (
              <>
                <Moon size={16} />
                <span>Dark Theme</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* --- Main Contents Panels --- */}
      <main className="main-content">
        
        {/* Top Header Row */}
        <div className="top-header">
          <div className="header-title-sec">
            <h1>
              {activeTab === 'dashboard' && 'Financial Dashboard'}
              {activeTab === 'new-entry' && 'Add Daily Transaction'}
              {activeTab === 'form-pages' && (activeFormTab === 'Show All' ? 'All Forms Account Ledger' : `${activeFormTab} Account Ledger`)}
              {activeTab === 'notes' && 'Daily Farm Notes Journal'}
              {activeTab === 'attendance' && 'Laborers Attendance Register'}
              {activeTab === 'reports' && 'Generate Account Reports'}
              {activeTab === 'backup' && 'Cloud Sync & Local Backup'}
            </h1>
            <p>
              {activeTab === 'dashboard' && 'Aggregated metrics and multi-form statistics for today'}
              {activeTab === 'new-entry' && 'Post a debit or credit entry; it automatically logs into the respective form'}
              {activeTab === 'form-pages' && 'Detailed ledger entries and summaries segregated by form numbers'}
              {activeTab === 'notes' && 'Record and review daily text logs, weather conditions, or crop descriptions'}
              {activeTab === 'attendance' && 'Track daily attendance, present days, half days, and absences for workers'}
              {activeTab === 'reports' && 'Generate CSV sheets, review summaries, or print out clean PDF report files'}
              {activeTab === 'backup' && 'Maintain local backups, upload saved profiles, or force cloud sync'}
            </p>
          </div>

          <div className="header-actions">
            <span className="badge badge-category" style={{ padding: '6px 12px', fontSize: '13px' }}>
              <Calendar size={13} style={{ marginRight: '6px' }} />
              Today: {todayStr}
            </span>
          </div>
        </div>

        {/* --- Tab 1: Dashboard View --- */}
        {activeTab === 'dashboard' && (
          <>
            {/* Dashboard Cards Grid */}
            <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <div className="stat-card received">
                <div>
                  <div className="stat-header">
                    <span>Received Today</span>
                    <div className="stat-icon-wrapper">
                      <ArrowUpRight size={18} />
                    </div>
                  </div>
                  <div className="stat-value">₹{dashboardStats.receivedToday.toLocaleString()}</div>
                </div>
                <div className="stat-desc">
                  <span>From all forms combined today</span>
                </div>
              </div>

              <div className="stat-card paid">
                <div>
                  <div className="stat-header">
                    <span>Paid Today</span>
                    <div className="stat-icon-wrapper">
                      <ArrowDownLeft size={18} />
                    </div>
                  </div>
                  <div className="stat-value">₹{dashboardStats.paidToday.toLocaleString()}</div>
                </div>
                <div className="stat-desc">
                  <span>Outflow expenses today</span>
                </div>
              </div>
            </div>

            {/* Split row: SVG charts & Form balances breakdown */}
            <div className="layout-grid">
              
              {/* Interactive Line Chart of Last 7 Days */}
              <div className="chart-card">
                <div className="chart-header">
                  <span className="chart-title">Cashflow Trend (Last 7 Days)</span>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '10px', height: '10px', backgroundColor: 'var(--credit)', borderRadius: '50%' }} />
                      Received
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '10px', height: '10px', backgroundColor: 'var(--debit)', borderRadius: '50%' }} />
                      Paid
                    </span>
                  </div>
                </div>

                <div className="chart-container">
                  <svg width="100%" height="100%" viewBox="0 0 600 210" preserveAspectRatio="none">
                    {/* Y Axis Guide Lines */}
                    <line x1="40" y1="20" x2="560" y2="20" stroke="var(--border-color)" strokeDasharray="3,3" />
                    <line x1="40" y1="100" x2="560" y2="100" stroke="var(--border-color)" strokeDasharray="3,3" />
                    <line x1="40" y1="180" x2="560" y2="180" stroke="var(--border-color)" />

                    {/* Chart Paths */}
                    {/* Credit (Received) Line Path */}
                    <path
                      d={`M ${chartCoordinates.pointsCredit.map(p => `${p.x} ${p.y}`).join(' L ')}`}
                      fill="none"
                      stroke="var(--credit)"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    {/* Debit (Paid) Line Path */}
                    <path
                      d={`M ${chartCoordinates.pointsDebit.map(p => `${p.x} ${p.y}`).join(' L ')}`}
                      fill="none"
                      stroke="var(--debit)"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />

                    {/* Drawing nodes */}
                    {chartCoordinates.pointsCredit.map((p, i) => (
                      <g key={`c-${i}`}>
                        <circle cx={p.x} cy={p.y} r="5" fill="var(--bg-secondary)" stroke="var(--credit)" strokeWidth="3" />
                        <title>{p.date}: Received ₹{p.val}</title>
                      </g>
                    ))}

                    {chartCoordinates.pointsDebit.map((p, i) => (
                      <g key={`d-${i}`}>
                        <circle cx={p.x} cy={p.y} r="5" fill="var(--bg-secondary)" stroke="var(--debit)" strokeWidth="3" />
                        <title>{p.date}: Paid ₹{p.val}</title>
                      </g>
                    ))}

                    {/* X-axis date labels */}
                    {chartCoordinates.dates.map((date, index) => {
                      const x = 40 + (index * (520 / 6));
                      return (
                        <text key={index} x={x} y="200" fill="var(--text-secondary)" fontSize="10" textAnchor="middle">
                          {date}
                        </text>
                      );
                    })}

                    {/* Y-axis Labels */}
                    <text x="35" y="25" fill="var(--text-tertiary)" fontSize="10" textAnchor="end">
                      ₹{(chartCoordinates.maxAmt).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </text>
                    <text x="35" y="105" fill="var(--text-tertiary)" fontSize="10" textAnchor="end">
                      ₹{(chartCoordinates.maxAmt / 2).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </text>
                    <text x="35" y="185" fill="var(--text-tertiary)" fontSize="10" textAnchor="end">
                      ₹0
                    </text>
                  </svg>
                </div>
              </div>

              {/* Form-wise Balances Column */}
              <div className="panel">
                <div className="panel-header">
                  <span className="panel-title">Form Breakdown Summary</span>
                </div>
                
                <div className="form-balances-grid" style={{ gridTemplateColumns: '1fr', gap: '12px' }}>
                  {['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Salary', 'Shivakumar'].map((f) => {
                    const stats = formBalances[f] || { balance: 0, credit: 0, debit: 0 };
                    // Calculate visual fill percent
                    const sum = stats.credit + stats.debit;
                    const percent = sum > 0 ? (stats.credit / sum) * 100 : 50;

                    return (
                      <div className="form-balance-item" key={f} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span className="form-balance-name">{formNames[f] || f} Ledger</span>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                              Today: <span style={{ color: 'var(--credit)' }}>+₹{stats.creditToday}</span> / <span style={{ color: 'var(--debit)' }}>-₹{stats.debitToday}</span>
                            </div>
                          </div>
                          <div className="form-balance-nums">
                            <span className="form-balance-total" style={{ color: stats.balance >= 0 ? 'var(--credit)' : 'var(--debit)' }}>
                              ₹{stats.balance.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        
                        {/* Progress visualizer showing Credit vs Debit share */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)' }}>
                            <span>Debit (Expenses)</span>
                            <span>Credit (Sales)</span>
                          </div>
                          <div className="progress-bar-bg" style={{ height: '8px' }}>
                            <div 
                              className="progress-bar-fill" 
                              style={{ 
                                width: `${percent}%`, 
                                backgroundColor: 'var(--credit)', 
                                borderLeft: '4px solid var(--debit)',
                                float: 'right'
                              }} 
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Recent Daily Transactions List */}
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Recent Daily Ledger Entry Logs</span>
                <button 
                  id="btn-goto-new-entry"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setActiveTab('new-entry')}
                >
                  <PlusCircle size={14} /> Add Transaction
                </button>
              </div>

              {transactions.length === 0 ? (
                <div className="empty-state">
                  <FileText className="empty-state-icon" />
                  <h3>No Transactions Logged Yet</h3>
                  <p>Start recording daily accounts by clicking the button above.</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Form #</th>
                        <th>Category</th>
                        <th>Reason / Details</th>
                        <th>Debit (Paid)</th>
                        <th>Credit (Received)</th>
                        <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.slice(0, 5).map((t) => (
                        <tr key={t.id}>
                          <td>{t.date}</td>
                          <td>
                            <span className="badge badge-form">{formNames[t.formNumber] || t.formNumber}</span>
                          </td>
                          <td>
                            <span className="badge badge-category">{t.category}</span>
                          </td>
                          <td className="description-cell">{t.reason}</td>
                          <td style={{ color: 'var(--debit)', fontWeight: 600 }}>
                            {t.type === 'Debit' ? `₹${t.amount.toLocaleString()}` : '—'}
                          </td>
                          <td style={{ color: 'var(--credit)', fontWeight: 600 }}>
                            {t.type === 'Credit' ? `₹${t.amount.toLocaleString()}` : '—'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button 
                                className="btn btn-outline btn-sm"
                                style={{ padding: '4px 8px' }}
                                onClick={() => setEditingTransaction(t)}
                                title="Edit record"
                              >
                                Edit
                              </button>
                              <button 
                                className="btn btn-danger btn-sm"
                                style={{ padding: '4px 8px' }}
                                onClick={() => handleDeleteTransaction(t.id)}
                                title="Delete record"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {transactions.length > 5 && (
                    <div style={{ padding: '12px 18px', textAlign: 'center', borderTop: '1px solid var(--border-color)' }}>
                      <button 
                        id="btn-goto-forms"
                        className="btn btn-outline btn-sm"
                        onClick={() => setActiveTab('form-pages')}
                      >
                        View All Entries <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* --- Tab 2: New Transaction (Single Entry Page) --- */}
        {activeTab === 'new-entry' && (
          <div className="layout-grid layout-grid-entry">
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">New Entry Voucher</span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Fills auto-separation ledger</span>
              </div>

              <form id="transaction-entry-form" onSubmit={handleSaveTransaction} className="transaction-form">
                
                {/* Date Selection */}
                <div className="form-group">
                  <label htmlFor="tx-date" className="form-label">
                    <Calendar size={14} /> Date
                  </label>
                  <input 
                    id="tx-date"
                    type="date" 
                    className="form-input"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>

                {/* Form Selection */}
                <div className="form-group">
                  <label htmlFor="tx-form" className="form-label">
                    <BookOpen size={14} /> Form / Account Number
                  </label>
                  <select 
                    id="tx-form"
                    className="form-select"
                    value={formData.formNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, formNumber: e.target.value }))}
                  >
                    <option value="Form 1">{formNames['Form 1'] || 'Form 1'}</option>
                    <option value="Form 2">{formNames['Form 2'] || 'Form 2'}</option>
                    <option value="Form 3">{formNames['Form 3'] || 'Form 3'}</option>
                    <option value="Form 4">{formNames['Form 4'] || 'Form 4'}</option>
                    <option value="Salary">{formNames['Salary'] || 'Salary'}</option>
                    <option value="Shivakumar">{formNames['Shivakumar'] || 'Shivakumar'}</option>
                  </select>
                </div>

                {/* Debit/Credit Toggle */}
                <div className="form-group">
                  <label className="form-label">Transaction Type</label>
                  <div className="type-toggle-container">
                    <button
                      id="type-credit-toggle"
                      type="button"
                      className={`type-toggle-btn credit-btn ${formData.type === 'Credit' ? 'selected' : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, type: 'Credit' }))}
                    >
                      <ArrowUpRight size={16} /> Credit (Received)
                    </button>
                    <button
                      id="type-debit-toggle"
                      type="button"
                      className={`type-toggle-btn debit-btn ${formData.type === 'Debit' ? 'selected' : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, type: 'Debit' }))}
                    >
                      <ArrowDownLeft size={16} /> Debit (Paid)
                    </button>
                  </div>
                </div>

                {/* Amount */}
                <div className="form-group">
                  <label htmlFor="tx-amount" className="form-label">Amount (₹)</label>
                  <input 
                    id="tx-amount"
                    type="number" 
                    className="form-input" 
                    placeholder="₹ Enter amount, e.g. 5000"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    required
                    min="1"
                  />
                </div>

                {/* Description / Reason */}
                <div className="form-group full-width">
                  <label htmlFor="tx-reason" className="form-label">
                    <FileText size={14} /> Description / Reason
                  </label>
                  <textarea 
                    id="tx-reason"
                    className="form-textarea" 
                    placeholder="e.g. Salary paid to Ravi, purchase of seeds, etc."
                    value={formData.reason}
                    onChange={(e) => handleReasonChange(e.target.value)}
                    required
                    rows={3}
                  />
                  <small style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                    Specify details like <em>"Salary paid to Ravi, Suresh and Mahesh"</em> or <em>"Received from Vikas"</em>. Worker and contact names are auto-parsed.
                  </small>
                </div>

                {/* Category Selection */}
                <div className="form-group">
                  <label htmlFor="tx-category" className="form-label">
                    <Tag size={14} /> Category
                  </label>
                  <select 
                    id="tx-category"
                    className="form-select"
                    value={formData.category}
                    onChange={(e) => {
                      const cat = e.target.value as Transaction['category'];
                      setFormData(prev => {
                        let nextForm = prev.formNumber;
                        if (cat === 'Salary') {
                          nextForm = 'Salary';
                        } else if (prev.formNumber === 'Salary') {
                          nextForm = 'Form 1';
                        }
                        
                        const lowerReason = prev.reason.toLowerCase();
                        if (lowerReason.includes('shivakumar') || lowerReason.includes('shiva')) {
                          nextForm = 'Shivakumar';
                        }
                        
                        return {
                          ...prev,
                          category: cat,
                          formNumber: nextForm
                        };
                      });
                    }}
                  >
                    <option value="Salary">Salary / Wages</option>
                    <option value="Expense">Expense (General)</option>
                    <option value="Material Purchase">Material Purchase</option>
                    <option value="Income">Income (Sales/Earnings)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Notes */}
                <div className="form-group full-width">
                  <label htmlFor="tx-notes" className="form-label">Notes (Optional)</label>
                  <textarea 
                    id="tx-notes"
                    className="form-textarea" 
                    placeholder="Write details, bank transaction ID or secondary explanations here..."
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>

                {/* Submit button */}
                <div className="form-group full-width" style={{ marginTop: '10px' }}>
                  <button 
                    id="btn-save-transaction"
                    type="submit" 
                    className="btn btn-primary"
                  >
                    <Check size={16} /> Save Daily Entry
                  </button>
                </div>
              </form>
            </div>

            {/* Smart Detection Info Panel */}
            <div className="desktop-only" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="panel" style={{ backgroundColor: 'var(--primary-light)', borderColor: 'var(--primary-border)' }}>
                <span className="panel-title" style={{ color: 'var(--primary)', borderBottom: 'none', padding: '0', marginBottom: '8px' }}>
                  <Info size={18} /> Auto-Separation Rule
                </span>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  This form is designed for fast, single-page writing. When you click <strong>Save Daily Entry</strong>, the app will instantly:
                </p>
                <ul style={{ fontSize: '13px', color: 'var(--text-secondary)', paddingLeft: '20px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <li>Segregate and record the transaction under <strong>{formData.formNumber}</strong></li>
                  <li>Scan the description for keywords like <em>salary</em>, <em>wages</em>, or <em>worker payment</em>. If detected, it creates a payroll entry in the <strong>Salary Ledger</strong> under employee <strong>{extractPersonFromReason(formData.reason, formData.category) || 'Anonymous'}</strong>.</li>
                  <li>Generate daily aggregates automatically.</li>
                </ul>
              </div>

              {/* Quick Preview Panel */}
              <div className="panel">
                <span className="panel-title" style={{ fontSize: '16px' }}>Voucher Summary Preview</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Form Ledger:</span>
                    <span style={{ fontWeight: 600 }}>{formData.formNumber}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Direction:</span>
                    <span style={{ fontWeight: 600, color: formData.type === 'Credit' ? 'var(--credit)' : 'var(--debit)' }}>
                      {formData.type === 'Credit' ? 'Money In (Credit)' : 'Money Out (Debit)'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Amount:</span>
                    <span style={{ fontWeight: 700 }}>₹{formData.amount ? Number(formData.amount).toLocaleString() : '0'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Category:</span>
                    <span className="badge badge-category" style={{ fontSize: '11px', padding: '2px 8px' }}>{formData.category}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Involved:</span>
                    <span style={{ fontWeight: 600 }}>{extractPersonFromReason(formData.reason, formData.category) || '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- Tab 3: Form Pages (Auto Segregated) --- */}
        {activeTab === 'form-pages' && (
          <>
            {/* Mobile Sub Navigation Jump Bar */}
            <div className="mobile-only mobile-subnav">
              <button 
                className="mobile-subnav-btn active"
                onClick={() => setActiveTab('form-pages')}
              >
                Account Ledgers
              </button>
              <button 
                className="mobile-subnav-btn"
                onClick={() => setActiveTab('notes')}
              >
                Daily Notes
              </button>
            </div>

            {/* Form Selector Sub-Tabs */}
            <div className="accounts-header">
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Select Account Ledger:</span>
              <button 
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setTempFormNames(formNames);
                  setShowRenameModal(true);
                }}
              >
                ✏️ Customize Account Names
              </button>
            </div>
            <div className="accounts-selector-grid">
              {['Show All', 'Form 1', 'Form 2', 'Form 3', 'Form 4', 'Salary', 'Shivakumar'].map((f) => {
                const isActive = activeFormTab === f;
                const balance = formBalances[f]?.balance || 0;
                return (
                  <button
                    key={f}
                    id={`btn-form-tab-${f.replace(' ', '')}`}
                    className={`btn ${isActive ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveFormTab(f)}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>{f === 'Show All' ? 'Show All' : (formNames[f] || f)}</span>
                      <span style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>
                        Bal: ₹{balance.toLocaleString()}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Today's Summary for the Selected Form */}
            <div className="dashboard-grid">
              <div className="stat-card received" style={{ padding: '16px' }}>
                <div>
                  <div className="stat-header" style={{ fontSize: '12px' }}>
                    <span>Today's Received ({activeFormTab === 'Show All' ? 'All Forms' : activeFormTab})</span>
                  </div>
                  <div className="stat-value" style={{ fontSize: '20px' }}>
                    ₹{(formBalances[activeFormTab]?.creditToday || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="stat-card paid" style={{ padding: '16px' }}>
                <div>
                  <div className="stat-header" style={{ fontSize: '12px' }}>
                    <span>Today's Paid ({activeFormTab === 'Show All' ? 'All Forms' : activeFormTab})</span>
                  </div>
                  <div className="stat-value" style={{ fontSize: '20px' }}>
                    ₹{(formBalances[activeFormTab]?.debitToday || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="stat-card balance" style={{ padding: '16px' }}>
                <div>
                  <div className="stat-header" style={{ fontSize: '12px' }}>
                    <span>Today's Balance ({activeFormTab === 'Show All' ? 'All Forms' : activeFormTab})</span>
                  </div>
                  <div 
                    className="stat-value" 
                    style={{ 
                      fontSize: '20px', 
                      color: (formBalances[activeFormTab]?.balanceToday || 0) >= 0 ? 'var(--credit)' : 'var(--debit)' 
                    }}
                  >
                    ₹{(formBalances[activeFormTab]?.balanceToday || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="stat-card form" style={{ padding: '16px', background: 'var(--primary-light)', borderColor: 'var(--primary-border)' }}>
                <div>
                  <div className="stat-header" style={{ fontSize: '12px', color: 'var(--primary)' }}>
                    <span>Accumulated Balance ({activeFormTab === 'Show All' ? 'All Forms' : activeFormTab})</span>
                  </div>
                  <div className="stat-value" style={{ fontSize: '20px', color: 'var(--primary)' }}>
                    ₹{(formBalances[activeFormTab]?.balance || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Filter controls row */}
            <div className="panel" style={{ padding: '16px' }}>
              <div className="filters-row">
                <div className="search-input-wrapper">
                  <Search />
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Search transactions within this form..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <select 
                  className="form-select" 
                  style={{ width: '150px' }}
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="All">All Categories</option>
                  <option value="Salary">Salary</option>
                  <option value="Expense">Expense</option>
                  <option value="Material Purchase">Material Purchase</option>
                  <option value="Income">Income</option>
                  <option value="Other">Other</option>
                </select>

                <select 
                  className="form-select" 
                  style={{ width: '130px' }}
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="All">All Types</option>
                  <option value="Credit">Credit (+) </option>
                  <option value="Debit">Debit (-)</option>
                </select>

                {(searchQuery || filterCategory !== 'All' || filterType !== 'All') && (
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterCategory('All');
                      setFilterType('All');
                    }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Table displaying matching entries */}
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">{activeFormTab === 'Show All' ? 'All Forms' : activeFormTab} - Transaction History</span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Total {filteredTransactions.filter(t => activeFormTab === 'Show All' || t.formNumber === activeFormTab).length} records matching
                </span>
              </div>

              {filteredTransactions.filter(t => activeFormTab === 'Show All' || t.formNumber === activeFormTab).length === 0 ? (
                <div className="empty-state">
                  <FileText className="empty-state-icon" />
                  <h3>No Records Found</h3>
                  <p>Try clearing filters or search parameters for this page.</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        {activeFormTab === 'Show All' && <th>Form #</th>}
                        <th>Date</th>
                        <th>Category</th>
                        <th>Reason / Description</th>
                        <th>Debit (Paid)</th>
                        <th>Credit (Received)</th>
                        <th style={{ width: '120px', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions
                        .filter(t => activeFormTab === 'Show All' || t.formNumber === activeFormTab)
                        .map((t) => (
                          <tr key={t.id}>
                            {activeFormTab === 'Show All' && (
                              <td>
                                <span className="badge badge-form">{formNames[t.formNumber] || t.formNumber}</span>
                              </td>
                            )}
                            <td>{t.date}</td>
                            <td>
                              <span className="badge badge-category">{t.category}</span>
                            </td>
                            <td className="description-cell">{t.reason}</td>
                            <td style={{ color: 'var(--debit)', fontWeight: 600 }}>
                              {t.type === 'Debit' ? `₹${t.amount.toLocaleString()}` : '—'}
                            </td>
                            <td style={{ color: 'var(--credit)', fontWeight: 600 }}>
                              {t.type === 'Credit' ? `₹${t.amount.toLocaleString()}` : '—'}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                <button 
                                  className="btn btn-outline btn-sm"
                                  style={{ padding: '4px 8px' }}
                                  onClick={() => setEditingTransaction(t)}
                                >
                                  Edit
                                </button>
                                <button 
                                  className="btn btn-danger btn-sm"
                                  style={{ padding: '4px 8px' }}
                                  onClick={() => handleDeleteTransaction(t.id)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* --- Tab: Daily Notes --- */}
        {activeTab === 'notes' && (
          <>
            {/* Mobile Sub Navigation Jump Bar */}
            <div className="mobile-only mobile-subnav">
              <button 
                className="mobile-subnav-btn"
                onClick={() => setActiveTab('form-pages')}
              >
                Account Ledgers
              </button>
              <button 
                className="mobile-subnav-btn active"
                onClick={() => setActiveTab('notes')}
              >
                Daily Notes
              </button>
            </div>

            <div className="layout-grid layout-grid-entry">
              
              {/* Left Column: Add/Edit Daily Note */}
              <div className="panel">
                <div className="panel-header">
                  <span className="panel-title">
                    <FileText size={20} /> {editingNote ? 'Modify Daily Note' : 'Create Daily Note'}
                  </span>
                  {editingNote && (
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm"
                      onClick={handleCancelEditNote}
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <form onSubmit={handleSaveNote} className="transaction-form" style={{ gridTemplateColumns: '1fr' }}>
                  {/* Date Selection */}
                  <div className="form-group">
                    <label className="form-label">
                      <Calendar size={14} /> Note Date
                    </label>
                    <input 
                      type="date" 
                      className="form-input"
                      value={noteFormData.date}
                      onChange={(e) => setNoteFormData(prev => ({ ...prev, date: e.target.value }))}
                      required
                    />
                  </div>

                  {/* Title */}
                  <div className="form-group">
                    <label className="form-label">Title / Topic</label>
                    <input 
                      type="text" 
                      className="form-input"
                      placeholder="e.g. Tomato crop harvest details"
                      value={noteFormData.title}
                      onChange={(e) => setNoteFormData(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>

                  {/* Content Textarea */}
                  <div className="form-group">
                    <label className="form-label">Write Note Content</label>
                    <textarea 
                      className="form-textarea"
                      placeholder="Write notes about seeds, weather, workers wages or general remarks for this day..."
                      value={noteFormData.content}
                      onChange={(e) => setNoteFormData(prev => ({ ...prev, content: e.target.value }))}
                      required
                      rows={8}
                      style={{ minHeight: '160px' }}
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary btn-block"
                    style={{ marginTop: '8px' }}
                  >
                    <Check size={16} /> {editingNote ? 'Save Changes' : 'Save Daily Note'}
                  </button>
                </form>
              </div>

              {/* Right Column: Search and Filter Notes List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Search & Date Filter Card */}
                <div className="panel" style={{ padding: '16px' }}>
                  <div className="filters-row">
                    <div className="search-input-wrapper">
                      <Search />
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Search keywords in title/content..."
                        value={noteSearchQuery}
                        onChange={(e) => setNoteSearchQuery(e.target.value)}
                      />
                    </div>
                    
                    <input 
                      type="date" 
                      className="form-input" 
                      style={{ width: '150px' }}
                      value={noteDateFilter}
                      onChange={(e) => setNoteDateFilter(e.target.value)}
                    />

                    {(noteSearchQuery || noteDateFilter) && (
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setNoteSearchQuery('');
                          setNoteDateFilter('');
                        }}
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                </div>

                {/* Notes List Panel */}
                <div className="panel" style={{ flexGrow: 1 }}>
                  <div className="panel-header">
                    <span className="panel-title">Notes History Logs</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Total {filteredNotes.length} notes found
                    </span>
                  </div>

                  {filteredNotes.length === 0 ? (
                    <div className="empty-state">
                      <FileText className="empty-state-icon" />
                      <h3>No Notes Found</h3>
                      <p>Start recording daily logs or clear active search filters.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '550px', overflowY: 'auto', paddingRight: '4px' }}>
                      {filteredNotes.map((note) => (
                        <div 
                          key={note.id}
                          style={{
                            padding: '16px',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'var(--bg-primary)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            position: 'relative'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span className="badge badge-category" style={{ fontSize: '11px' }}>
                              <Calendar size={11} style={{ marginRight: '4px' }} />
                              {note.date}
                            </span>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button 
                                className="btn btn-outline btn-sm"
                                style={{ padding: '2px 6px', fontSize: '11px' }}
                                onClick={() => handleEditNoteStart(note)}
                              >
                                Edit
                              </button>
                              <button 
                                className="btn btn-danger btn-sm"
                                style={{ padding: '2px 6px', fontSize: '11px' }}
                                onClick={() => handleDeleteNote(note.id)}
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>

                          <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                            {note.title}
                          </h3>

                          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', margin: 0, lineHeight: '1.5' }}>
                            {note.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </div>
          </>
        )}

        {/* --- Tab 4: Attendance Register --- */}
        {activeTab === 'attendance' && (
          <div className="layout-grid">
            
            {/* Left Column: Mark Daily Attendance */}
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">
                  <Users size={20} /> Mark Daily Attendance
                </span>
              </div>

              <form onSubmit={handleSaveAttendance} className="transaction-form" style={{ gridTemplateColumns: '1fr' }}>
                {/* Date Selection */}
                <div className="form-group">
                  <label className="form-label">
                    <Calendar size={14} /> Selected Date
                  </label>
                  <input 
                    type="date" 
                    className="form-input"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    required
                  />
                </div>

                {/* Laborers Status List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
                  {attendanceLaborers.map((lab) => {
                    const status = markStatus[lab] || 'None';
                    return (
                      <div 
                        key={lab}
                        style={{ 
                          padding: '16px', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: 'var(--radius-md)', 
                          backgroundColor: 'var(--bg-primary)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                          {lab}
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                          <button
                            type="button"
                            className={`btn btn-sm ${status === 'Present' ? 'btn-primary' : 'btn-outline'}`}
                            style={{ 
                              borderColor: status === 'Present' ? 'var(--credit)' : 'var(--border-color)',
                              backgroundColor: status === 'Present' ? 'var(--credit)' : 'transparent',
                              color: status === 'Present' ? 'white' : 'var(--text-secondary)'
                            }}
                            onClick={() => setMarkStatus(prev => ({ ...prev, [lab]: 'Present' }))}
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm ${status === 'Half Day' ? 'btn-primary' : 'btn-outline'}`}
                            style={{ 
                              borderColor: status === 'Half Day' ? 'var(--warning)' : 'var(--border-color)',
                              backgroundColor: status === 'Half Day' ? 'var(--warning)' : 'transparent',
                              color: status === 'Half Day' ? 'white' : 'var(--text-secondary)'
                            }}
                            onClick={() => setMarkStatus(prev => ({ ...prev, [lab]: 'Half Day' }))}
                          >
                            Half Day
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm ${status === 'Absent' ? 'btn-primary' : 'btn-outline'}`}
                            style={{ 
                              borderColor: status === 'Absent' ? 'var(--debit)' : 'var(--border-color)',
                              backgroundColor: status === 'Absent' ? 'var(--debit)' : 'transparent',
                              color: status === 'Absent' ? 'white' : 'var(--text-secondary)'
                            }}
                            onClick={() => setMarkStatus(prev => ({ ...prev, [lab]: 'Absent' }))}
                          >
                            Absent
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary btn-block"
                  style={{ marginTop: '12px' }}
                >
                  <Check size={16} /> Save Attendance Records
                </button>
              </form>
            </div>

            {/* Right Column: Monthly Summary Register & Settings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Weekly & Monthly Statistics Summary */}
              <div className="panel">
                <div className="panel-header">
                  <span className="panel-title">Attendance Statistics Summaries</span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  {/* Weekly Summary (Last 7 Days) */}
                  <div style={{ borderRight: '1px solid var(--border-color)', paddingRight: '20px' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '12px', color: 'var(--primary)' }}>
                      Weekly (Last 7 Days)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {attendanceLaborers.map((lab) => {
                        const stats = weeklyStats[lab] || { present: 0, halfDay: 0, absent: 0, totalDays: 0 };
                        return (
                          <div 
                            key={lab}
                            style={{
                              padding: '10px 14px',
                              border: '1px solid var(--border-color)',
                              borderRadius: 'var(--radius-md)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}
                          >
                            <div style={{ fontWeight: 700, fontSize: '13px' }}>{lab}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                              <span>Present: <strong>{stats.present}d</strong></span>
                              <span>Half: <strong>{stats.halfDay}d</strong></span>
                              <span>Absent: <strong>{stats.absent}d</strong></span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderTop: '1px solid var(--border-color)', paddingTop: '4px', marginTop: '2px' }}>
                              <span style={{ fontWeight: 600 }}>Total Credited:</span>
                              <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{stats.totalDays} days</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Monthly Summary */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--primary)' }}>
                        Monthly Summary
                      </span>
                      <input 
                        type="month"
                        className="form-input"
                        value={attendanceMonth}
                        onChange={(e) => setAttendanceMonth(e.target.value)}
                        style={{ width: '110px', padding: '2px 6px', fontSize: '11px', height: '24px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {attendanceLaborers.map((lab) => {
                        const stats = monthlyStats[lab] || { present: 0, halfDay: 0, absent: 0, totalDays: 0 };
                        return (
                          <div 
                            key={lab}
                            style={{
                              padding: '10px 14px',
                              border: '1px solid var(--border-color)',
                              borderRadius: 'var(--radius-md)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}
                          >
                            <div style={{ fontWeight: 700, fontSize: '13px' }}>{lab}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                              <span>Present: <strong>{stats.present}d</strong></span>
                              <span>Half: <strong>{stats.halfDay}d</strong></span>
                              <span>Absent: <strong>{stats.absent}d</strong></span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderTop: '1px solid var(--border-color)', paddingTop: '4px', marginTop: '2px' }}>
                              <span style={{ fontWeight: 600 }}>Total Credited:</span>
                              <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{stats.totalDays} days</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly History Log */}
              <div className="panel">
                <div className="panel-header">
                  <span className="panel-title">Marked History Logs</span>
                </div>

                {markedDatesInMonth.length === 0 ? (
                  <div className="empty-state" style={{ padding: '20px 0' }}>
                    <Calendar size={28} className="empty-state-icon" style={{ opacity: 0.5 }} />
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No attendance logs for this month.</p>
                  </div>
                ) : (
                  <div className="table-container" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                    <table className="data-table" style={{ fontSize: '13px' }}>
                      <thead>
                        <tr>
                          <th>Date</th>
                          {attendanceLaborers.map(lab => (
                            <th key={lab}>{lab}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {markedDatesInMonth.map(date => {
                          const record = attendanceRecords[date] || {};
                          return (
                            <tr key={date}>
                              <td style={{ fontWeight: 500 }}>{date.substring(5, 10)}</td>
                              {attendanceLaborers.map(lab => {
                                const status = record[lab] || 'None';
                                const labelMap = { Present: 'P', 'Half Day': 'H', Absent: 'A', None: '—' };
                                const colorMap = { Present: 'var(--credit)', 'Half Day': 'var(--warning)', Absent: 'var(--debit)', None: 'var(--text-tertiary)' };
                                return (
                                  <td key={lab} style={{ color: colorMap[status], fontWeight: 700 }}>
                                    {labelMap[status]}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Settings / Rename panel */}
              <div className="panel">
                <div className="panel-header">
                  <span className="panel-title">✏️ Manage Laborers Names</span>
                </div>

                {!isRenamingLaborers ? (
                  <button 
                    type="button" 
                    className="btn btn-outline btn-block btn-sm"
                    onClick={() => {
                      setTempLaborers([...attendanceLaborers]);
                      setIsRenamingLaborers(true);
                    }}
                  >
                    Rename Laborers
                  </button>
                ) : (
                  <form onSubmit={handleSaveLaborerNames} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '12px' }}>Laborer 1</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={tempLaborers[0]} 
                        onChange={(e) => setTempLaborers(prev => [e.target.value, prev[1]])}
                        required
                        style={{ padding: '8px 10px', fontSize: '13px' }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '12px' }}>Laborer 2</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={tempLaborers[1]} 
                        onChange={(e) => setTempLaborers(prev => [prev[0], e.target.value])}
                        required
                        style={{ padding: '8px 10px', fontSize: '13px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-sm" 
                        style={{ flex: 1 }}
                        onClick={() => setIsRenamingLaborers(false)}
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1 }}
                      >
                        Save Names
                      </button>
                    </div>
                  </form>
                )}
              </div>

            </div>

          </div>
        )}

        {/* --- Tab 5: Advanced Reports --- */}
        {activeTab === 'reports' && (
          <>
            {/* Mobile Sub Navigation Jump Bar */}
            <div className="mobile-only mobile-subnav">
              <button 
                className="mobile-subnav-btn active"
                onClick={() => setActiveTab('reports')}
              >
                Reports & Export
              </button>
              <button 
                className="mobile-subnav-btn"
                onClick={() => setActiveTab('backup')}
              >
                Sync & Backup
              </button>
            </div>

            {/* Report Parameter Panel */}
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Configure Report Parameters</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    id="btn-print-report"
                    className="btn btn-secondary btn-sm"
                    onClick={handlePrint}
                  >
                    <Printer size={14} /> Print PDF
                  </button>
                  <button 
                    id="btn-export-excel"
                    className="btn btn-primary btn-sm"
                    onClick={() => handleExportCSV(reportTransactions, `${reportType}_Report_${new Date().toISOString().split('T')[0]}`)}
                  >
                    <Download size={14} /> Export to Excel
                  </button>
                </div>
              </div>

              <div className="filters-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', width: '100%' }}>
                
                {/* Report Type */}
                <div className="form-group">
                  <label className="form-label">Report Class</label>
                  <select 
                    id="select-report-type"
                    className="form-select"
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value as any)}
                  >
                    <option value="daily">Daily Account Summary</option>
                    <option value="monthly">Monthly Aggregate Summary</option>
                    <option value="form-wise">Form-wise Detailed Ledger</option>
                  </select>
                </div>

                {/* Date Input (Daily) */}
                {reportType === 'daily' && (
                  <div className="form-group">
                    <label className="form-label">Select Date</label>
                    <input 
                      type="date" 
                      className="form-input"
                      value={reportDate}
                      onChange={(e) => setReportDate(e.target.value)}
                    />
                  </div>
                )}

                {/* Month Input (Monthly) */}
                {reportType === 'monthly' && (
                  <div className="form-group">
                    <label className="form-label">Select Month</label>
                    <input 
                      type="month" 
                      className="form-input"
                      value={reportMonth}
                      onChange={(e) => setReportMonth(e.target.value)}
                    />
                  </div>
                )}

                {/* Form Input (Form-wise) */}
                {reportType === 'form-wise' && (
                  <div className="form-group">
                    <label className="form-label">Select Form</label>
                    <select 
                      className="form-select"
                      value={reportForm}
                      onChange={(e) => setReportForm(e.target.value)}
                    >
                      <option value="Show All">Show All (All Accounts)</option>
                      <option value="Form 1">{formNames['Form 1'] || 'Form 1'}</option>
                      <option value="Form 2">{formNames['Form 2'] || 'Form 2'}</option>
                      <option value="Form 3">{formNames['Form 3'] || 'Form 3'}</option>
                      <option value="Form 4">{formNames['Form 4'] || 'Form 4'}</option>
                      <option value="Salary">{formNames['Salary'] || 'Salary'}</option>
                      <option value="Shivakumar">{formNames['Shivakumar'] || 'Shivakumar'}</option>
                    </select>
                  </div>
                )}

                {/* General Info Tag */}
                <div className="form-group" style={{ justifyContent: 'center' }}>
                  <div style={{ fontSize: '12px', padding: '10px', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <strong>Selected Scope: </strong> 
                    {reportType === 'daily' && `Day of ${reportDate}`}
                    {reportType === 'monthly' && `Month of ${reportMonth}`}
                    {reportType === 'form-wise' && `${formNames[reportForm] || reportForm} Ledger`}
                  </div>
                </div>

              </div>
            </div>

            {/* Aggregated Numbers for Report */}
            <div className="dashboard-grid">
              <div className="stat-card received" style={{ padding: '16px' }}>
                <div>
                  <div className="stat-header" style={{ fontSize: '11px' }}>
                    <span>Report Total Income</span>
                  </div>
                  <div className="stat-value" style={{ fontSize: '20px' }}>
                    ₹{reportStats.credit.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="stat-card paid" style={{ padding: '16px' }}>
                <div>
                  <div className="stat-header" style={{ fontSize: '11px' }}>
                    <span>Report Total Outflow</span>
                  </div>
                  <div className="stat-value" style={{ fontSize: '20px' }}>
                    ₹{reportStats.debit.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="stat-card balance" style={{ padding: '16px' }}>
                <div>
                  <div className="stat-header" style={{ fontSize: '11px' }}>
                    <span>Report Net Balance</span>
                  </div>
                  <div 
                    className="stat-value" 
                    style={{ 
                      fontSize: '20px', 
                      color: reportStats.balance >= 0 ? 'var(--credit)' : 'var(--debit)' 
                    }}
                  >
                    ₹{reportStats.balance.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="stat-card form" style={{ padding: '16px' }}>
                <div>
                  <div className="stat-header" style={{ fontSize: '11px' }}>
                    <span>Record Volume</span>
                  </div>
                  <div className="stat-value" style={{ fontSize: '20px' }}>
                    {reportTransactions.length} items
                  </div>
                </div>
              </div>
            </div>

            {/* Printable Report Document Table */}
            <div className="panel" id="printable-report-area">
              <div style={{ display: 'none', flexDirection: 'column', gap: '8px', marginBottom: '20px' }} className="print-only">
                <h2 style={{ fontFamily: 'var(--font-heading)' }}>Shivakumar's Farm Account Book Report</h2>
                <p>Generated on {todayStr} | Target Scope: {reportType.toUpperCase()} ({
                  reportType === 'daily' ? reportDate : 
                  reportType === 'monthly' ? reportMonth : 
                  (formNames[reportForm] || reportForm)
                })</p>
                <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                  <span><strong>Total Credits (Received):</strong> ₹{reportStats.credit}</span>
                  <span><strong>Total Debits (Paid):</strong> ₹{reportStats.debit}</span>
                  <span><strong>Net Balance:</strong> ₹{reportStats.balance}</span>
                </div>
              </div>

              <div className="panel-header">
                <span className="panel-title">Report Data Sheet</span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Visualizing raw ledger rows below
                </span>
              </div>

              {reportTransactions.length === 0 ? (
                <div className="empty-state">
                  <FileText className="empty-state-icon" />
                  <h3>No Records Match Scope</h3>
                  <p>Adjust parameters or dates to load historical sheets.</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Form #</th>
                        <th>Category</th>
                        <th>Reason / Description</th>
                        <th>Debit (Paid)</th>
                        <th>Credit (Received)</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportTransactions.map((t) => (
                        <tr key={t.id}>
                          <td>{t.date}</td>
                          <td>
                            <span className="badge badge-form">{formNames[t.formNumber] || t.formNumber}</span>
                          </td>
                          <td>
                            <span className="badge badge-category">{t.category}</span>
                          </td>
                          <td className="description-cell">{t.reason}</td>
                          <td style={{ color: 'var(--debit)', fontWeight: 600 }}>
                            {t.type === 'Debit' ? `₹${t.amount.toLocaleString()}` : '—'}
                          </td>
                          <td style={{ color: 'var(--credit)', fontWeight: 600 }}>
                            {t.type === 'Credit' ? `₹${t.amount.toLocaleString()}` : '—'}
                          </td>
                          <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {t.notes || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* --- Tab 6: Backup & Cloud Sync --- */}
        {activeTab === 'backup' && (
          <>
            {/* Mobile Sub Navigation Jump Bar */}
            <div className="mobile-only mobile-subnav">
              <button 
                className="mobile-subnav-btn"
                onClick={() => setActiveTab('reports')}
              >
                Reports & Export
              </button>
              <button 
                className="mobile-subnav-btn active"
                onClick={() => setActiveTab('backup')}
              >
                Sync & Backup
              </button>
            </div>

            <div className="layout-grid layout-grid-backup">
            
            {/* Cloud Sync simulated panel */}
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">
                  <RefreshCw size={20} /> Cloud Sync & Storage
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  Your account entries are securely synced in the cloud. The system operates locally off-line first, enabling instantaneous page saves and works under remote areas (e.g. agricultural farms) without active cellular networks.
                </p>

                <div style={{ padding: '16px', backgroundColor: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Cloud Service Status:</span>
                    <span style={{ color: 'var(--credit)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--credit)' }} />
                      Online & Connected
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Last Cloud Sync:</span>
                    <span style={{ fontWeight: 600 }}>{lastSyncTime}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Sync Buffer Status:</span>
                    <span style={{ color: 'var(--credit)', fontWeight: 600 }}>0 Pending Changes</span>
                  </div>
                </div>

                <button 
                  id="btn-force-sync"
                  className="btn btn-primary"
                  onClick={triggerCloudSync}
                  disabled={syncState === 'syncing'}
                >
                  <RefreshCw size={16} className={syncState === 'syncing' ? 'syncing' : ''} />
                  {syncState === 'syncing' ? 'Syncing accounts...' : 'Force Cloud Sync Now'}
                </button>
              </div>
            </div>

            {/* Local Backup Panel */}
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">
                  <Database size={20} /> Local File Backup
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  Download or restore physical files onto your drive. Ideal for making hard records, migrating computers, or storing backups locally on a memory stick.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  
                  {/* Export */}
                  <button 
                    id="btn-download-backup"
                    className="btn btn-outline" 
                    onClick={handleExportBackup}
                    style={{ justifyContent: 'flex-start' }}
                  >
                    <Download size={16} /> 
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>Download Database File</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Downloads transactions data structure as JSON</div>
                    </div>
                  </button>

                  {/* Import File Picker */}
                  <label 
                    htmlFor="upload-backup-file"
                    className="btn btn-outline" 
                    style={{ justifyContent: 'flex-start', cursor: 'pointer' }}
                  >
                    <Upload size={16} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>Upload & Restore Backup</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Restores data from a previously downloaded .json file</div>
                    </div>
                    <input 
                      id="upload-backup-file"
                      type="file" 
                      accept=".json" 
                      onChange={handleImportBackup} 
                      style={{ display: 'none' }}
                    />
                  </label>



                  {/* Delete All Data */}
                  <button 
                    id="btn-delete-database"
                    className="btn btn-danger" 
                    onClick={() => setShowClearModal(true)}
                    style={{ justifyContent: 'flex-start' }}
                  >
                    <Trash2 size={16} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>Clear All Account Records</div>
                      <div style={{ fontSize: '11px', color: 'rgba(244, 63, 94, 0.8)' }}>Permanently deletes all data off local browser cache</div>
                    </div>
                  </button>

                </div>
              </div>
            </div>

          </div>
        </>
      )}

      </main>

      {/* --- Overlay Modal: EDIT TRANSACTION --- */}
      {editingTransaction && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span className="modal-title">Modify Ledger Entry</span>
              <button 
                className="btn btn-outline btn-sm" 
                style={{ padding: '6px', borderRadius: '50%' }}
                onClick={() => setEditingTransaction(null)}
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateTransaction}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  
                  {/* Date */}
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input 
                      type="date" 
                      className="form-input"
                      value={editingTransaction.date}
                      onChange={(e) => setEditingTransaction(prev => prev ? { ...prev, date: e.target.value } : null)}
                      required
                    />
                  </div>

                  {/* Form # */}
                  <div className="form-group">
                    <label className="form-label">Form Number</label>
                    <select 
                      className="form-select"
                      value={editingTransaction.formNumber}
                      onChange={(e) => setEditingTransaction(prev => prev ? { ...prev, formNumber: e.target.value } : null)}
                    >
                      <option value="Form 1">{formNames['Form 1'] || 'Form 1'}</option>
                      <option value="Form 2">{formNames['Form 2'] || 'Form 2'}</option>
                      <option value="Form 3">{formNames['Form 3'] || 'Form 3'}</option>
                      <option value="Form 4">{formNames['Form 4'] || 'Form 4'}</option>
                      <option value="Salary">{formNames['Salary'] || 'Salary'}</option>
                      <option value="Shivakumar">{formNames['Shivakumar'] || 'Shivakumar'}</option>
                    </select>
                  </div>

                  {/* Type */}
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select 
                      className="form-select"
                      value={editingTransaction.type}
                      onChange={(e) => setEditingTransaction(prev => prev ? { ...prev, type: e.target.value as any } : null)}
                    >
                      <option value="Credit">Credit (Money Received)</option>
                      <option value="Debit">Debit (Money Paid)</option>
                    </select>
                  </div>

                  {/* Amount */}
                  <div className="form-group">
                    <label className="form-label">Amount (₹)</label>
                    <input 
                      type="number" 
                      className="form-input"
                      value={editingTransaction.amount}
                      onChange={(e) => setEditingTransaction(prev => prev ? { ...prev, amount: Number(e.target.value) } : null)}
                      required
                    />
                  </div>

                </div>

                {/* Reason */}
                <div className="form-group">
                  <label className="form-label">Reason / Description</label>
                  <textarea 
                    className="form-textarea"
                    value={editingTransaction.reason}
                    onChange={(e) => setEditingTransaction(prev => prev ? { ...prev, reason: e.target.value } : null)}
                    required
                    rows={3}
                  />
                </div>

                {/* Person */}


                {/* Category */}
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select 
                    className="form-select"
                    value={editingTransaction.category}
                    onChange={(e) => setEditingTransaction(prev => prev ? { ...prev, category: e.target.value as any } : null)}
                  >
                    <option value="Salary">Salary</option>
                    <option value="Expense">Expense</option>
                    <option value="Material Purchase">Material Purchase</option>
                    <option value="Income">Income</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Notes */}
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea 
                    className="form-textarea"
                    value={editingTransaction.notes || ''}
                    onChange={(e) => setEditingTransaction(prev => prev ? { ...prev, notes: e.target.value } : null)}
                  />
                </div>

              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setEditingTransaction(null)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                >
                  Save Modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Overlay Modal: CLEAR ALL DATABASE --- */}
      {showClearModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header" style={{ backgroundColor: 'var(--debit-light)' }}>
              <span className="modal-title" style={{ color: 'var(--debit)' }}>Confirm Hard Reset</span>
            </div>
            
            <div className="modal-body" style={{ padding: '20px 24px', textAlign: 'center' }}>
              <p style={{ fontWeight: 600 }}>Are you absolutely sure you want to clear the entire account registry?</p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                This will wipe out all daily transactions across Forms 1, 2, 3, 4 and the Salary Account, including the worker payroll logs. This action cannot be undone.
              </p>
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowClearModal(false)}
              >
                No, Keep My Records
              </button>
              <button 
                id="btn-confirm-delete"
                className="btn btn-danger"
                onClick={handleClearAllData}
              >
                Yes, Clear All Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Overlay Modal: CUSTOMIZE ACCOUNT NAMES --- */}
      {showRenameModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <span className="modal-title">✏️ Customize Account Names</span>
              <button 
                className="btn btn-outline btn-sm" 
                style={{ padding: '6px', borderRadius: '50%' }}
                onClick={() => setShowRenameModal(false)}
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleSaveFormNames}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Customize the displays of form books and accounts. You can edit names in any language (such as Hindi, Kannada, Telugu, English, etc.).
                </p>
                
                {['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Salary', 'Shivakumar'].map((f) => (
                  <div className="form-group" key={f} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>Default: {f}</label>
                    <input 
                      type="text" 
                      className="form-input"
                      value={tempFormNames[f] || ''}
                      onChange={(e) => setTempFormNames(prev => ({ ...prev, [f]: e.target.value }))}
                      placeholder={`Enter custom name for ${f}`}
                      required
                    />
                  </div>
                ))}
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowRenameModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                >
                  Save Account Names
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Toast Notifications Area --- */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <div className="toast-content">
              <div className="toast-title">{toast.title}</div>
              <div className="toast-msg">{toast.message}</div>
            </div>
            <button 
              className="btn btn-sm btn-outline" 
              style={{ border: 'none', padding: '2px', background: 'transparent' }}
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* --- Mobile Bottom Navigation --- */}
      <nav className="mobile-nav mobile-only">
        <button 
          className={`mobile-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </button>

        <button 
          className={`mobile-nav-item ${activeTab === 'new-entry' ? 'active' : ''}`}
          onClick={() => setActiveTab('new-entry')}
        >
          <PlusCircle size={20} />
          <span>New Entry</span>
        </button>

        <button 
          className={`mobile-nav-item ${(activeTab === 'form-pages' || activeTab === 'notes') ? 'active' : ''}`}
          onClick={() => setActiveTab(activeTab === 'notes' ? 'notes' : 'form-pages')}
        >
          <BookOpen size={20} />
          <span>Accounts & Notes</span>
        </button>

        <button 
          className={`mobile-nav-item ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          <Users size={20} />
          <span>Attendance</span>
        </button>

        <button 
          className={`mobile-nav-item ${(activeTab === 'reports' || activeTab === 'backup') ? 'active' : ''}`}
          onClick={() => setActiveTab(activeTab === 'backup' ? 'backup' : 'reports')}
        >
          <BarChart3 size={20} />
          <span>Reports & Sync</span>
        </button>
      </nav>

    </div>
  );
}
