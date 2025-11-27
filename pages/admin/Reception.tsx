
import React, { useState, useEffect, useMemo } from 'react';
import { PhoneIncoming, PhoneOutgoing, ArrowRight, Search, Clock, User, Car, Edit2, X, Save, UserPlus, History, Filter, Download, Truck, Calculator, MessageCircle, Mail, Copy, MapPin, Calendar as CalendarIcon, RefreshCcw, Sparkles, Wand2, Loader2 } from 'lucide-react';
import { MOCK_EMPLOYEES } from '../../constants';
import { Employee } from '../../types';
import { generateGeminiResponse } from '../../services/geminiService';

interface HistoryItem {
  id: number;
  time: string;
  type: string;
  details: string;
  status: string;
  name?: string; // Added for edit
  city?: string; // Added for edit
  assignedTo?: string; // Added for staff assignment
  date?: string; // Added for history tracking
}

// --- Constants for Taxi Calculation ---
const RENTAL_PACKAGES = [
  { id: '1hr', name: '1 Hr / 10 km', hours: 1, km: 10, price: 100 },
  { id: '2hr', name: '2 Hr / 20 km', hours: 2, km: 20, price: 200 },
  { id: '4hr', name: '4 Hr / 40 km', hours: 4, km: 40, price: 500 },
  { id: '8hr', name: '8 Hr / 80 km', hours: 8, km: 80, price: 1500 },
];

