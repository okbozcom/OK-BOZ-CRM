
import React, { useState, useEffect } from 'react';
import { Mail, Send, Users, Filter, Clock, CheckCircle, AlertCircle, RefreshCcw, ChevronRight, Target, Megaphone, Sparkles } from 'lucide-react';
import { generateGeminiResponse } from '../../services/geminiService';

interface Campaign {
  id: string;
  subject: string;
  audience: string;
  sentCount: number;
  totalCount: number;
  status: 'Draft' | 'Sending' | 'Completed' | 'Failed';
  date: string;
}

const EmailMarketing: React.FC = () => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [audienceSegment, setAudienceSegment] = useState('All Customers');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Mock Database Count
  const TOTAL_CUSTOMERS = 20450;
  const [targetCount, setTargetCount] = useState(TOTAL_CUSTOMERS);

  const [campaigns, setCampaigns] = useState<Campaign[]>([
    { id: '1', subject: 'New Year Sale - 50% Off', audience: 'All Customers', sentCount: 20450, totalCount: 20450, status: 'Completed', date: '2025-01-01' },
    { id: '2', subject: 'Exclusive Franchise Offer', audience: 'High Value Leads', sentCount: 1200, totalCount: 1200, status: 'Completed', date: '2025-02-15' }
  ]);

  // Calculate audience size based on segment
  useEffect(() => {
    // Simulation of database query
    switch(audienceSegment) {
        case 'All Customers': setTargetCount(TOTAL_CUSTOMERS); break;
        case 'Active Subscribers': setTargetCount(15200); break;
        case 'Inactive (>30 days)': setTargetCount(4500); break;
        case 'VIP Clients': setTargetCount(750); break;
        default: setTargetCount(TOTAL_CUSTOMERS);
    }
  }, [audienceSegment]);

  const handleAiDraft = async () => {
    if (!subject) {
        alert("Please enter a subject or topic first.");
        return;
    }
    setIsGenerating(true);
    try {
        const prompt = `Write a marketing email body for a subject: "${subject}". 
        Audience: ${audienceSegment}. 
        Tone: Professional yet exciting. 
        Keep it concise and html friendly (but just text for now).`;
        
        const response = await generateGeminiResponse(prompt);
        setBody(response);
    } catch (e) {
        console.error(e);
    }
    setIsGenerating(false);
  };

  const handleSendCampaign = () => {
    if (!subject || !body) {
        alert("Please complete the email content.");
        return;
    }
    
    if (!window.confirm(`Are you sure you want to send this to ${targetCount.toLocaleString()} people? This action cannot be undone.`)) {
        return;
    }

    setIsSending(true);
    setProgress(0);

    // Simulate Batch Sending Process
    // In real implementation, this would call a backend API that queues jobs for AWS SES/SendGrid
    let sent = 0;
    const batchSize = 500;
    const interval = setInterval(() => {
        sent += batchSize;
        if (sent >= targetCount) {
            sent = targetCount;
            clearInterval(interval);
            setIsSending(false);
            
            // Add to history
            const newCampaign: Campaign = {
                id: Date.now().toString(),
                subject,
                audience: audienceSegment,
                sentCount: targetCount,
                totalCount: targetCount,
                status: 'Completed',
                date: new Date().toISOString().split('T')[0]
            };
            setCampaigns([newCampaign, ...campaigns]);
            alert("Campaign sent successfully!");
            setSubject('');
            setBody('');
            setProgress(0);
        }
        setProgress(Math.round((sent / targetCount) * 100));
    }, 200); // Fast simulation
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-emerald-500" /> Email Marketing
          </h2>
          <p className="text-gray-500 dark:text-gray-400">Manage bulk promotions and newsletters</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Composer */}
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-emerald-500" /> Compose Campaign
                </h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Campaign Subject</label>
                        <input 
                            type="text" 
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-gray-700 dark:text-white"
                            placeholder="e.g. Summer Sale is Here!"
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Body</label>
                            <button 
                                onClick={handleAiDraft}
                                disabled={isGenerating || !subject}
                                className="text-xs flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50"
                            >
                                <Sparkles className="w-3 h-3" /> {isGenerating ? 'Generating...' : 'Draft with AI'}
                            </button>
                        </div>
                        <textarea 
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            rows={12}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-gray-700 dark:text-white resize-y font-mono text-sm"
                            placeholder="Hi [Name], ..."
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* Right: Audience & Stats */}
        <div className="space-y-6">
            {/* Audience Selector */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-500" /> Audience
                </h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Segment</label>
                        <select 
                            value={audienceSegment}
                            onChange={(e) => setAudienceSegment(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:text-white"
                        >
                            <option>All Customers</option>
                            <option>Active Subscribers</option>
                            <option>Inactive ({'>'}30 days)</option>
                            <option>VIP Clients</option>
                        </select>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-blue-700 dark:text-blue-300">Estimated Reach</span>
                            <Users className="w-4 h-4 text-blue-500" />
                        </div>
                        <p className="text-3xl font-bold text-blue-800 dark:text-blue-200 mt-1">{targetCount.toLocaleString()}</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Valid emails found</p>
                    </div>

                    {isSending ? (
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-300">Sending...</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">{progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-200" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>
                    ) : (
                        <button 
                            onClick={handleSendCampaign}
                            disabled={!subject || !body}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-emerald-200 dark:shadow-none"
                        >
                            <Send className="w-4 h-4" /> Send Campaign
                        </button>
                    )}
                </div>
            </div>

            {/* Integration Note */}
            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800">
                <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div className="text-xs text-amber-800 dark:text-amber-300">
                        <p className="font-bold mb-1">System Note</p>
                        <p>To send 20k+ emails reliably, please configure your SMTP provider (AWS SES, SendGrid) in <strong>Settings &gt; Integrations</strong>. Currently using simulated delivery.</p>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* History Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
         <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
               <Clock className="w-5 h-5 text-gray-400" /> Campaign History
            </h3>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-700">
                    <tr>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Subject</th>
                        <th className="px-6 py-4">Audience</th>
                        <th className="px-6 py-4">Delivery</th>
                        <th className="px-6 py-4">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                    {campaigns.map(camp => (
                        <tr key={camp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-6 py-4">{camp.date}</td>
                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{camp.subject}</td>
                            <td className="px-6 py-4">{camp.audience}</td>
                            <td className="px-6 py-4">
                                <span className="font-mono">{camp.sentCount.toLocaleString()}</span> / <span className="text-gray-400">{camp.totalCount.toLocaleString()}</span>
                            </td>
                            <td className="px-6 py-4">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                    <CheckCircle className="w-3 h-3" /> {camp.status}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

export default EmailMarketing;
