import React, { useState, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import { UserProfile, GlobalSettings } from '../types';

interface MessageModalProps {
  user: UserProfile;
  globalSettings: GlobalSettings;
  onClose: () => void;
}

export const MessageModal: React.FC<MessageModalProps> = ({ user, globalSettings, onClose }) => {
  const defaultMsg = 'অভিনন্দন! আপনার অ্যাকাউন্ট কনফার্ম ও অ্যাপ্রুভ করা হয়েছে।';
  const [message, setMessage] = useState(defaultMsg);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 60000); // 1 minute
    return () => clearInterval(interval);
  }, []);

  const services = [
    { name: 'Auto Sign', active: globalSettings.isAutoSignApiActive },
    { name: 'Info Verify', active: globalSettings.isInfoVerifyApiActive },
    { name: 'Server Copy', active: globalSettings.isServerCopyApiActive },
    { name: 'Auto NID', active: globalSettings.isAutoNidApiActive },
    { name: 'Smart Voter', active: globalSettings.isSmartVoterApiActive },
  ];

  const handleSend = () => {
    const msg = `${message}\n\nইউজার আইডি: ${user.userId || 'N/A'}\nইমেইল: ${user.email}\n\nলগইন লিংক:\nhttps://all-services-roan.vercel.app/`;
    let raw = (user.whatsapp || '').trim().replace(/\D/g, '');
    if (raw.length === 11 && raw.startsWith('0')) raw = '88' + raw;
    if (raw) window.open(`https://wa.me/${raw}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">সার্ভিস স্ট্যাটাস ও মেসেজ</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        
        <div className="space-y-4 mb-6">
          <h3 className="font-semibold text-sm">সার্ভিস স্ট্যাটাস:</h3>
          <div className="grid grid-cols-2 gap-2">
            {services.map(s => (
              <div key={s.name} className="flex justify-between p-2 bg-slate-50 rounded text-xs">
                <span>{s.name}</span>
                <span className={s.active ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                  {s.active ? 'ON' : 'OFF'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <textarea 
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="মেসেজ লিখুন..."
          className="w-full p-3 border rounded-lg mb-4 text-sm"
        />

        <button 
          onClick={handleSend}
          className="w-full bg-indigo-600 text-white p-2 rounded-lg font-bold flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" /> মেসেজ পাঠান
        </button>
      </div>
    </div>
  );
};