const Reception: React.FC = () => {
  // Session & Staff Data
  const sessionId = localStorage.getItem('app_session_id') || 'admin';
  const isSuperAdmin = sessionId === 'admin';

  // We keep 'employees' containing ALL staff for looking up names in history
  const [allEmployees, setAllEmployees] = useState<Employee[]>(() => {
    if (isSuperAdmin) {
       let all: Employee[] = [];
       const saved = localStorage.getItem('staff_data');
       if (saved) all = [...all, ...JSON.parse(saved)];
       else all = [...all, ...MOCK_EMPLOYEES];

       // Load corporate staff for lookup purposes
       try {
         const corps = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
         corps.forEach((c: any) => {
            const s = localStorage.getItem(`staff_data_${c.email}`);
            if (s) all = [...all, ...JSON.parse(s)];
         });
       } catch (e) {}
       return all;
    } else {
       const key = `staff_data_${sessionId}`;
       const saved = localStorage.getItem(key);
       return saved ? JSON.parse(saved) : [];
    }
  });

  // Load Corporate Accounts for Dropdown
  const [corporates] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
    } catch (e) { return []; }
  });

  // Main State
  const [activeTab, setActiveTab] = useState<'Incoming' | 'Outgoing' | 'History'>('Incoming');
  const [callerType, setCallerType] = useState<'Customer' | 'Vendor'>('Vendor');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isChecked, setIsChecked] = useState(false);
  const [lookupResult, setLookupResult] = useState<'New' | 'Existing'>('New');
  const [foundName, setFoundName] = useState('');
  
  // Form State
  const [formName, setFormName] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formNote, setFormNote] = useState('');
  const [assignedStaffId, setAssignedStaffId] = useState('');
  
  // Filtered Staff for dropdown
  const [filteredStaff, setFilteredStaff] = useState<Employee[]>([]);

  // History Filter State
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilterStatus, setHistoryFilterStatus] = useState('All');
  const [historyFilterDate, setHistoryFilterDate] = useState('');

  // AI State
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Update filtered staff when city changes
  useEffect(() => {
    if (!formCity) {
        setFilteredStaff([]);
        return;
    }

    let staffList: Employee[] = [];

    if (formCity === 'Head Office') {
        const adminStaff = localStorage.getItem('staff_data');
        staffList = adminStaff ? JSON.parse(adminStaff) : MOCK_EMPLOYEES;
    } else {
        const selectedCorp = corporates.find((c: any) => c.city === formCity);
        if (selectedCorp) {
            const corpStaffKey = `staff_data_${selectedCorp.email}`;
            const savedStaff = localStorage.getItem(corpStaffKey);
            if (savedStaff) {
                staffList = JSON.parse(savedStaff);
            }
        }
    }
    setFilteredStaff(staffList);
    setAssignedStaffId(''); // Reset selection when city changes
  }, [formCity, corporates]);

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<HistoryItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    city: '',
    details: '',
    status: '',
    assignedTo: ''
  });

  // --- New State for Transport Enquiry Logic inside Modal ---
  const [editEnquiryType, setEditEnquiryType] = useState<'General' | 'Transport'>('General');
  const [editTransportService, setEditTransportService] = useState<'Taxi' | 'Load Xpress'>('Taxi');
  const [editTaxiType, setEditTaxiType] = useState<'Local' | 'Rental' | 'Outstation'>('Local');
  
  const [calcDetails, setCalcDetails] = useState({
     // Local
     drop: '', estKm: '', waitingMins: '',
     // Rental
     packageId: '1hr',
     // Outstation
     destination: '', days: '1', estTotalKm: '',
     // Load Xpress
     loadPickup: '', loadDrop: '', loadWeight: ''
  });

  const [generatedEstimateMsg, setGeneratedEstimateMsg] = useState('');
  const [estimateTotal, setEstimateTotal] = useState(0);

  // Calculation Effect for Taxi
  useEffect(() => {
    if (editEnquiryType === 'Transport' && editTransportService === 'Taxi') {
        calculateTaxiEstimate();
    } else if (editEnquiryType === 'Transport' && editTransportService === 'Load Xpress') {
        // Simple Load Xpress Message
        const msg = `🚚 Load Xpress Enquiry\nPickup: ${calcDetails.loadPickup}\nDrop: ${calcDetails.loadDrop}\nWeight: ${calcDetails.loadWeight}kg\n\n(Rate pending manual verification)`;
        setGeneratedEstimateMsg(msg);
        setEstimateTotal(0); 
    } else {
        setGeneratedEstimateMsg('');
        setEstimateTotal(0);
    }
  }, [calcDetails, editTaxiType, editTransportService, editEnquiryType]);

  const calculateTaxiEstimate = () => {
      let total = 0;
      let details = '';
      
      // Constants matching Transport.tsx
      const LOCAL_BASE_FARE = 200; // covers 5km
      const LOCAL_BASE_KM = 5;
      const LOCAL_PER_KM = 20;
      const LOCAL_WAIT_RATE = 2; // per min

      const OUTSTATION_MIN_KM_DAY = 120;
      const OUTSTATION_BASE_RATE = 1800;
      const OUTSTATION_EXTRA_KM = 13;
      const OUTSTATION_DRIVER = 400;

      if (editTaxiType === 'Local') {
          const kms = parseFloat(calcDetails.estKm) || 0;
          const wait = parseFloat(calcDetails.waitingMins) || 0;
          let extraKmCost = 0;
          
          if (kms > LOCAL_BASE_KM) {
              extraKmCost = (kms - LOCAL_BASE_KM) * LOCAL_PER_KM;
          }
          const waitCost = wait * LOCAL_WAIT_RATE;
          total = LOCAL_BASE_FARE + extraKmCost + waitCost;
          
          details = `
🚖 *Local Trip Estimate*
📍 Drop: ${calcDetails.drop || 'N/A'}
🛣 Distance: ${kms} km
⏳ Wait Time: ${wait} mins

💰 *Total: ₹${total}*
(Base: ₹${LOCAL_BASE_FARE}, Extra Km: ₹${extraKmCost}, Wait: ₹${waitCost})`;

      } else if (editTaxiType === 'Rental') {
          const pkg = RENTAL_PACKAGES.find(p => p.id === calcDetails.packageId) || RENTAL_PACKAGES[0];
          total = pkg.price;
          details = `
🚖 *Rental Package Estimate*
📦 Package: ${pkg.name}

💰 *Total: ₹${total}*
(Extra charges apply for additional Km/Hrs)`;

      } else if (editTaxiType === 'Outstation') {
          const days = parseFloat(calcDetails.days) || 1;
          const totalKm = parseFloat(calcDetails.estTotalKm) || 0;
          const minCommittedKm = OUTSTATION_MIN_KM_DAY * days;
          
          const baseFare = OUTSTATION_BASE_RATE * days;
          let extraKmCost = 0;
          
          if (totalKm > minCommittedKm) {
              extraKmCost = (totalKm - minCommittedKm) * OUTSTATION_EXTRA_KM;
          }
          const driverCost = OUTSTATION_DRIVER * days;
          total = baseFare + extraKmCost + driverCost;

          details = `
🚖 *Outstation Trip Estimate*
🌍 Dest: ${calcDetails.destination}
📅 Duration: ${days} Days
🛣 Distance: ${totalKm} km

💰 *Total: ₹${total}*
(Base: ₹${baseFare}, Extra Km: ₹${extraKmCost}, Driver: ₹${driverCost})`;
      }

      setEstimateTotal(total);
      setGeneratedEstimateMsg(`Hello ${editFormData.name},\n${details}\n\nBook now with OK BOZ Transport!`);
  };

  // Recent Transfers with Persistence
  const [recentTransfers, setRecentTransfers] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('reception_recent_transfers');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse recent transfers", e);
      }
    }
    return [
      { id: 1, time: '11:00', date: '2025-11-20', type: 'Incoming Customer Call', details: 'Looking for CRM', name: 'Rahul', city: 'Ahmedabad', status: 'Transferred' },
      { id: 2, time: '12:00', date: '2025-11-20', type: 'Incoming Customer Call', details: 'Looking for CRM', name: 'Sneha', city: 'Ahmedabad', status: 'Transferred' },
    ];
  });

  // Persist Recent Transfers
  useEffect(() => {
    localStorage.setItem('reception_recent_transfers', JSON.stringify(recentTransfers));
  }, [recentTransfers]);

  // Stats
  const stats = {
    totalCalls: recentTransfers.length + 39, 
    customers: recentTransfers.filter(t => t.type.includes('Customer')).length + 25,
    vendors: recentTransfers.filter(t => t.type.includes('Vendor')).length + 14
  };

  const handleCheck = () => {
    if (phoneNumber.length < 5) return;
    setIsChecked(true);
    setAiSuggestion(''); // Reset AI
    
    // Simple Mock Lookup Logic
    const mockExistingVendors = ['9876543210', '9988776655'];
    
    if (mockExistingVendors.includes(phoneNumber)) {
        setLookupResult('Existing');
        setFoundName(callerType === 'Vendor' ? 'Rajesh Travels' : 'Rahul Gupta');
        setFormName(callerType === 'Vendor' ? 'Rajesh Travels' : 'Rahul Gupta');
        setFormCity('Head Office'); 
    } else {
        setLookupResult('New');
        setFormName('');
        setFormCity('');
        setFormNote('');
    }
  };

  const handleTransfer = () => {
    if (!formName || !formCity) {
        alert("Please enter Name and City to transfer.");
        return;
    }

    // 1. Create new history item
    // Use ISO date string (YYYY-MM-DD) for consistent filtering
    const newItem: HistoryItem = {
        id: Date.now(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toISOString().split('T')[0], // Standardized format
        type: `${activeTab} ${callerType} Call`,
        details: `${formNote || 'No notes'}`,
        status: 'Transferred',
        name: formName,
        city: formCity,
        assignedTo: assignedStaffId
    };

    setRecentTransfers([newItem, ...recentTransfers]);

    // 2. Create actual Enquiry record
    try {
        const existingEnquiries = JSON.parse(localStorage.getItem('global_enquiries_data') || '[]');
        
        const newEnquiry = {
            id: `ENQ-${Date.now()}`,
            type: callerType,
            initialInteraction: activeTab, // Incoming or Outgoing
            name: formName,
            phone: phoneNumber,
            city: formCity,
            details: formNote || 'Transferred from Reception Desk',
            status: 'New',
            assignedTo: assignedStaffId,
            isExistingVendor: lookupResult === 'Existing',
            createdAt: new Date().toLocaleString(),
            history: [
                {
                    id: Date.now(),
                    type: 'Call',
                    message: `${activeTab} Call processed at Reception Desk.`,
                    date: new Date().toLocaleString(),
                    outcome: 'Connected'
                }
            ]
        };

        localStorage.setItem('global_enquiries_data', JSON.stringify([newEnquiry, ...existingEnquiries]));
    } catch (e) {
        console.error("Failed to save enquiry to global storage", e);
    }
    
    // Reset Form
    setPhoneNumber('');
    setIsChecked(false);
    setFormName('');
    setFormCity('');
    setFormNote('');
    setAssignedStaffId('');
    setAiSuggestion('');
  };

  // AI Handler
  const handleAiDraft = async (type: 'Transfer' | 'Message' | 'Refusal') => {
    if (!formName) {
        alert("Please enter a name first.");
        return;
    }
    setIsAiLoading(true);
    const context = `Caller: ${formName}, Phone: ${phoneNumber}, City: ${formCity}, Intent: ${formNote || 'Not specified'}`;
    
    let prompt = "";
    if (type === 'Transfer') prompt = `Draft a professional, concise internal message to a staff member (e.g. "Hi Team") informing them of this call transfer: ${context}.`;
    if (type === 'Message') prompt = `Draft a short, professional WhatsApp message to the caller (${formName}) confirming we have logged their request and will call back: ${formNote}.`;
    if (type === 'Refusal') prompt = `Draft a polite script for the receptionist to say to the caller (${formName}) that the relevant person is currently unavailable but we will get back to them.`;

    try {
        const response = await generateGeminiResponse(prompt);
        setAiSuggestion(response);
    } catch (e) {
        setAiSuggestion("Could not generate response. Please try again.");
    }
    setIsAiLoading(false);
  };

  // --- Edit Handlers ---
  const handleEditClick = (item: HistoryItem) => {
    setEditingItem(item);
    setEditFormData({
        name: item.name || '',
        city: item.city || '',
        details: item.details || '',
        status: item.status || 'Transferred',
        assignedTo: item.assignedTo || ''
    });
    // Reset Transport Calculator State
    setEditEnquiryType('General');
    setEditTransportService('Taxi');
    setEditTaxiType('Local');
    setCalcDetails({ drop: '', estKm: '', waitingMins: '', packageId: '1hr', destination: '', days: '1', estTotalKm: '', loadPickup: '', loadDrop: '', loadWeight: '' });
    setGeneratedEstimateMsg('');
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;

    const updatedList = recentTransfers.map(item => {
        if (item.id === editingItem.id) {
            return {
                ...item,
                name: editFormData.name,
                city: editFormData.city,
                details: editFormData.details,
                status: editFormData.status,
                assignedTo: editFormData.assignedTo
            };
        }
        return item;
    });

    setRecentTransfers(updatedList);
    setEditingItem(null);
  };

  // Helper: Send estimate buttons
  const handleSendWhatsApp = () => {
      if(!generatedEstimateMsg) return;
      const mockPhone = "919876543210"; 
      window.open(`https://wa.me/${mockPhone}?text=${encodeURIComponent(generatedEstimateMsg)}`, '_blank');
  };

  const handleSendEmail = () => {
      if(!generatedEstimateMsg) return;
      window.location.href = `mailto:?subject=Transport Estimate&body=${encodeURIComponent(generatedEstimateMsg)}`;
  };

  const handleCopyToDetails = () => {
      setEditFormData(prev => ({
          ...prev,
          details: prev.details + '\n\n' + generatedEstimateMsg
      }));
      alert("Estimate copied to Details field.");
  };

  const getAssignedStaffName = (id?: string) => {
      if (!id) return null;
      const emp = allEmployees.find(e => e.id === id);
      return emp ? emp.name : 'Unknown';
  };

  // Filtered History for Table
  const filteredHistory = recentTransfers.filter(item => {
      const searchLower = historySearch.toLowerCase();
      const matchesSearch = 
          (item.name?.toLowerCase().includes(searchLower) || 
           item.city?.toLowerCase().includes(searchLower) || 
           item.details.toLowerCase().includes(searchLower) ||
           item.type.toLowerCase().includes(searchLower));
      
      const matchesStatus = historyFilterStatus === 'All' || item.status === historyFilterStatus;
      
      // Date Filter
      const matchesDate = !historyFilterDate || item.date === historyFilterDate;
      
      return matchesSearch && matchesStatus && matchesDate;
  });

  const resetFilters = () => {
      setHistorySearch('');
      setHistoryFilterStatus('All');
      setHistoryFilterDate('');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
            {isSuperAdmin ? 'Reception Desk (Super Admin)' : 'Reception Desk'}
        </h2>
        <p className="text-gray-500">
            {isSuperAdmin ? 'Handle calls, log enquiries, and assign staff.' : 'Log calls and manage enquiries.'}
        </p>
      </div>

      <div className={`grid grid-cols-1 ${isSuperAdmin ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-6`}>
        {/* Main Call Handling Section / History Section */}
        <div className={`${isSuperAdmin ? 'lg:col-span-2' : 'lg:col-span-1'} space-y-6`}>
           <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-[600px]">
              {/* Navigation Tabs - Available to ALL roles to enable usage */}
              <div className="flex border-b border-gray-100">
                 <button 
                    onClick={() => setActiveTab('Incoming')}
                    className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'Incoming' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                 >
                    <PhoneIncoming className="w-4 h-4" /> Incoming
                 </button>
                 <button 
                    onClick={() => setActiveTab('Outgoing')}
                    className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'Outgoing' ? 'bg-emerald-600 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                 >
                    <PhoneOutgoing className="w-4 h-4" /> Outgoing
                 </button>
                 <button 
                    onClick={() => setActiveTab('History')}
                    className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === 'History' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                 >
                    <History className="w-4 h-4" /> Call History
                 </button>
              </div>

              {/* Content Area */}
              {activeTab === 'History' ? (
                  <div className="flex-1 flex flex-col">
                      {/* History Toolbar */}
                      <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row gap-3 items-center">
                          <div className="relative flex-1 w-full">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                              <input 
                                  type="text" 
                                  placeholder="Search history..." 
                                  value={historySearch}
                                  onChange={(e) => setHistorySearch(e.target.value)}
                                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              />
                          </div>
                          <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
                              <input 
                                  type="date" 
                                  value={historyFilterDate}
                                  onChange={(e) => setHistoryFilterDate(e.target.value)}
                                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-600"
                              />
                              <select 
                                  value={historyFilterStatus}
                                  onChange={(e) => setHistoryFilterStatus(e.target.value)}
                                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                              >
                                  <option value="All">All Status</option>
                                  <option value="Transferred">Transferred</option>
                                  <option value="Pending">Pending</option>
                                  <option value="Assigned">Assigned</option>
                                  <option value="Closed">Closed</option>
                              </select>
                              {(historySearch || historyFilterStatus !== 'All' || historyFilterDate) && (
                                  <button onClick={resetFilters} className="p-2 text-gray-500 hover:text-red-500 border border-gray-200 rounded-lg hover:bg-red-50 transition-colors" title="Reset Filters">
                                      <RefreshCcw className="w-4 h-4" />
                                  </button>
                              )}
                              <button className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600" title="Export">
                                  <Download className="w-4 h-4" />
                              </button>
                          </div>
                      </div>

                      {/* History Table */}
                      <div className="flex-1 overflow-auto">
                          <table className="w-full text-left text-sm">
                              <thead className="bg-gray-50 text-gray-500 font-medium sticky top-0 z-10 border-b border-gray-200">
                                  <tr>
                                      <th className="px-4 py-3">Time / Date</th>
                                      <th className="px-4 py-3">Caller</th>
                                      <th className="px-4 py-3">Type</th>
                                      <th className="px-4 py-3">Details</th>
                                      <th className="px-4 py-3">Status</th>
                                      <th className="px-4 py-3 text-right">Action</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                  {filteredHistory.map((item) => (
                                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                          <td className="px-4 py-3">
                                              <div className="font-medium text-gray-900">{item.time}</div>
                                              <div className="text-xs text-gray-500">{item.date || 'Today'}</div>
                                          </td>
                                          <td className="px-4 py-3">
                                              <div className="font-bold text-gray-800">{item.name}</div>
                                              <div className="text-xs text-gray-500">{item.city}</div>
                                          </td>
                                          <td className="px-4 py-3">
                                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${item.type.includes('Incoming') ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                                  {item.type.replace('Call', '')}
                                              </span>
                                          </td>
                                          <td className="px-4 py-3 max-w-[200px]">
                                              <div className="truncate text-gray-600" title={item.details}>{item.details}</div>
                                              {item.assignedTo && (
                                                  <div className="flex items-center gap-1 text-xs text-blue-600 mt-1">
                                                      <User className="w-3 h-3" /> {getAssignedStaffName(item.assignedTo)}
                                                  </div>
                                              )}
                                          </td>
                                          <td className="px-4 py-3">
                                              <span className={`text-[10px] font-bold px-2 py-1 rounded border ${
                                                  item.status === 'Transferred' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                  item.status === 'Pending' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                                                  'bg-gray-50 text-gray-600 border-gray-200'
                                              }`}>
                                                  {item.status}
                                              </span>
                                          </td>
                                          <td className="px-4 py-3 text-right">
                                              <button 
                                                  onClick={() => handleEditClick(item)}
                                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                              >
                                                  <Edit2 className="w-4 h-4" />
                                              </button>
                                          </td>
                                      </tr>
                                  ))}
                                  {filteredHistory.length === 0 && (
                                      <tr>
                                          <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No history records found for the selected filters.</td>
                                      </tr>
                                  )}
                              </tbody>
                          </table>
                      </div>
                  </div>
              ) : (
                  <>
                      {/* Header Context for Entry Mode */}
                      <div className={`${activeTab === 'Incoming' ? 'bg-indigo-600' : 'bg-emerald-700'} p-6 flex justify-between items-center text-white transition-colors duration-300`}>
                         <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                                {activeTab === 'Incoming' ? <PhoneIncoming className="w-6 h-6" /> : <PhoneOutgoing className="w-6 h-6" />}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">{activeTab} Log</h3>
                                <p className="text-white/70 text-sm">{activeTab === 'Incoming' ? 'Identify Caller & Transfer' : 'Dial Number & Log Details'}</p>
                            </div>
                         </div>
                         
                         {/* Caller Type Toggle */}
                         <div className="flex bg-black/20 p-1 rounded-lg backdrop-blur-sm">
                            <button 
                                onClick={() => { setCallerType('Customer'); setIsChecked(false); }}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${callerType === 'Customer' ? 'bg-white text-indigo-600 shadow-sm' : 'text-white/70 hover:text-white'}`}
                            >
                                Customer
                            </button>
                            <button 
                                onClick={() => { setCallerType('Vendor'); setIsChecked(false); }}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${callerType === 'Vendor' ? 'bg-white text-indigo-600 shadow-sm' : 'text-white/70 hover:text-white'}`}
                            >
                                Vendor
                            </button>
                         </div>
                      </div>

                      <div className="p-8 space-y-6 flex-1 overflow-y-auto">
                         {/* Lookup */}
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {activeTab === 'Incoming' ? 'Caller' : 'Dialing'} Phone Number
                            </label>
                            <div className="flex gap-3">
                                <input 
                                    type="tel" 
                                    value={phoneNumber}
                                    onChange={(e) => { setPhoneNumber(e.target.value); setIsChecked(false); setAiSuggestion(''); }}
                                    placeholder={callerType === 'Vendor' ? "9566348085" : "Enter phone number..."}
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg"
                                />
                                <button 
                                    onClick={handleCheck}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
                                >
                                    {activeTab === 'Incoming' ? 'Check' : 'Lookup'}
                                </button>
                            </div>
                         </div>

                         {/* Result Area */}
                         {isChecked && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                {lookupResult === 'New' ? (
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3 mb-6">
                                        <Search className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="font-bold text-blue-900">New {callerType} Record</h4>
                                            <p className="text-sm text-blue-700">Number not found. Please enter details to create profile.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-start gap-3 mb-6">
                                        <User className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="font-bold text-green-900">Existing {callerType} Found</h4>
                                            <p className="text-sm text-green-700">Name: {foundName}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Details Form */}
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">{callerType === 'Vendor' ? 'Vendor Name' : 'Customer Name'}</label>
                                            <input 
                                                type="text" 
                                                placeholder={callerType === 'Vendor' ? "Business Name" : "Full Name"}
                                                value={formName}
                                                onChange={(e) => setFormName(e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">City / Branch</label>
                                            <select 
                                                value={formCity}
                                                onChange={(e) => setFormCity(e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                            >
                                                <option value="">Select City</option>
                                                <option value="Head Office">Head Office</option>
                                                {corporates.map((corp: any) => (
                                                    <option key={corp.id} value={corp.city}>{corp.city} ({corp.companyName})</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {activeTab === 'Incoming' ? 'Enquiry / Request Note' : 'Discussion Summary'}
                                        </label>
                                        <textarea 
                                            rows={3}
                                            placeholder="Type details here..."
                                            value={formNote}
                                            onChange={(e) => setFormNote(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white resize-none"
                                        />
                                    </div>

                                    {/* AI Assistant Section */}
                                    <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                                        <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <Sparkles className="w-3 h-3" /> AI Receptionist
                                        </h4>
                                        <div className="flex gap-2 mb-3">
                                            <button 
                                                onClick={() => handleAiDraft('Transfer')} 
                                                disabled={isAiLoading || !formName}
                                                className="bg-white border border-indigo-200 text-indigo-600 px-3 py-1.5 rounded-md text-xs font-medium hover:bg-indigo-100 transition-colors flex items-center gap-1 disabled:opacity-50"
                                            >
                                                {isAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                                                Transfer Note
                                            </button>
                                            <button 
                                                onClick={() => handleAiDraft('Message')}
                                                disabled={isAiLoading || !formName} 
                                                className="bg-white border border-indigo-200 text-indigo-600 px-3 py-1.5 rounded-md text-xs font-medium hover:bg-indigo-100 transition-colors flex items-center gap-1 disabled:opacity-50"
                                            >
                                                {isAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageCircle className="w-3 h-3" />}
                                                Callback Msg
                                            </button>
                                            <button 
                                                onClick={() => handleAiDraft('Refusal')} 
                                                disabled={isAiLoading || !formName}
                                                className="bg-white border border-indigo-200 text-indigo-600 px-3 py-1.5 rounded-md text-xs font-medium hover:bg-indigo-100 transition-colors flex items-center gap-1 disabled:opacity-50"
                                            >
                                                {isAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                                                Unavailable Script
                                            </button>
                                        </div>
                                        {aiSuggestion && (
                                            <div className="bg-white p-3 rounded-lg border border-indigo-200 text-xs text-gray-600 relative shadow-sm">
                                                <p className="whitespace-pre-wrap">{aiSuggestion}</p>
                                                <button 
                                                    onClick={() => setFormNote(aiSuggestion)} 
                                                    className="absolute top-2 right-2 text-indigo-600 font-bold text-[10px] hover:bg-indigo-50 px-2 py-1 rounded"
                                                >
                                                    USE
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Staff Assignment */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Staff (in {formCity || 'selected city'})</label>
                                        <div className="relative">
                                            <select 
                                                value={assignedStaffId}
                                                onChange={(e) => setAssignedStaffId(e.target.value)}
                                                disabled={!formCity}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white appearance-none disabled:bg-gray-50 disabled:text-gray-400"
                                            >
                                                <option value="">-- Select Staff --</option>
                                                {filteredStaff.length > 0 ? (
                                                    filteredStaff.map(emp => (
                                                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                                                    ))
                                                ) : (
                                                    formCity && <option disabled>No staff found in this city</option>
                                                )}
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                                                <UserPlus className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <button 
                                            onClick={handleTransfer}
                                            className={`w-full text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'Incoming' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                        >
                                            {activeTab === 'Incoming' ? 'Log & Transfer to Corporate' : 'Save Outgoing Call Log'} <ArrowRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                         )}
                      </div>
                  </>
              )}
           </div>
        </div>

        {/* Sidebar: Latest Activity & Stats - ONLY FOR SUPER ADMIN */}
        {isSuperAdmin && (
            <div className="space-y-6">
                {/* Latest Activity */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-gray-400" /> Latest Activity
                    </h3>
                    <div className="relative border-l border-gray-200 ml-3 space-y-8 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {recentTransfers.slice(0, 5).map((item) => (
                            <div key={item.id} className="pl-6 relative group">
                                <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 bg-gray-300 rounded-full ring-4 ring-white group-hover:bg-emerald-500 transition-colors"></div>
                                
                                <div className="flex justify-between items-start mb-1">
                                    <div>
                                        <span className="text-xs font-bold text-slate-400 block mb-0.5">{item.time}</span>
                                        <h4 className="text-sm font-bold text-gray-900">{item.name || 'Unknown'} <span className="font-normal text-gray-500">({item.city})</span></h4>
                                    </div>
                                    <button 
                                        onClick={() => handleEditClick(item)}
                                        className="text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all p-1 hover:bg-blue-50 rounded"
                                        title="Edit Transfer"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                
                                <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                                    <span className="font-medium text-slate-700">{item.type}</span>
                                </div>
                                
                                <p className="text-xs text-gray-500 mb-2 line-clamp-2 italic border-l-2 border-gray-100 pl-2">"{item.details}"</p>
                                
                                <div className="flex flex-wrap gap-2 items-center">
                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                        {item.status}
                                    </span>
                                    {item.assignedTo && (
                                        <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                                            <User className="w-3 h-3" /> {getAssignedStaffName(item.assignedTo)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                        {recentTransfers.length === 0 && (
                            <div className="text-center text-gray-400 text-sm py-4">No activity yet</div>
                        )}
                    </div>
                    {recentTransfers.length > 5 && (
                        <button 
                            onClick={() => setActiveTab('History')}
                            className="w-full mt-4 text-sm text-emerald-600 font-medium hover:underline text-center"
                        >
                            View Full History
                        </button>
                    )}
                </div>

                {/* Stats Card */}
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-indigo-200 text-sm font-medium mb-1">Today's Stats</p>
                        <h3 className="text-4xl font-extrabold mb-6">{stats.totalCalls} Calls</h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                                <p className="text-indigo-200 text-xs">Customers</p>
                                <p className="text-2xl font-bold">{stats.customers}</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                                <p className="text-indigo-200 text-xs">Vendors</p>
                                <p className="text-2xl font-bold">{stats.vendors}</p>
                            </div>
                        </div>
                    </div>
                    {/* Decorative background circle */}
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
                </div>
            </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                    <h3 className="font-bold text-gray-800">Edit Transfer Record</h3>
                    <button onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6 space-y-6">
                    {/* Category Toggle */}
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button 
                            onClick={() => setEditEnquiryType('General')}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${editEnquiryType === 'General' ? 'bg-white shadow-sm text-slate-800' : 'text-gray-500'}`}
                        >
                            General Enquiries
                        </button>
                        <button 
                            onClick={() => setEditEnquiryType('Transport')}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${editEnquiryType === 'Transport' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500'}`}
                        >
                            Transport Enquiry
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Name</label>
                            <input 
                                type="text"
                                value={editFormData.name}
                                onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">City</label>
                            <input 
                                type="text"
                                value={editFormData.city}
                                onChange={(e) => setEditFormData({...editFormData, city: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Dynamic Content Based on Enquiry Type */}
                    {editEnquiryType === 'General' ? (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Details</label>
                            <textarea 
                                rows={4}
                                value={editFormData.details}
                                onChange={(e) => setEditFormData({...editFormData, details: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                            />
                        </div>
                    ) : (
                        <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                            {/* Transport Service Toggle */}
                            <div className="flex gap-4 border-b border-gray-200 pb-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        checked={editTransportService === 'Taxi'} 
                                        onChange={() => setEditTransportService('Taxi')}
                                        className="text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span className="text-sm font-bold text-gray-700 flex items-center gap-1"><Car className="w-4 h-4" /> Taxi</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        checked={editTransportService === 'Load Xpress'} 
                                        onChange={() => setEditTransportService('Load Xpress')}
                                        className="text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span className="text-sm font-bold text-gray-700 flex items-center gap-1"><Truck className="w-4 h-4" /> Load Xpress</span>
                                </label>
                            </div>

                            {/* TAXI LOGIC */}
                            {editTransportService === 'Taxi' && (
                                <div className="space-y-4">
                                    {/* Trip Type Tabs */}
                                    <div className="flex gap-2">
                                        {['Local', 'Rental', 'Outstation'].map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setEditTaxiType(type as any)}
                                                className={`px-3 py-1.5 rounded text-xs font-bold border transition-all ${editTaxiType === type ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-300'}`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Dynamic Inputs for Taxi */}
                                    <div className="grid grid-cols-2 gap-3">
                                        {editTaxiType === 'Local' && (
                                            <>
                                                <div className="col-span-2">
                                                    <input placeholder="Drop Location" className="w-full p-2 border rounded text-sm" value={calcDetails.drop} onChange={e => setCalcDetails({...calcDetails, drop: e.target.value})} />
                                                </div>
                                                <input type="number" placeholder="Est Km" className="w-full p-2 border rounded text-sm" value={calcDetails.estKm} onChange={e => setCalcDetails({...calcDetails, estKm: e.target.value})} />
                                                <input type="number" placeholder="Waiting Mins" className="w-full p-2 border rounded text-sm" value={calcDetails.waitingMins} onChange={e => setCalcDetails({...calcDetails, waitingMins: e.target.value})} />
                                            </>
                                        )}
                                        {editTaxiType === 'Rental' && (
                                            <div className="col-span-2">
                                                <select className="w-full p-2 border rounded text-sm" value={calcDetails.packageId} onChange={e => setCalcDetails({...calcDetails, packageId: e.target.value})}>
                                                    {RENTAL_PACKAGES.map(pkg => <option key={pkg.id} value={pkg.id}>{pkg.name} - ₹{pkg.price}</option>)}
                                                </select>
                                            </div>
                                        )}
                                        {editTaxiType === 'Outstation' && (
                                            <>
                                                <div className="col-span-2">
                                                    <input placeholder="Destination" className="w-full p-2 border rounded text-sm" value={calcDetails.destination} onChange={e => setCalcDetails({...calcDetails, destination: e.target.value})} />
                                                </div>
                                                <input type="number" placeholder="Days" className="w-full p-2 border rounded text-sm" value={calcDetails.days} onChange={e => setCalcDetails({...calcDetails, days: e.target.value})} />
                                                <input type="number" placeholder="Total Est Km" className="w-full p-2 border rounded text-sm" value={calcDetails.estTotalKm} onChange={e => setCalcDetails({...calcDetails, estTotalKm: e.target.value})} />
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* LOAD XPRESS LOGIC */}
                            {editTransportService === 'Load Xpress' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <input placeholder="Pickup Location" className="w-full p-2 border rounded text-sm" value={calcDetails.loadPickup} onChange={e => setCalcDetails({...calcDetails, loadPickup: e.target.value})} />
                                    <input placeholder="Drop Location" className="w-full p-2 border rounded text-sm" value={calcDetails.loadDrop} onChange={e => setCalcDetails({...calcDetails, loadDrop: e.target.value})} />
                                    <div className="col-span-2">
                                        <input placeholder="Weight / Load Details" className="w-full p-2 border rounded text-sm" value={calcDetails.loadWeight} onChange={e => setCalcDetails({...calcDetails, loadWeight: e.target.value})} />
                                    </div>
                                </div>
                            )}

                            {/* Estimate Result & Actions */}
                            {generatedEstimateMsg && (
                                <div className="mt-4 border-t border-gray-200 pt-3">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><Calculator className="w-3 h-3" /> Estimate Preview</span>
                                        {estimateTotal > 0 && <span className="text-lg font-bold text-emerald-600">₹{estimateTotal.toLocaleString()}</span>}
                                    </div>
                                    <div className="bg-white p-3 border border-gray-200 rounded text-xs text-gray-600 whitespace-pre-wrap font-mono mb-3">
                                        {generatedEstimateMsg}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={handleSendWhatsApp} className="flex-1 bg-green-500 hover:bg-green-600 text-white py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1"><MessageCircle className="w-3 h-3" /> WhatsApp</button>
                                        <button onClick={handleSendEmail} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1"><Mail className="w-3 h-3" /> Email</button>
                                        <button onClick={handleCopyToDetails} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1"><Copy className="w-3 h-3" /> Copy to Details</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Status</label>
                            <select 
                                value={editFormData.status}
                                onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option>Transferred</option>
                                <option>Pending</option>
                                <option>Assigned</option>
                                <option>Closed</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Assign Staff</label>
                            <select 
                                value={editFormData.assignedTo}
                                onChange={(e) => setEditFormData({...editFormData, assignedTo: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">None</option>
                                {allEmployees.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3 border-t border-gray-100">
                        <button 
                            onClick={() => setEditingItem(null)}
                            className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSaveEdit}
                            className="flex-1 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <Save className="w-4 h-4" /> Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Reception;
