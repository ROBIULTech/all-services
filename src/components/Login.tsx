import React, { useState, useEffect } from 'react';
import { LogIn, ShieldCheck, Shield, Mail, Lock, ArrowLeft, Eye, EyeOff, CheckCircle, MessageSquare, Clock, Monitor, Smartphone, Download, Bookmark, AlertCircle } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, auth, db, doc, getDoc, setDoc, serverTimestamp, query, where, collection, getDocs, signInAnonymously } from '../firebase';
import { motion } from 'motion/react';
import { Logo } from './Logo';
import { GlobalSettings } from '../types';

interface LoginProps {
  onLogin: (user: any, profile: any) => void;
  globalSettings: GlobalSettings;
}

// Strict WhatsApp Number Validator (Checks for original/genuine numbers)
const validateOriginalWhatsApp = (numberStr: string): { isValid: boolean; formatted: string; error?: string } => {
  const raw = (numberStr || '').trim();
  const digits = raw.replace(/\D/g, '');

  if (!digits || digits.length < 10) {
    return { isValid: false, formatted: '', error: 'অনুগ্রহ করে একটি সঠিক ও সক্রিয় হোয়াটসঅ্যাপ নম্বর লিখুন।' };
  }

  // Reject obvious fake/dummy numbers (e.g. all repeating digits: 01777777777, 00000000000, 11111111111)
  if (/^(\d)\1+$/.test(digits)) {
    return { isValid: false, formatted: '', error: 'ভুল বা ডামি নম্বর গ্রহণযোগ্য নয়! আপনার আসল হোয়াটসঅ্যাপ নম্বর দিন।' };
  }

  // Reject sequential fake digits like 01234567890, 12345678901, 9876543210
  if (digits.includes('12345678') || digits.includes('98765432') || digits.includes('01234567')) {
    return { isValid: false, formatted: '', error: 'ধারাবাহিক ডামি নম্বর দেওয়া যাবে না। অরিজিনাল হোয়াটসঅ্যাপ নম্বর দিন।' };
  }

  // BD format check: 013, 014, 015, 016, 017, 018, 019
  // If user entered 01XXXXXXXXX (11 digits)
  if (digits.length === 11 && digits.startsWith('01')) {
    const operatorDigit = digits[2];
    if (!['3', '4', '5', '6', '7', '8', '9'].includes(operatorDigit)) {
      return { isValid: false, formatted: '', error: 'বাংলাদেশের সঠিক মোবাইল অপারেটর কোড দিন (যেমন: 017, 018, 019, 016, 015, 013, 014)' };
    }
    return { isValid: true, formatted: digits };
  }

  // If user entered 8801XXXXXXXXX (13 digits)
  if (digits.length === 13 && digits.startsWith('8801')) {
    const operatorDigit = digits[4];
    if (!['3', '4', '5', '6', '7', '8', '9'].includes(operatorDigit)) {
      return { isValid: false, formatted: '', error: 'বাংলাদেশের সঠিক মোবাইল অপারেটর কোড দিন' };
    }
    return { isValid: true, formatted: digits.substring(2) }; // store as 01XXXXXXXXX
  }

  // If international (+ followed by 10-15 digits)
  if (raw.startsWith('+') && digits.length >= 10 && digits.length <= 15) {
    return { isValid: true, formatted: '+' + digits };
  }

  return { isValid: false, formatted: '', error: '১১ ডিজিটের আসল ও সচল হোয়াটসঅ্যাপ নম্বর দিন (যেমন: 017xxxxxxxx)।' };
};

