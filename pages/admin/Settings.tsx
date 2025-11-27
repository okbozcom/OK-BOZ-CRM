
import React, { useState, useEffect } from 'react';
import { Save, Bell, Clock, Building, Globe, Shield, Plus, Trash2, MapPin, Eye, EyeOff, Mail, Server, Database, Download, Upload, UsersRound, Edit2, X as XIcon, Check, Palette, AlertTriangle, Cloud, RefreshCw, ExternalLink, HelpCircle, Wifi, Lock } from 'lucide-react';
import { useBranding } from '../../context/BrandingContext';
import { FirebaseConfig, syncToCloud, restoreFromCloud, testConnection } from '../../services/cloudService';

interface SubAdmin {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'SubAdmin';
  status: 'Active' | 'Inactive';
  permissions: any;
}

const Settings: React.FC = () => {
  const { companyName: globalName, logoUrl: globalLogo, primaryColor: globalColor, updateBranding, resetBranding } = useBranding();
  
  const userRole = localStorage.getItem('user_role');
  const isSuperAdmin = userRole === 'ADMIN';

  const getSessionKey = (key: string) => {
    const sessionId = localStorage.getItem('app_session_id') || 'admin';
    return isSuperAdmin ? key : `${key}_${sessionId}`;
  };

  const [activeTab, setActiveTab] = useState<'general' | 'attendance' | 'subadmin' | 'notifications' | 'security' | 'integrations' | 'whitelabel' | 'data' | 'cloud'>(
    isSuperAdmin ? 'general' : 'attendance'
  );
  
  const [loading, setLoading] = useState(false);
  const [cloudStatus, setCloudStatus] = useState({ loading: false, msg: '', type: '' });
  const [showHelp, setShowHelp] = useState(false);
  
  // Integrations State
  const [mapsApiKey, setMapsApiKey] = useState(() => localStorage.getItem('maps_api_key') || '');
  const [showKey, setShowKey] = useState(false);

  // Firebase Config State
  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseConfig>(() => {
      const saved = localStorage.getItem('firebase_config');
      return saved ? JSON.parse(saved) : {
          apiKey: '',
          authDomain: '',
          projectId: '',
          storageBucket: '',
          messagingSenderId: '',
          appId: ''
      };
  });

  // Default Settings State
  const [formData, setFormData] = useState({
    companyName: 'OK BOZ Pvt Ltd',
    website: 'www.okboz.com',
    email: 'admin@okboz.com',
    phone: '+91 98765 43210',
    address: '123, Tech Park, Cyber City, Gurgaon, India',
    shifts: [
      { id: 1, name: 'General Shift', start: '09:30', end: '18:30' }
    ]
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFirebaseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setFirebaseConfig(prev => ({ ...prev, [name]: value }));
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
    if (currentKey) localStorage.setItem('maps_api_key', currentKey);
    else localStorage.removeItem('maps_api_key');

    // Save Firebase Config
    localStorage.setItem('firebase_config', JSON.stringify(firebaseConfig));

    // Save App Settings
    const settingsKey = getSessionKey('app_settings');
    localStorage.setItem(settingsKey, JSON.stringify(formData));

    setTimeout(() => {
      setLoading(false);
      alert("Settings saved successfully!");
    }, 800);
  };

  // --- Cloud Sync Handlers ---
  
  const handleTestConnection = async () => {
      if (!firebaseConfig.apiKey) {
          alert("Please enter API Key.");
          return;
      }
      setCloudStatus({ loading: true, msg: 'Testing connection...', type: 'info' });
      const result = await testConnection(firebaseConfig);
      setCloudStatus({ 
          loading: false, 
          msg: result.message, 
          type: result.success ? 'success' : 'error' 
      });
  };

  const handleCloudSync = async () => {
      if (!firebaseConfig.apiKey) {
          alert("Please configure Database settings first.");
          return;
      }
      setCloudStatus({ loading: true, msg: 'Syncing to cloud...', type: 'info' });
      
      const result = await syncToCloud(firebaseConfig);
      setCloudStatus({ 
          loading: false, 
          msg: result.message, 
          type: result.success ? 'success' : 'error' 
      });
      
      if (result.success) {
          setTimeout(() => setCloudStatus({ loading: false, msg: '', type: '' }), 5000);
      }
  };

  const handleCloudRestore = async () => {
      if (!firebaseConfig.apiKey) {
          alert("Please configure Database settings first.");
          return;
      }
      if (!window.confirm("This will overwrite your current local data with the cloud backup. Continue?")) return;

      setCloudStatus({ loading: true, msg: 'Restoring from cloud...', type: 'info' });
      
      const result = await restoreFromCloud(firebaseConfig);
      
      if (result.success) {
          alert(result.message);
          window.location.reload();
      } else {
          setCloudStatus({ loading: false, msg: result.message, type: 'error' });
      }
  };

  const allTabs = [
    { id: 'general', label: 'Company Profile', icon: Building, visible: isSuperAdmin },
    { id: 'attendance', label: 'Attendance Rules', icon: Clock, visible: true },
    { id: 'cloud', label: 'Cloud Database', icon: Cloud, visible: isSuperAdmin },
    { id: 'integrations', label: 'Integrations', icon: Globe, visible: true },
  ];

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
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                    <input name="companyName" value={formData.companyName} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input name="email" value={formData.email} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </div>
              </div>
            )}

            {/* Cloud Database Tab */}
            {activeTab === 'cloud' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Cloud className="w-5 h-5 text-blue-500" /> Cloud Database Connection
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">Connect a Firebase database to persist your data across Vercel deployments.</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${firebaseConfig.apiKey ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {firebaseConfig.apiKey ? 'Configured' : 'Not Connected'}
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800 flex gap-3">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <div>
                            <strong>Why do I need this?</strong> Vercel hosts your frontend code. Without a database connection, your data is stored in your browser's LocalStorage and will disappear if you clear cache or change devices.
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                       <button 
                         onClick={() => setShowHelp(!showHelp)}
                         className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                       >
                         <HelpCircle className="w-4 h-4" /> Where do I find these keys?
                       </button>
                       <a 
                         href="https://console.firebase.google.com/" 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                       >
                         Open Firebase Console <ExternalLink className="w-3 h-3" />
                       </a>
                    </div>

                    {showHelp && (
                      <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-sm text-gray-700 space-y-2 animate-in fade-in slide-in-from-top-1">
                        <p className="font-semibold">Instructions:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-1">
                          <li>Go to <a href="https://console.firebase.google.com/" target="_blank" className="text-blue-600 underline">Firebase Console</a> and select your project.</li>
                          <li>Click <strong>Build &gt; Firestore Database</strong>. Click <strong>Create Database</strong> and select <strong>Start in Test Mode</strong>.</li>
                          <li>Click the <strong>Gear icon ⚙️</strong> (Project Settings) in the sidebar.</li>
                          <li>Scroll down to the <strong>"Your apps"</strong> section.</li>
                          <li>Copy the values from the <code>firebaseConfig</code> code block below.</li>
                        </ol>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">API Key</label>
                            <input 
                                name="apiKey"
                                type="password"
                                value={firebaseConfig.apiKey}
                                onChange={handleFirebaseChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="AIzaSy..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Auth Domain</label>
                            <input 
                                name="authDomain"
                                value={firebaseConfig.authDomain}
                                onChange={handleFirebaseChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="project.firebaseapp.com"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Project ID</label>
                            <input 
                                name="projectId"
                                value={firebaseConfig.projectId}
                                onChange={handleFirebaseChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="my-project-id"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Storage Bucket</label>
                            <input 
                                name="storageBucket"
                                value={firebaseConfig.storageBucket}
                                onChange={handleFirebaseChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="project.appspot.com"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Messaging Sender ID</label>
                            <input 
                                name="messagingSenderId"
                                value={firebaseConfig.messagingSenderId}
                                onChange={handleFirebaseChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">App ID</label>
                            <input 
                                name="appId"
                                value={firebaseConfig.appId}
                                onChange={handleFirebaseChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100 flex flex-col gap-4">
                        <div className="flex flex-wrap gap-3">
                            <button 
                                onClick={handleTestConnection}
                                disabled={cloudStatus.loading}
                                className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                            >
                                <Wifi className="w-4 h-4" /> Test Connection
                            </button>
                            <button 
                                onClick={handleCloudSync}
                                disabled={cloudStatus.loading}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
                            >
                                {cloudStatus.loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                Sync to Cloud
                            </button>
                            <button 
                                onClick={handleCloudRestore}
                                disabled={cloudStatus.loading}
                                className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
                            >
                                <Download className="w-4 h-4" /> Restore
                            </button>
                        </div>
                        
                        {cloudStatus.msg && (
                            <div className={`text-sm font-medium p-3 rounded-lg border ${
                                cloudStatus.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 
                                cloudStatus.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 
                                'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                                {cloudStatus.msg}
                            </div>
                        )}

                        {/* Specific Help for Permissions Error */}
                        {(cloudStatus.msg.toLowerCase().includes('permission') || cloudStatus.msg.toLowerCase().includes('missing')) && (
                            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 animate-in fade-in slide-in-from-bottom-2">
                                <h4 className="font-bold text-amber-800 flex items-center gap-2 mb-2 text-sm">
                                    <Lock className="w-4 h-4" /> Database is Locked
                                </h4>
                                <p className="text-xs text-amber-700 mb-2">Firebase security rules are preventing the connection. Follow these steps to fix:</p>
                                <ol className="list-decimal list-inside text-xs text-amber-800 space-y-1 ml-1 font-medium">
                                    <li>Go to <a href="https://console.firebase.google.com/" target="_blank" className="underline">Firebase Console</a> &gt; Build &gt; <strong>Firestore Database</strong>.</li>
                                    <li>Click the <strong>Rules</strong> tab at the top.</li>
                                    <li>Change <code className="bg-amber-100 px-1 rounded mx-1">allow read, write: if false;</code> to:</li>
                                    <li className="ml-4 mt-1"><code className="bg-white border border-amber-200 px-2 py-1 rounded block w-fit text-emerald-600">allow read, write: if true;</code></li>
                                    <li>Click <strong>Publish</strong> and then click <strong>Test Connection</strong> again here.</li>
                                </ol>
                            </div>
                        )}
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
                        <input value={shift.name} onChange={(e) => handleShiftChange(shift.id, 'name', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" />
                      </div>
                      <div className="w-32">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Time</label>
                        <input type="time" value={shift.start} onChange={(e) => handleShiftChange(shift.id, 'start', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" />
                      </div>
                      <div className="w-32">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Time</label>
                        <input type="time" value={shift.end} onChange={(e) => handleShiftChange(shift.id, 'end', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" />
                      </div>
                      <button onClick={() => removeShift(shift.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  ))}
                  <button onClick={addShift} className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 py-2"><Plus className="w-4 h-4" /> Add New Shift</button>
                </div>
              </div>
            )}

            {/* Integration Tab */}
            {activeTab === 'integrations' && (
                <div className="space-y-6">
                    <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2">Integrations</h3>
                    <div className="bg-white border border-gray-200 p-5 rounded-xl">
                        <h4 className="font-bold text-gray-900 flex items-center gap-2 mb-4"><MapPin className="w-5 h-5 text-blue-500" /> Google Maps</h4>
                        <div className="flex gap-2">
                            <input type={showKey ? "text" : "password"} value={mapsApiKey} onChange={e => setMapsApiKey(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="AIza..." />
                            <button onClick={() => setShowKey(!showKey)} className="text-gray-500 p-2"><Eye className="w-4 h-4" /></button>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Bar */}
            <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg shadow-emerald-200 transition-all flex items-center gap-2 disabled:opacity-70"
                >
                    {loading ? 'Saving...' : 'Save Configuration'} <Save className="w-5 h-5" />
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
