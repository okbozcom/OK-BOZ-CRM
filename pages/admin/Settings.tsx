
import React, { useState, useEffect } from 'react';
import { Save, Bell, Clock, Building, Globe, Shield, Plus, Trash2, MapPin, Eye, EyeOff, Mail, Server, Database, Download, Upload, UsersRound, Edit2, X as XIcon, Check, Palette, AlertTriangle } from 'lucide-react';
import { useBranding } from '../../context/BrandingContext';

// Interface for Sub Admin / Office Staff
interface Permission {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
}

interface SubAdmin {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'SubAdmin';
  status: 'Active' | 'Inactive';
  permissions: Record<string, Permission>;
}

const MODULES = [
  'Staff',
  'Attendance',
  'Payroll',
  'Expenses',
  'Transport',
  'Reception',
  'Leads',
  'Tasks',
  'Documents',
  'Vendors'
];

const Settings: React.FC = () => {
  const { companyName: globalName, logoUrl: globalLogo, primaryColor: globalColor, updateBranding, resetBranding } = useBranding();
  
  // Determine Role and Session Context
  const userRole = localStorage.getItem('user_role');
  const isSuperAdmin = userRole === 'ADMIN';

  const getSessionKey = (key: string) => {
    const sessionId = localStorage.getItem('app_session_id') || 'admin';
    return isSuperAdmin ? key : `${key}_${sessionId}`;
  };

  const [activeTab, setActiveTab] = useState<'general' | 'attendance' | 'subadmin' | 'notifications' | 'security' | 'integrations' | 'whitelabel' | 'data'>(
    isSuperAdmin ? 'general' : 'attendance'
  );
  
  const [loading, setLoading] = useState(false);
  
  // Integrations State
  const [mapsApiKey, setMapsApiKey] = useState(() => localStorage.getItem('maps_api_key') || '');
  const [showKey, setShowKey] = useState(false);

  // Email SMTP State
  const [emailSettings, setEmailSettings] = useState(() => {
    const saved = localStorage.getItem('smtp_config');
    return saved ? JSON.parse(saved) : {
        provider: 'Custom SMTP',
        host: '',
        port: 587,
        username: '',
        password: '',
        fromName: globalName,
        fromEmail: ''
    };
  });
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);

  // Default Settings State
  const defaultSettings = {
    companyName: 'OK BOZ Pvt Ltd',
    website: 'www.okboz.com',
    email: 'admin@okboz.com',
    phone: '+91 98765 43210',
    address: '123, Tech Park, Cyber City, Gurgaon, India',
    
    // Attendance
    shifts: [
      { id: 1, name: 'General Shift', start: '09:30', end: '18:30' }
    ],
    gracePeriod: '15',
    halfDayHours: '4',

    // Notifications
    emailAlerts: true,
    smsAlerts: false,
    dailyReport: true,
    leaveUpdates: true,
  };

  const [formData, setFormData] = useState(defaultSettings);

  // Sub Admin State
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>(() => {
    const key = getSessionKey('sub_admins');
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [isSubAdminModalOpen, setIsSubAdminModalOpen] = useState(false);
  const [editingSubAdmin, setEditingSubAdmin] = useState<SubAdmin | null>(null);
  const [subAdminForm, setSubAdminForm] = useState<SubAdmin>({
    id: '',
    name: '',
    email: '',
    password: '',
    role: 'SubAdmin',
    status: 'Active',
    permissions: MODULES.reduce((acc, module) => ({
        ...acc, 
        [module]: { view: false, add: false, edit: false, delete: false }
    }), {} as Record<string, Permission>)
  });
  const [showSubAdminPassword, setShowSubAdminPassword] = useState(false);

  // White Label Local State
  const [brandingForm, setBrandingForm] = useState({
    appName: globalName,
    logoUrl: globalLogo,
    primaryColor: globalColor
  });

  // Data Management State
  const [restoreFile, setRestoreFile] = useState<File | null>(null);

  // Security Tab State
  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [securityMessage, setSecurityMessage] = useState({ type: '', text: '' });
  const [showSecurityPasswords, setShowSecurityPasswords] = useState({
      current: false,
      new: false,
      confirm: false
  });

  // Load Settings from LocalStorage on Mount
  useEffect(() => {
    const key = getSessionKey('app_settings');
    const savedSettings = localStorage.getItem(key);
    if (savedSettings) {
        try {
            const parsed = JSON.parse(savedSettings);
            setFormData(prev => ({ ...prev, ...parsed }));
        } catch (e) {
            console.error("Failed to load settings", e);
        }
    }
  }, []);

  // Sync state if localStorage changes externally (e.g. tabs)
  useEffect(() => {
    const handleStorageChange = () => {
      setMapsApiKey(localStorage.getItem('maps_api_key') || '');
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Persist Sub Admins
  useEffect(() => {
    const key = getSessionKey('sub_admins');
    localStorage.setItem(key, JSON.stringify(subAdmins));
  }, [subAdmins]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEmailSettingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEmailSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleBrandingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBrandingForm(prev => ({ ...prev, [name]: value }));
  };

  const toggleSetting = (key: string) => {
    setFormData(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
  };

  const handleShiftChange = (id: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      shifts: prev.shifts.map(s => s.id === id ? { ...s, [field]: value } : s)
    }));
  };

  const addShift = () => {
    const newId = Math.max(0, ...formData.shifts.map(s => s.id)) + 1;
    setFormData(prev => ({
      ...prev,
      shifts: [...prev.shifts, { id: newId, name: 'New Shift', start: '09:00', end: '18:00' }]
    }));
  };

  const removeShift = (id: number) => {
    if (formData.shifts.length <= 1) {
      alert("You must have at least one active shift.");
      return;
    }
    setFormData(prev => ({
      ...prev,
      shifts: prev.shifts.filter(s => s.id !== id)
    }));
  };

  const handleSave = () => {
    setLoading(true);
    
    // Save Maps API Key
    const currentKey = mapsApiKey.trim();
    const oldKey = localStorage.getItem('maps_api_key');
    
    if (currentKey) {
       localStorage.setItem('maps_api_key', currentKey);
    } else {
       localStorage.removeItem('maps_api_key');
    }

    const hasKeyChanged = currentKey !== (oldKey || '');

    // Save Email Settings
    localStorage.setItem('smtp_config', JSON.stringify(emailSettings));

    // Save Settings Data to LocalStorage (For StaffList to access)
    const settingsKey = getSessionKey('app_settings');
    localStorage.setItem(settingsKey, JSON.stringify(formData));

    // Save Branding only if super admin
    if (isSuperAdmin) {
      updateBranding({
          companyName: brandingForm.appName,
          logoUrl: brandingForm.logoUrl,
          primaryColor: brandingForm.primaryColor
      });
    }

    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      alert("Settings updated successfully!");
      
      if (hasKeyChanged) {
        window.location.reload(); 
      }
    }, 800);
  };

  const testEmailConnection = () => {
      setIsTestingEmail(true);
      // Simulate SMTP Check
      setTimeout(() => {
          setIsTestingEmail(false);
          if (emailSettings.host && emailSettings.username) {
              alert("Connection Successful! Test email sent to " + emailSettings.fromEmail);
          } else {
              alert("Connection Failed: Please check Host and Username.");
          }
      }, 2000);
  };

  const handleResetBranding = () => {
    if(window.confirm("Reset all branding to default?")) {
        resetBranding();
        setBrandingForm({
            appName: 'OK BOZ',
            logoUrl: '',
            primaryColor: '#10b981'
        });
    }
  }

  // --- Security Handlers ---
  const handleSecuritySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityMessage({ type: '', text: '' });

    if (!securityForm.currentPassword || !securityForm.newPassword || !securityForm.confirmPassword) {
        setSecurityMessage({ type: 'error', text: 'All fields are required' });
        return;
    }

    if (securityForm.newPassword !== securityForm.confirmPassword) {
        setSecurityMessage({ type: 'error', text: 'New passwords do not match' });
        return;
    }

    // Logic for updating password based on role
    if (isSuperAdmin) {
        const currentStored = localStorage.getItem('admin_password') || 'admin123';
        if (securityForm.currentPassword !== currentStored) {
             setSecurityMessage({ type: 'error', text: 'Current password is incorrect' });
             return;
        }
        localStorage.setItem('admin_password', securityForm.newPassword);
        setSecurityMessage({ type: 'success', text: 'Admin password updated successfully. Use new password for next login.' });
    } else {
        // Corporate Logic
        const accounts = JSON.parse(localStorage.getItem('corporate_accounts') || '[]');
        const sessionId = localStorage.getItem('app_session_id') || '';
        
        // Find by email since session ID for corporate is email
        const accountIndex = accounts.findIndex((a: any) => a.email === sessionId);
        
        if (accountIndex === -1) {
             setSecurityMessage({ type: 'error', text: 'Account record not found. Please contact support.' });
             return;
        }
        
        if (accounts[accountIndex].password !== securityForm.currentPassword) {
             setSecurityMessage({ type: 'error', text: 'Current password is incorrect' });
             return;
        }
        
        // Update password
        accounts[accountIndex].password = securityForm.newPassword;
        localStorage.setItem('corporate_accounts', JSON.stringify(accounts));
        setSecurityMessage({ type: 'success', text: 'Password updated successfully.' });
    }
    setSecurityForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  // --- Sub Admin Handlers ---
  const openSubAdminModal = (admin?: SubAdmin) => {
    setShowSubAdminPassword(false);
    if (admin) {
        setEditingSubAdmin(admin);
        setSubAdminForm(admin);
    } else {
        setEditingSubAdmin(null);
        setSubAdminForm({
            id: `SA-${Date.now()}`,
            name: '',
            email: '',
            password: '',
            role: 'SubAdmin',
            status: 'Active',
            permissions: MODULES.reduce((acc, module) => ({
                ...acc, 
                [module]: { view: false, add: false, edit: false, delete: false }
    }), {} as Record<string, Permission>)
        });
    }
    setIsSubAdminModalOpen(true);
  };

  const handlePermissionChange = (module: string, type: keyof Permission | 'all') => {
    setSubAdminForm(prev => {
        const current = prev.permissions[module];
        if (type === 'all') {
            // Check if currently all true, then toggle to false, else true
            const allTrue = current.view && current.add && current.edit && current.delete;
            const newVal = !allTrue;
            return {
                ...prev,
                permissions: {
                    ...prev.permissions,
                    [module]: { view: newVal, add: newVal, edit: newVal, delete: newVal }
                }
            };
        }
        return {
            ...prev,
            permissions: {
                ...prev.permissions,
                [module]: { ...current, [type]: !current[type] }
            }
        };
    });
  };

  const handleToggleFullAccess = () => {
      const allModules = MODULES;
      // Check if every single permission is true
      const allEnabled = allModules.every(m => 
          subAdminForm.permissions[m].view && 
          subAdminForm.permissions[m].add && 
          subAdminForm.permissions[m].edit && 
          subAdminForm.permissions[m].delete
      );

      const newVal = !allEnabled;
      
      const newPermissions: any = {};
      allModules.forEach(m => {
          newPermissions[m] = { view: newVal, add: newVal, edit: newVal, delete: newVal };
      });

      setSubAdminForm(prev => ({ ...prev, permissions: newPermissions }));
  };

  const saveSubAdmin = (e: React.FormEvent) => {
      e.preventDefault();
      if (!subAdminForm.name || !subAdminForm.email || !subAdminForm.password) {
          alert("Please fill in Name, Email and Password.");
          return;
      }

      if (editingSubAdmin) {
          setSubAdmins(prev => prev.map(sa => sa.id === editingSubAdmin.id ? subAdminForm : sa));
      } else {
          setSubAdmins(prev => [...prev, subAdminForm]);
      }
      setIsSubAdminModalOpen(false);
  };

  const deleteSubAdmin = (id: string) => {
      if (window.confirm("Are you sure you want to delete this Sub Admin?")) {
          setSubAdmins(prev => prev.filter(sa => sa.id !== id));
      }
  };

  // --- Data Management Functions ---
  // This handles backup of EVERYTHING in the site's storage
  const handleBackupData = () => {
    const backupData: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
             const value = localStorage.getItem(key);
             if (value) {
                 try {
                     // Attempt to parse JSON to store structured data
                     backupData[key] = JSON.parse(value);
                 } catch (e) {
                     // If plain string, store as is
                     backupData[key] = value;
                 }
             }
        }
    }

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().split('T')[0];
    a.download = `OKBOZ_FULL_SITE_BACKUP_${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRestoreFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setRestoreFile(e.target.files[0]);
    }
  };

  const handleRestoreData = () => {
    if (!restoreFile) return;
    
    if (!window.confirm("CRITICAL WARNING: This will WIPE all current data and replace it with the backup file. Are you sure?")) {
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target?.result as string);
            
            // 1. Clear all existing data to ensure a clean state
            localStorage.clear();

            // 2. Restore items
            Object.keys(data).forEach(key => {
                if (typeof data[key] === 'object') {
                    localStorage.setItem(key, JSON.stringify(data[key]));
                } else {
                    localStorage.setItem(key, String(data[key]));
                }
            });

            alert("Full site restore successful! The system will now reload.");
            window.location.reload();
        } catch (e) {
            alert("Failed to restore data. Invalid file format.");
            console.error(e);
        }
    };
    reader.readAsText(restoreFile);
  };

  // Filter tabs based on role
  const allTabs = [
    { id: 'general', label: 'Company Profile', icon: Building, visible: isSuperAdmin },
    { id: 'attendance', label: 'Attendance Rules', icon: Clock, visible: true },
    { id: 'subadmin', label: 'Sub Admins', icon: UsersRound, visible: true }, 
    { id: 'whitelabel', label: 'White Labeling', icon: Palette, visible: isSuperAdmin },
    { id: 'data', label: 'Data Management', icon: Database, visible: isSuperAdmin }, 
    { id: 'integrations', label: 'Integrations', icon: Globe, visible: true },
    { id: 'notifications', label: 'Notifications', icon: Bell, visible: true },
    { id: 'security', label: 'Security', icon: Shield, visible: true },
  ];

  const userRoleStorage = localStorage.getItem('user_role');
  if (userRoleStorage !== 'ADMIN') {
      const dataTabIndex = allTabs.findIndex(t => t.id === 'data');
      if (dataTabIndex !== -1) allTabs[dataTabIndex].visible = false;
  }

  const visibleTabs = allTabs.filter(tab => tab.visible);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
        <p className="text-gray-500">Manage your preferences, staff access, and configurations</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <nav className="flex flex-col p-2 space-y-1">
              {visibleTabs.map(tab => (
                 <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === tab.id 
                        ? 'bg-emerald-50 text-emerald-600' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[500px]">
            
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2">Company Profile</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                    <input 
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                    <input 
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
                    <input 
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Support Phone</label>
                    <input 
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Office Address</label>
                    <textarea 
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Attendance Rules */}
            {activeTab === 'attendance' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2">Shift Management</h3>
                
                <div className="space-y-4">
                  {formData.shifts.map((shift, index) => (
                    <div key={shift.id} className="flex flex-col md:flex-row items-end md:items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Shift Name</label>
                        <input 
                          value={shift.name}
                          onChange={(e) => handleShiftChange(shift.id, 'name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                      <div className="w-32">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Time</label>
                        <input 
                          type="time"
                          value={shift.start}
                          onChange={(e) => handleShiftChange(shift.id, 'start', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                      <div className="w-32">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Time</label>
                        <input 
                          type="time"
                          value={shift.end}
                          onChange={(e) => handleShiftChange(shift.id, 'end', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                      <button 
                        onClick={() => removeShift(shift.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove Shift"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  
                  <button 
                    onClick={addShift}
                    className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 py-2"
                  >
                    <Plus className="w-4 h-4" /> Add New Shift
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Grace Period (Minutes)</label>
                      <input 
                        type="number"
                        name="gracePeriod"
                        value={formData.gracePeriod}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Late mark after this duration</p>
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Min Hours for Half Day</label>
                      <input 
                        type="number"
                        name="halfDayHours"
                        value={formData.halfDayHours}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                   </div>
                </div>
              </div>
            )}

            {/* Sub Admin / Office Staff Management */}
            {activeTab === 'subadmin' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">Sub Admin Management</h3>
                            <p className="text-sm text-gray-500">Create office staff accounts and assign specific permissions.</p>
                        </div>
                        <button 
                            onClick={() => openSubAdminModal()}
                            className="bg-emerald-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-emerald-600 transition-colors"
                        >
                            <Plus className="w-4 h-4" /> Add Sub Admin
                        </button>
                    </div>

                    {subAdmins.length === 0 ? (
                        <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                            <Shield className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No sub-admins created yet.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase">
                                    <tr>
                                        <th className="px-4 py-3">Name</th>
                                        <th className="px-4 py-3">Email</th>
                                        <th className="px-4 py-3">Role</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {subAdmins.map(admin => (
                                        <tr key={admin.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-3 font-medium text-gray-800">{admin.name}</td>
                                            <td className="px-4 py-3 text-gray-600 text-sm">{admin.email}</td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold border border-indigo-100">
                                                    <Shield className="w-3 h-3" /> Sub Admin
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${admin.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {admin.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right flex justify-end gap-2">
                                                <button 
                                                    onClick={() => openSubAdminModal(admin)}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                    title="Edit Permissions"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => deleteSubAdmin(admin.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Delete User"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* White Labeling - Super Admin Only */}
            {activeTab === 'whitelabel' && isSuperAdmin && (
               <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                     <h3 className="text-lg font-bold text-gray-800">White Labeling</h3>
                     <button onClick={handleResetBranding} className="text-xs text-red-500 hover:underline">Reset to Default</button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-4">
                        <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Application Name</label>
                           <input 
                              name="appName"
                              value={brandingForm.appName}
                              onChange={handleBrandingChange}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                              placeholder="e.g. My Company HR"
                           />
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                           <input 
                              name="logoUrl"
                              value={brandingForm.logoUrl}
                              onChange={handleBrandingChange}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                              placeholder="https://..."
                           />
                           <p className="text-xs text-gray-500 mt-1">Enter a direct image URL for your logo.</p>
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Primary Theme Color</label>
                           <div className="flex items-center gap-3">
                              <input 
                                 type="color"
                                 name="primaryColor"
                                 value={brandingForm.primaryColor}
                                 onChange={handleBrandingChange}
                                 className="h-10 w-14 p-1 rounded border border-gray-300 cursor-pointer"
                              />
                              <span className="text-sm text-gray-600 font-mono">{brandingForm.primaryColor}</span>
                           </div>
                        </div>
                     </div>

                     {/* Live Preview */}
                     <div className="bg-gray-100 p-6 rounded-xl border border-gray-200 flex flex-col items-center justify-center text-center space-y-4">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Login Preview</span>
                        <div className="bg-white p-6 rounded-xl shadow-lg w-64 border border-gray-100">
                           <div className="flex justify-center mb-4">
                              {brandingForm.logoUrl ? (
                                 <img src={brandingForm.logoUrl} alt="Logo" className="h-12 object-contain" />
                              ) : (
                                 <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md" style={{ backgroundColor: brandingForm.primaryColor }}>
                                    {brandingForm.appName.charAt(0)}
                                 </div>
                              )}
                           </div>
                           <h4 className="font-bold text-gray-800 mb-1">{brandingForm.appName}</h4>
                           <p className="text-xs text-gray-500 mb-4">Sign in to continue</p>
                           <button className="w-full py-2 text-xs font-bold text-white rounded shadow-sm" style={{ backgroundColor: brandingForm.primaryColor }}>
                              Sign In
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {/* Data Management - Super Admin Only */}
            {activeTab === 'data' && isSuperAdmin && (
               <div className="space-y-6">
                  <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2">Data Backup & Restore</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 flex flex-col justify-between">
                        <div>
                           <h4 className="font-bold text-blue-900 flex items-center gap-2 mb-2">
                              <Download className="w-5 h-5" /> Backup Full Site
                           </h4>
                           <p className="text-sm text-blue-700 mb-4">
                              Download a complete JSON backup of <strong>ALL</strong> data in the system, including:
                              <span className="block mt-2 text-xs opacity-80 leading-relaxed">
                                • Dashboard & Settings<br/>
                                • Reception, Leads, Tasks<br/>
                                • Staff, Attendance, Payroll<br/>
                                • Transport, Tracking, Vendors<br/>
                                • Documents, Expenses, Corporate
                              </span>
                           </p>
                        </div>
                        <button 
                           onClick={handleBackupData}
                           className="bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium shadow-sm transition-colors flex items-center justify-center gap-2"
                        >
                           Download Full Backup
                        </button>
                     </div>

                     <div className="bg-orange-50 p-6 rounded-xl border border-orange-100 flex flex-col justify-between">
                        <div>
                           <h4 className="font-bold text-orange-900 flex items-center gap-2 mb-2">
                              <Upload className="w-5 h-5" /> Restore Full Site
                           </h4>
                           <p className="text-sm text-orange-800 mb-4">
                              Upload a backup file to restore the entire site state. 
                              <span className="block font-bold mt-2 text-orange-900 bg-orange-100/50 p-2 rounded border border-orange-200">
                                 WARNING: This will WIPE all current data and replace it with the backup.
                              </span>
                           </p>
                        </div>
                        <div className="flex gap-2">
                           <input 
                              type="file" 
                              accept=".json" 
                              onChange={handleRestoreFileChange}
                              className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200"
                           />
                           <button 
                              onClick={handleRestoreData}
                              disabled={!restoreFile}
                              className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
                           >
                              Restore
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {/* Integrations */}
            {activeTab === 'integrations' && (
               <div className="space-y-8">
                  {/* Google Maps Section */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2 mb-4">API Integrations</h3>
                    <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
                        <div className="flex items-start gap-3 mb-4">
                           <div className="bg-white p-1.5 rounded border border-gray-100 shadow-sm">
                              <MapPin className="w-6 h-6 text-blue-500" />
                           </div>
                           <div>
                              <h4 className="font-bold text-gray-900">Google Maps Platform</h4>
                              <p className="text-sm text-gray-500">Required for address autocomplete and map visualization.</p>
                           </div>
                        </div>
                        
                        <div className="space-y-2">
                           <label className="text-xs font-bold text-gray-500 uppercase">API Key</label>
                           <div className="flex gap-2">
                              <div className="relative flex-1">
                                 <input 
                                    type={showKey ? "text" : "password"}
                                    value={mapsApiKey}
                                    onChange={(e) => setMapsApiKey(e.target.value)}
                                    placeholder="AIza..."
                                    className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                                 />
                                 <button 
                                    onClick={() => setShowKey(!showKey)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                 >
                                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                 </button>
                              </div>
                           </div>
                           <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                              <AlertTriangle className="w-3 h-3" /> Ensure 'Maps JavaScript API', 'Places API', and 'Geocoding API' are enabled.
                           </p>
                        </div>
                     </div>
                  </div>

                  {/* Email Service Section */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2 mb-4">Email Service Configuration</h3>
                    <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
                        <div className="flex items-start gap-3 mb-4">
                           <div className="bg-white p-1.5 rounded border border-gray-100 shadow-sm">
                              <Mail className="w-6 h-6 text-emerald-500" />
                           </div>
                           <div>
                              <h4 className="font-bold text-gray-900">SMTP Configuration</h4>
                              <p className="text-sm text-gray-500">Connect AWS SES, SendGrid, or Custom SMTP for bulk email marketing.</p>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Provider</label>
                                <select 
                                    name="provider"
                                    value={emailSettings.provider}
                                    onChange={handleEmailSettingChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                                >
                                    <option value="Custom SMTP">Custom SMTP</option>
                                    <option value="AWS SES">AWS SES</option>
                                    <option value="SendGrid">SendGrid</option>
                                    <option value="Gmail App Password">Gmail App Password</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
                                <div className="relative">
                                    <Server className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input 
                                        name="host"
                                        value={emailSettings.host}
                                        onChange={handleEmailSettingChange}
                                        placeholder="smtp.example.com"
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Port</label>
                                <input 
                                    type="number"
                                    name="port"
                                    value={emailSettings.port}
                                    onChange={handleEmailSettingChange}
                                    placeholder="587"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                <input 
                                    name="username"
                                    value={emailSettings.username}
                                    onChange={handleEmailSettingChange}
                                    placeholder="email@example.com"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password / API Key</label>
                                <div className="relative">
                                    <input 
                                        type={showSmtpPassword ? "text" : "password"}
                                        name="password"
                                        value={emailSettings.password}
                                        onChange={handleEmailSettingChange}
                                        placeholder="••••••••"
                                        className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showSmtpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
                                <input 
                                    name="fromName"
                                    value={emailSettings.fromName}
                                    onChange={handleEmailSettingChange}
                                    placeholder="Company Name"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">From Email</label>
                                <input 
                                    name="fromEmail"
                                    value={emailSettings.fromEmail}
                                    onChange={handleEmailSettingChange}
                                    placeholder="no-reply@company.com"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-between items-center border-t border-gray-100 pt-4">
                            <button 
                                onClick={testEmailConnection}
                                disabled={isTestingEmail || !emailSettings.host}
                                className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isTestingEmail ? 'Testing...' : 'Test Connection'}
                            </button>
                            <div className="text-xs text-gray-400 italic">
                                Credentials are stored locally in your browser.
                            </div>
                        </div>
                    </div>
                  </div>
               </div>
            )}

            {/* Action Bar */}
            {activeTab !== 'security' && (
                <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg shadow-emerald-200 transition-all flex items-center gap-2 disabled:opacity-70"
                >
                    {loading ? 'Saving...' : 'Save Changes'} <Save className="w-5 h-5" />
                </button>
                </div>
            )}
          </div>
        </div>
      </div>

      {/* Sub Admin Create/Edit Modal */}
      {isSubAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl shrink-0">
                 <div>
                    <h3 className="font-bold text-gray-900 text-xl">{editingSubAdmin ? 'Edit Sub Admin' : 'Create New Sub Admin'}</h3>
                    <p className="text-sm text-gray-500">Configure access levels for office staff</p>
                 </div>
                 <button onClick={() => setIsSubAdminModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-full transition-colors">
                    <XIcon className="w-6 h-6" />
                 </button>
              </div>

              <form onSubmit={saveSubAdmin} className="flex-1 overflow-y-auto p-6 space-y-8">
                 {/* Account Details */}
                 <div className="space-y-4">
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-2">
                       <UsersRound className="w-4 h-4 text-emerald-500" /> Account Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                          <input 
                             required
                             value={subAdminForm.name}
                             onChange={(e) => setSubAdminForm({...subAdminForm, name: e.target.value})}
                             className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                             placeholder="e.g. Sarah Jones"
                          />
                       </div>
                       <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email (Login ID)</label>
                          <input 
                             required
                             type="email"
                             value={subAdminForm.email}
                             onChange={(e) => setSubAdminForm({...subAdminForm, email: e.target.value})}
                             className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                             placeholder="staff@company.com"
                          />
                       </div>
                       <div className="relative">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                          <div className="relative">
                             <input 
                                required
                                type={showSubAdminPassword ? "text" : "password"}
                                value={subAdminForm.password}
                                onChange={(e) => setSubAdminForm({...subAdminForm, password: e.target.value})}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="••••••••"
                             />
                             <button 
                                type="button"
                                onClick={() => setShowSubAdminPassword(!showSubAdminPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                             >
                                {showSubAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                             </button>
                          </div>
                       </div>
                       <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                          <select 
                             value={subAdminForm.status}
                             onChange={(e) => setSubAdminForm({...subAdminForm, status: e.target.value as 'Active' | 'Inactive'})}
                             className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                          >
                             <option value="Active">Active</option>
                             <option value="Inactive">Inactive</option>
                          </select>
                       </div>
                    </div>
                 </div>

                 {/* Permission Matrix */}
                 <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                       <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                          <Shield className="w-4 h-4 text-emerald-500" /> Access Permissions
                       </h4>
                       <button 
                          type="button" 
                          onClick={handleToggleFullAccess}
                          className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded border border-blue-100 transition-colors"
                       >
                          Toggle Full Access
                       </button>
                    </div>
                    
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                       <table className="w-full text-left text-sm">
                          <thead className="bg-gray-50 text-gray-600 font-semibold">
                             <tr>
                                <th className="px-6 py-3 w-1/3">Module</th>
                                <th className="px-4 py-3 text-center">View</th>
                                <th className="px-4 py-3 text-center">Add</th>
                                <th className="px-4 py-3 text-center">Edit</th>
                                <th className="px-4 py-3 text-center">Delete</th>
                                <th className="px-4 py-3 text-center">All</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                             {MODULES.map(module => {
                                const perms = subAdminForm.permissions[module];
                                return (
                                   <tr key={module} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-6 py-3 font-medium text-gray-800">{module}</td>
                                      {(['view', 'add', 'edit', 'delete'] as const).map(type => (
                                         <td key={type} className="px-4 py-3 text-center">
                                            <input 
                                               type="checkbox" 
                                               checked={perms[type]} 
                                               onChange={() => handlePermissionChange(module, type)}
                                               className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                                            />
                                         </td>
                                      ))}
                                      <td className="px-4 py-3 text-center">
                                         <button
                                            type="button" 
                                            onClick={() => handlePermissionChange(module, 'all')}
                                            className="text-xs text-gray-500 hover:text-emerald-600 font-medium"
                                         >
                                            {perms.view && perms.add && perms.edit && perms.delete ? 'Unselect' : 'Select'}
                                         </button>
                                      </td>
                                   </tr>
                                );
                             })}
                          </tbody>
                       </table>
                    </div>
                 </div>
              </form>

              <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl shrink-0">
                 <button 
                    type="button" 
                    onClick={() => setIsSubAdminModalOpen(false)}
                    className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-white transition-colors"
                 >
                    Cancel
                 </button>
                 <button 
                    onClick={saveSubAdmin}
                    className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 shadow-md transition-colors flex items-center gap-2"
                 >
                    <Check className="w-4 h-4" /> Save User
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