export const Login: React.FC<LoginProps> = ({ onLogin, globalSettings }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAdminRoute, setIsAdminRoute] = useState(false);
  const [pendingProfile, setPendingProfile] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);

  const getAdminVerificationPhone = () => {
    const rawNumber = globalSettings?.whatsappSupportNumber || globalSettings?.adminPhoneNumber || globalSettings?.whatsappNotifyNumber || '8801811152997';
    let clean = rawNumber.replace(/\D/g, '');
    if (clean.length === 11 && clean.startsWith('0')) {
      clean = '88' + clean;
    }
    return clean || '8801811152997';
  };

  useEffect(() => {
    const checkPath = () => {
      const path = window.location.pathname;
      const isAdmin = path === '/secure-node-portal-v1x9k';
      setIsAdminRoute(isAdmin);
      if (isAdmin) {
        setIsLogin(true);
      }
    };

    checkPath();
    window.addEventListener('popstate', checkPath);
    return () => window.removeEventListener('popstate', checkPath);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const cleanEmail = email.trim();
        const lowerEmail = cleanEmail.toLowerCase();
        
        // 1. Verify in Firestore (search both lowercase and original)
        let profileData: any = null;
        const qLower = query(collection(db, 'users'), where('email', '==', lowerEmail));
        const snapLower = await getDocs(qLower);

        if (!snapLower.empty) {
          profileData = snapLower.docs[0].data();
        } else {
          const qExact = query(collection(db, 'users'), where('email', '==', cleanEmail));
          const snapExact = await getDocs(qExact);
          if (!snapExact.empty) {
            profileData = snapExact.docs[0].data();
          }
        }
        
        if (!profileData) {
          throw new Error('এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট খুঁজে পাওয়া যায়নি। অনুগ্রহ করে সাইন আপ করুন।');
        }
        
        if (profileData.password && profileData.password !== password) {
          throw new Error('পাসওয়ার্ড ভুল হয়েছে! সঠিক পাসওয়ার্ড দিয়ে পুনরায় চেষ্টা করুন।');
        }

        if (isAdminRoute && profileData.role !== 'admin') {
          throw new Error('অ্যাক্সেস অস্বীকার করা হয়েছে! শুধুমাত্র অ্যাডমিন লগইন করতে পারবেন।');
        }

        // Check if regular user account is pending admin approval
        // Check for isApproved === false or undefined/not approved
        const isUserApproved = profileData.role === 'admin' || profileData.isApproved === true;
        if (!isUserApproved) {
          setPendingProfile(profileData);
          setShowVerification(true);
          setError('');
          setLoading(false);
          return;
        }

        localStorage.setItem('demo_session', JSON.stringify({ user: profileData, profile: profileData }));
        onLogin(profileData, profileData);
      } else {
        // Check WhatsApp validity strictly
        const phoneValidation = validateOriginalWhatsApp(whatsapp);
        if (!phoneValidation.isValid) {
          throw new Error(phoneValidation.error || 'সঠিক হোয়াটসঅ্যাপ নম্বর দিন');
        }

        const cleanEmail = email.trim().toLowerCase();
        const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          throw new Error('This email is already in use. Please use a different email.');
        }

        // Create a new user profile in Firestore with pending approval
        const newUserId = doc(collection(db, 'users')).id;
        const shortId = Math.floor(100000 + Math.random() * 900000).toString();
        const newProfile = {
          uid: newUserId,
          userId: shortId,
          email: cleanEmail,
          password: password,
          whatsapp: phoneValidation.formatted,
          displayName: cleanEmail.split('@')[0] || 'User',
          photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanEmail.split('@')[0] || 'User')}&background=random`,
          role: 'user',
          balance: 0,
          isPremium: false,
          isVerified: false,
          isApproved: false, // Must be approved by admin in Admin Panel
          createdAt: new Date()
        };

        // Immediately persist to Firestore so it shows up in Admin Panel "ইউজার অ্যাপ্রুভ" tab!
        await setDoc(doc(db, 'users', newUserId), newProfile);

        setPendingProfile(newProfile);
        setShowVerification(true);
        setLoading(false);

        // Auto trigger WhatsApp message to admin with the requested text format
        const waMsg = `Hello, I want to activate my account. My email: ${newProfile.email} User ID: ${newProfile.userId}`;
        const waUrl = `https://wa.me/${getAdminVerificationPhone()}?text=${encodeURIComponent(waMsg)}`;
        try {
          window.open(waUrl, '_blank');
        } catch {
          // If popup is blocked, the user can click the button
        }
      }
    } catch (err: any) {
      console.error('Simulated Auth error:', err);
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
      >
        <div className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="flex flex-col items-center justify-center mx-auto mb-6">
              <Logo className="w-16 h-16 mb-2" src={globalSettings.logoUrl} />
              <div className="flex flex-col items-center text-center">
                <span className="text-2xl font-black tracking-tight text-slate-900 leading-none mt-1">{globalSettings.siteName || 'ALL SERVICES'}</span>
                <span className="text-xs font-bold tracking-widest text-slate-500 uppercase mt-1">{globalSettings.siteDescription || 'PLATFORM'}</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {showVerification && pendingProfile
                ? 'অ্যাকাউন্ট স্ট্যাটাস'
                : (isAdminRoute ? 'Admin Panel' : (isLogin ? 'Welcome' : 'Create Account'))}
            </h1>
            <p className="text-sm text-slate-500">
              {showVerification && pendingProfile
                ? 'অ্যাকাউন্ট অনুমোদন তথ্য ও নির্দেশনাবলী'
                : (isAdminRoute ? 'Login to Admin Panel' : (isLogin ? 'Login to your account' : 'Provide information to create a new account'))}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          {showVerification && pendingProfile ? (
            <div className="space-y-4 text-center">
              {/* Notice Card with exact user requested text */}
              <div className="p-5 bg-amber-50 border-2 border-amber-300 rounded-2xl text-amber-950 text-left space-y-3 shadow-md">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-base">
                  <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 animate-spin" />
                  <span>অ্যাকাউন্ট পেন্ডিং রয়েছে</span>
                </div>
                
                {/* User's verbatim requested message */}
                <div className="p-3.5 bg-amber-100/90 border border-amber-300 rounded-xl text-amber-900 font-bold text-sm leading-relaxed">
                  অ্যাকাউন্ট পেন্ডিং রয়েছে, সেক্ষেত্রে আপনার সাইটটি ডেক্সটপে সেভ করে রাখুন বা মোবাইল ফোনে অ্যাপস নামিয়ে রাখুন।
                </div>

                <p className="text-xs text-amber-800 leading-relaxed font-medium">
                  অ্যাডমিন আপনার অ্যাকাউন্ট অনুমোদন (Approve) করার সাথে সাথে আপনি সরাসরি লগইন করতে পারবেন।
                </p>

                {/* Specific instructions requested by the user */}
                <div className="bg-white p-3.5 rounded-xl border border-amber-200 space-y-3 text-xs text-slate-700 shadow-sm">
                  <div className="flex items-start gap-2.5">
                    <Monitor className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-indigo-900">ডেস্কটপ ব্যবহারকারী:</span>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        সাইটটি পরবর্তীতে সহজে পাওয়ার জন্য <strong className="text-slate-900">ডেক্সটপে সেভ করে রাখুন</strong> অথবা বুকমার্ক করুন (<kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-mono">Ctrl + D</kbd>)।
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-2.5 flex items-start gap-2.5">
                    <Smartphone className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div className="w-full">
                      <span className="font-bold text-emerald-900">মোবাইল ফোন ব্যবহারকারী:</span>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        <strong className="text-slate-900">মোবাইল ফোন এ অ্যাপস নামিয়ে রাখুন</strong> যাতে সহজে যেকোনো সময় ব্যবহার করতে পারেন।
                      </p>
                      {globalSettings?.apkLink && (
                        <a
                          href={globalSettings.apkLink}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>অ্যাপস ডাউনলোড করুন (APK)</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* User Credentials Summary */}
                <div className="bg-white/80 p-3 rounded-xl border border-amber-200 text-xs space-y-1.5 font-mono">
                  <p className="flex justify-between items-center">
                    <span className="text-slate-600 font-sans">ইমেইল:</span>
                    <span className="font-bold text-slate-900">{pendingProfile.email}</span>
                  </p>
                  <p className="flex justify-between items-center">
                    <span className="text-slate-600 font-sans">ইউজার আইডি:</span>
                    <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">{pendingProfile.userId}</span>
                  </p>
                  <p className="flex justify-between items-center">
                    <span className="text-slate-600 font-sans">হোয়াটসঅ্যাপ:</span>
                    <span className="font-bold text-slate-900">{pendingProfile.whatsapp}</span>
                  </p>
                </div>
              </div>

              {/* WhatsApp Activation Button */}
              <a
                href={`https://wa.me/${getAdminVerificationPhone()}?text=${encodeURIComponent(`Hello, I want to activate my account. My email: ${pendingProfile.email} User ID: ${pendingProfile.userId}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 text-sm active:scale-95"
              >
                <MessageSquare className="w-4 h-4" />
                <span>অ্যাকাউন্ট চালু করতে অ্যাডমিনকে মেসেজ দিন</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  setIsLogin(true);
                  setShowVerification(false);
                  setError('');
                }}
                className="text-xs text-slate-500 hover:text-indigo-600 transition-colors block w-full text-center pt-1"
              >
                লগইন ফর্মে ফিরে যান
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">{isAdminRoute ? 'Email' : 'Email Address'}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    value={email || ''}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder={isAdminRoute ? "secure.node.admin@gmail.com" : "you@example.com"}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">{isAdminRoute ? 'Password' : 'Password'}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password || ''}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-12 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {!isLogin && !isAdminRoute && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-slate-700">হোয়াটসঅ্যাপ নম্বর (WhatsApp Number)</label>
                    <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">অরিজিনাল নম্বর আবশ্যক</span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </div>
                    <input
                      type="tel"
                      value={whatsapp || ''}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="017XXXXXXXX"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">১১ ডিজিটের সঠিক হোয়াটসঅ্যাপ নম্বর লিখুন। অনুমোদন কনফার্মেশন এই নম্বরে যাবে।</p>
                </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className={`w-full py-3.5 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed ${isAdminRoute ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/25' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/25'}`}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {isAdminRoute ? null : <LogIn className="w-5 h-5" />}
                    {isAdminRoute ? 'Login' : (isLogin ? 'Login' : 'Sign Up')}
                  </>
                )}
              </button>
            </form>
          )}

          {!isAdminRoute && !showVerification && (
             <div className="text-center pt-2 space-y-4 border-t border-slate-100">
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                className="text-sm text-slate-500 hover:text-indigo-600 transition-colors block w-full"
              >
                {isLogin ? "No account? Sign up" : "Already have an account? Login"}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

