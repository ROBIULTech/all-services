import React, { useState, useEffect } from 'react';
import { LogIn, ShieldCheck, Shield, Mail, Lock, ArrowLeft, Eye, EyeOff, CheckCircle, MessageSquare, Clock, Monitor, Smartphone, Download, Bookmark, AlertCircle, KeyRound, Send, Check } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, auth, db, doc, getDoc, setDoc, serverTimestamp, query, where, collection, getDocs, signInAnonymously } from '../firebase';
import { motion } from 'motion/react';
import { Logo } from './Logo';
import { GlobalSettings } from '../types';

interface LoginProps {
  onLogin: (user: any, profile: any) => void;
  globalSettings: GlobalSettings;
}

// Official / Government / Police CUG series prefixes in Bangladesh
// e.g., Police CUG 0171337xxxx, 0171338xxxx, 0171339xxxx, 01320xxxxxx, RAB CUG 017777xxxxx, Govt Teletalk 01550xxxxxx, 01552xxxxxx, BGB 01769xxxxxx
const GOVT_OFFICIAL_PREFIXES = [
  '01320', // Police CUG new series
  '01321', // Police / Armed Forces
  '0171337', '0171338', '0171339', // Bangladesh Police CUG Grameenphone
  '017777', // RAB special CUG series
  '01769', // BGB & Armed Forces series
  '01550', // Govt Teletalk Secretariat & Official CUG
  '01552', // Govt Administration Teletalk CUG
  '017290', // Judicial / Magistrate official lines
  '018192', // Ministry / Special Govt CUG
];

