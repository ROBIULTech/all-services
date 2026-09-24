import React, { useState } from 'react';
import { UserProfile } from '../types';
import { ShieldCheck, User, MapPin, Trash2, CheckCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface SubAdminPanelProps {
  allUsers: UserProfile[];
  updateUser: (uid: string, updates: Partial<UserProfile>) => Promise<void>;
}

export const SubAdminPanel: React.FC<SubAdminPanelProps> = ({ allUsers, updateUser }) => {
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    adminArea: '',
    division: '',
    district: '',
    upazila: '',
    union: '',
    ward: '',
    village: '',
    whatsapp: ''
  });

  const filteredUsers = allUsers.filter(u => 
    u.role === 'user' && 
    (u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const subAdmins = allUsers.filter(u => u.role === 'sub-admin');

  const handlePromote = async () => {
    if (!selectedUser) return;
    
    // WhatsApp validation: Must be a valid 11-digit number starting with 0
    const rawPhone = (formData.whatsapp || '').trim().replace(/\D/g, '');
    if (!/^01[3-9]\d{8}$/.test(rawPhone)) {
        alert("দয়া করে সঠিক ১১ ডিজিটের হোয়াটসঅ্যাপ নম্বর দিন (যেমন: ০১৮XXXXXXXX)");
        return;
    }
    
    const updates: Partial<UserProfile> = { 
      role: 'sub-admin', 
      adminArea: formData.adminArea,
      division: formData.division,
      district: formData.district,
      upazila: formData.upazila,
      union: formData.union,
      ward: formData.ward,
      village: formData.village,
      whatsapp: formData.whatsapp
    };
    
    // Generate Sub-Admin Login URL
    const baseUrl = window.location.origin;
    const subAdminUrl = `${baseUrl}/sub-admin-login?uid=${selectedUser.uid}`;

    // Send WhatsApp welcome message
    const msg = `অভিনন্দন! আপনাকে সাব-অ্যাডমিন হিসেবে নিয়োগ দেওয়া হয়েছে।

আপনার তথ্য:
আইডি: ${selectedUser.userId || 'N/A'}
ইমেইল: ${selectedUser.email}
এলাকা: ${formData.adminArea}

লগইন লিঙ্ক: ${subAdminUrl}

আমাদের প্ল্যাটফর্মে স্বাগতম!`;

    let formattedPhone = rawPhone;
    if (formattedPhone.length === 11 && formattedPhone.startsWith('0')) formattedPhone = '88' + formattedPhone;
    
    if (formattedPhone) {
        window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    }

    // Add URL to updates
    const finalUpdates: Partial<UserProfile> = { 
      ...updates,
      // @ts-ignore
      subAdminUrl: subAdminUrl
    };
    
    await updateUser(selectedUser.uid, finalUpdates);

    setSelectedUser(null);
    setFormData({ adminArea: '', division: '', district: '', upazila: '', union: '', ward: '', village: '', whatsapp: '' });
  };

  const handleDemote = async (uid: string) => {
    await updateUser(uid, { role: 'user', adminArea: null });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-lg mb-4">Promote User to Sub-Admin</h3>
          <div className="space-y-4">
             <input
               type="text"
               placeholder="Search user by name or email..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full p-2 border rounded-lg"
             />
             <select 
               className="w-full p-2 border rounded-lg"
               onChange={(e) => {
                 const user = allUsers.find(u => u.uid === e.target.value) || null;
                 setSelectedUser(user);
                 if (user) setFormData(prev => ({ ...prev, whatsapp: user.whatsapp || '' }));
               }}
             >
               <option value="">Select a user</option>
               {filteredUsers.map(u => (
                 <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>
               ))}
             </select>
             
             {selectedUser && (
                <div className="bg-slate-50 p-3 rounded-lg text-sm border-2 border-red-500">
                  <p className="font-semibold text-slate-700">User Credentials:</p>
                  <p>Email: {selectedUser.email}</p>
                  <p>Password: {selectedUser.password || 'N/A'}</p>
                </div>
              )}
             
             {['adminArea', 'division', 'district', 'upazila', 'union', 'ward', 'village', 'whatsapp'].map(field => (
                <input 
                    key={field}
                    type="text"
                    placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                    value={formData[field as keyof typeof formData]}
                    onChange={(e) => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
                    className="w-full p-2 border rounded-lg"
                />
             ))}
             
             <button 
               onClick={handlePromote}
               className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold w-full"
             >
               Promote
             </button>

             <div className="mt-4 p-4 bg-slate-100 rounded-lg text-sm text-slate-700 border border-slate-200">
                <p className="font-bold mb-2">সাব-অ্যাডমিন হতে প্রয়োজনীয় তথ্য:</p>
                <ul className="list-disc list-inside space-y-1">
                    <li>এডমিন এরিয়া</li>
                    <li>বিভাগ, জেলা, থানা</li>
                    <li>ইউনিয়ন, ওয়ার্ড, গ্রাম</li>
                    <li>সঠিক হোয়াটসঅ্যাপ নম্বর</li>
                </ul>
                <button 
                  onClick={() => {
                    const text = "সাব-অ্যাডমিন হতে প্রয়োজনীয় তথ্য:\n১. এডমিন এরিয়া\n২. বিভাগ, জেলা, থানা\n৩. ইউনিয়ন, ওয়ার্ড, গ্রাম\n৪. সঠিক হোয়াটসঅ্যাপ নম্বর";
                    navigator.clipboard.writeText(text);
                    alert("তথ্য কপি করা হয়েছে!");
                  }}
                  className="mt-3 text-indigo-600 font-bold hover:underline"
                >
                  মেসেজটি কপি করুন
                </button>
              </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-lg mb-4">Current Sub-Admins</h3>
          <div className="space-y-4">
            {subAdmins.map(u => (
              <div key={u.uid} className="flex items-center justify-between p-4 border rounded-xl">
                <div>
                  <p className="font-bold">{u.displayName || u.email}</p>
                  <p className="text-xs text-slate-500 font-semibold">এলাকা: {u.adminArea || 'N/A'}</p>
                  <p className="text-xs text-slate-600">ঠিকানা: {u.village || 'N/A'}, {u.union || 'N/A'}, {u.ward || 'N/A'}, {u.upazila || 'N/A'}, {u.district || 'N/A'}, {u.division || 'N/A'}</p>
                  <p className="text-xs text-slate-600">হোয়াটসঅ্যাপ: {u.whatsapp || 'N/A'}</p>
                  <p className="text-xs text-blue-600 font-mono mt-1 break-all">
                    {/* @ts-ignore */}
                    URL: {u.subAdminUrl || 'N/A'}
                  </p>
                </div>
                <button onClick={() => handleDemote(u.uid)} className="text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