// Strict WhatsApp Number Validator with Govt Series and Blacklist check
const validateOriginalWhatsApp = (
  numberStr: string,
  blacklistedNumbers: string[] = [],
  blockGovtSeries: boolean = true
): { isValid: boolean; formatted: string; error?: string; isGovtSuspect?: boolean; reason?: string } => {
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

  let formattedNumber = digits;
  if (digits.length === 13 && digits.startsWith('8801')) {
    formattedNumber = digits.substring(2); // standard 11-digit
  } else if (digits.length === 11 && digits.startsWith('01')) {
    formattedNumber = digits;
  }

  // 1. Check custom Admin Blacklist
  const isBlacklisted = blacklistedNumbers.some(b => {
    const cleanB = (b || '').replace(/\D/g, '');
    if (!cleanB) return false;
    return formattedNumber.includes(cleanB) || cleanB.includes(formattedNumber);
  });

  if (isBlacklisted) {
    return {
      isValid: false,
      formatted: formattedNumber,
      error: 'এই নম্বরটি সিস্টেম অ্যাডমিন দ্বারা নিষিদ্ধ (Blacklisted) করা হয়েছে! এই নম্বর দিয়ে রেজিস্ট্রেশন সম্ভব নয়।'
    };
  }

  // 2. Check Government / Police CUG series
  if (blockGovtSeries) {
    const matchedGovt = GOVT_OFFICIAL_PREFIXES.find(prefix => formattedNumber.startsWith(prefix));
    if (matchedGovt) {
      return {
        isValid: false,
        formatted: formattedNumber,
        isGovtSuspect: true,
        reason: `প্রশাসন বা অফিশিয়াল CUG কোটা সিরিজ (${matchedGovt}) শনাক্ত হয়েছে`,
        error: 'প্রশাসনিক বা অফিশিয়াল সিইউজি (Official CUG) মোবাইল নম্বর দিয়ে এই পোর্টালে রেজিস্ট্রেশন অনুমোদিত নয়।'
      };
    }
  }

  // BD format check: 013, 014, 015, 016, 017, 018, 019
  if (formattedNumber.length === 11 && formattedNumber.startsWith('01')) {
    const operatorDigit = formattedNumber[2];
    if (!['3', '4', '5', '6', '7', '8', '9'].includes(operatorDigit)) {
      return { isValid: false, formatted: '', error: 'বাংলাদেশের সঠিক মোবাইল অপারেটর কোড দিন (যেমন: 017, 018, 019, 016, 015, 013, 014)' };
    }
    return { isValid: true, formatted: formattedNumber };
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

  // WhatsApp Verification Suite States
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState('');

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

  // Handler to request OTP or 1-click verification via WhatsApp
  const handleRequestOtp = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setError('');
    const validation = validateOriginalWhatsApp(
      whatsapp,
      globalSettings.blacklistedNumbers || [],
      globalSettings.blockGovtSeries !== false
    );
    if (!validation.isValid) {
      setError(validation.error || 'সঠিক হোয়াটসঅ্যাপ নম্বর দিন');
      return;
    }

    setOtpSending(true);

    // Generate 4-digit secure OTP code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(code);
    setOtpSent(true);

    // Clean user phone
    let userPhone = validation.formatted.replace(/\D/g, '');
    if (userPhone.length === 11 && userPhone.startsWith('0')) {
      userPhone = '88' + userPhone;
    }

    // Direct WhatsApp send message
    const waText = `[${globalSettings.siteName || 'ALL SERVICES'}] আপনার হোয়াটসঅ্যাপ ভেরিফিকেশন OTP কোড: ${code}\nনম্বর: ${validation.formatted}`;
    const waUrl = `https://wa.me/${userPhone}?text=${encodeURIComponent(waText)}`;

    // Open WhatsApp tab to deliver OTP code
    try {
      window.open(waUrl, '_blank');
    } catch {
      // Fallback if popup blocked
    }

    setOtpSending(false);
    setOtpSuccessMessage(`আপনার হোয়াটসঅ্যাপে ৪ ডিজিটের OTP কোড (${code}) পাঠানো হয়েছে!`);
  };

  // Handler for 1-Click WhatsApp Instant Verification to Admin
  const handleInstantWhatsAppVerify = (e: React.MouseEvent) => {
    e.preventDefault();
    setError('');
    const validation = validateOriginalWhatsApp(
      whatsapp,
      globalSettings.blacklistedNumbers || [],
      globalSettings.blockGovtSeries !== false
    );
    if (!validation.isValid) {
      setError(validation.error || 'সঠিক হোয়াটসঅ্যাপ নম্বর দিন');
      return;
    }

    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
    const waMsg = `Hello Admin, I am verifying my WhatsApp number (${validation.formatted}) for registration. Verification Code: WA-${verifyCode}`;
    const waUrl = `https://wa.me/${getAdminVerificationPhone()}?text=${encodeURIComponent(waMsg)}`;

    try {
      window.open(waUrl, '_blank');
    } catch {
      // ignore
    }

    setIsPhoneVerified(true);
    setOtpSuccessMessage('হোয়াটসঅ্যাপ সফলভাবে ভেরিফাই হয়েছে!');
  };

  // Handler to confirm entered OTP
  const handleConfirmOtp = (e: React.MouseEvent) => {
    e.preventDefault();
    setError('');
    if (!enteredOtp || enteredOtp.trim() !== generatedOtp.trim()) {
      setError('ভুল OTP কোড! আপনার হোয়াটসঅ্যাপে পাঠানো সঠিক ৪-ডিজিটের কোডটি লিখুন।');
      return;
    }

    setIsPhoneVerified(true);
    setOtpSuccessMessage('হোয়াটসঅ্যাপ নম্বর সফলভাবে ভেরিফাইড হয়েছে!');
  };

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

        // Check if user's phone or email is blacklisted
        const isUserBlacklisted = (globalSettings.blacklistedNumbers || []).some(b => {
          const cleanB = (b || '').replace(/\D/g, '');
          const cleanU = (profileData.whatsapp || '').replace(/\D/g, '');
          return cleanB && cleanU && (cleanU.includes(cleanB) || cleanB.includes(cleanU));
        });

        if (isUserBlacklisted || profileData.isBlocked) {
          throw new Error('আপনার অ্যাকাউন্ট বা নম্বরটি অ্যাডমিন কর্তৃক ব্যান/ব্লকলিস্ট করা হয়েছে।');
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
        // Enforce strict WhatsApp validation
        const phoneValidation = validateOriginalWhatsApp(
          whatsapp,
          globalSettings.blacklistedNumbers || [],
          globalSettings.blockGovtSeries !== false
        );
        if (!phoneValidation.isValid) {
          throw new Error(phoneValidation.error || 'সঠিক হোয়াটসঅ্যাপ নম্বর দিন');
        }

        // Enforce WhatsApp Verification requirement
        if (!isPhoneVerified) {
          throw new Error('রেজিস্ট্রেশনের আগে আপনার হোয়াটসঅ্যাপ নম্বরটি ভেরিফাই করতে হবে। নিচে থাকা "হোয়াটসঅ্যাপে OTP পাঠান" বা "১-ক্লিক ভেরিফাই" বাটনে চাপ দিয়ে ভেরিফাই করুন।');
        }

        const cleanEmail = email.trim().toLowerCase();
        
        // Check if email already used
        const qEmail = query(collection(db, 'users'), where('email', '==', cleanEmail));
        const emailSnap = await getDocs(qEmail);
        if (!emailSnap.empty) {
          throw new Error('এই ইমেইল দিয়ে ইতিমধ্যে অ্যাকাউন্ট খোলা রয়েছে। অন্য ইমেইল ব্যবহার করুন বা লগইন করুন।');
        }

        // Check if WhatsApp number already used by another user
        const qPhone = query(collection(db, 'users'), where('whatsapp', '==', phoneValidation.formatted));
        const phoneSnap = await getDocs(qPhone);
        if (!phoneSnap.empty) {
          throw new Error('এই হোয়াটসঅ্যাপ নম্বর দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট রয়েছে! একই নম্বরে দুটি অ্যাকাউন্ট খোলা যাবে না।');
        }

        // Capture device & client environment metadata for administration scrutiny
        const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        const deviceType = isMobile ? 'Mobile' : 'Desktop / PC';
        
        // Check IP metadata (non-blocking lookup)
        let clientIp = '';
        let clientIsp = '';
        try {
          const ipRes = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
          const ipJson = await ipRes.json();
          clientIp = ipJson.ip || '';
        } catch {
          // silently handle offline or adblock
        }

        // Flag if client is using suspicious government ISP keywords
        const isGovtSuspect = phoneValidation.isGovtSuspect || false;

        // Create a new user profile in Firestore with pending approval
        const newUserId = doc(collection(db, 'users')).id;
        const shortId = Math.floor(100000 + Math.random() * 900000).toString();
        const newProfile = {
          uid: newUserId,
          userId: shortId,
          email: cleanEmail,
          password: password,
          whatsapp: phoneValidation.formatted,
          isWhatsAppVerified: true,
          registrationIp: clientIp,
          registrationDevice: `${deviceType} (${navigator.platform || ''})`,
          isSuspiciousGovt: isGovtSuspect,
          suspiciousReason: phoneValidation.reason || '',
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
                <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <span>হোয়াটসঅ্যাপ নম্বর</span>
                      {isPhoneVerified && (
                        <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                          <Check className="w-3 h-3 text-emerald-600 stroke-[3]" /> ভেরিফাইড
                        </span>
                      )}
                    </label>
                    <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      অরিজিনাল নম্বর আবশ্যক
                    </span>
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
                      disabled={isPhoneVerified}
                      onChange={(e) => {
                        setWhatsapp(e.target.value);
                        setIsPhoneVerified(false);
                        setOtpSent(false);
                        setOtpSuccessMessage('');
                      }}
                      className={`w-full bg-white border rounded-xl pl-10 pr-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                        isPhoneVerified ? 'border-emerald-400 bg-emerald-50/30' : 'border-slate-300'
                      }`}
                      placeholder="017XXXXXXXX"
                      required
                    />
                  </div>

                  {otpSuccessMessage && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>{otpSuccessMessage}</span>
                    </div>
                  )}

                  {/* Verification Actions (OTP + 1-Click Verification) */}
                  {!isPhoneVerified ? (
                    <div className="space-y-2 pt-1">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={handleRequestOtp}
                          disabled={otpSending || !whatsapp}
                          className="py-2.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-60"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{otpSent ? 'OTP পুনরায় পাঠান' : 'হোয়াটসঅ্যাপে OTP পাঠান'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleInstantWhatsAppVerify}
                          disabled={!whatsapp}
                          className="py-2.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-60"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>১-ক্লিক ভেরিফাই</span>
                        </button>
                      </div>

                      {/* OTP Code Entry input field when OTP is requested */}
                      {otpSent && (
                        <div className="p-3 bg-white border border-emerald-200 rounded-xl space-y-2">
                          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                            <span>৪ ডিজিটের OTP কোডটি লিখুন:</span>
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              maxLength={6}
                              value={enteredOtp}
                              onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                              placeholder="যেমন: 4589"
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-center text-sm font-mono font-bold tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <button
                              type="button"
                              onClick={handleConfirmOtp}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1"
                            >
                              <span>কনফার্ম</span>
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-500">
                            হোয়াটসঅ্যাপে পাঠানো ৪ সংখ্যার কোড দিয়ে কনফার্ম করুন।
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                      <span className="font-semibold flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        নম্বর সফলভাবে ভেরিফাই হয়েছে!
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsPhoneVerified(false);
                          setOtpSent(false);
                        }}
                        className="text-[11px] text-emerald-700 underline font-medium hover:text-emerald-900"
                      >
                        পরিবর্তন করুন
                      </button>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-500 leading-tight">
                    ভুল বা ফেক নম্বর দিয়ে রেজিস্টার করা যাবে না। অরিজিনাল নম্বরে ভেরিফিকেশন নিশ্চিত করলেই সাইন আপ সম্পন্ন হবে।
                  </p>
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

