import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import bwipjs from 'bwip-js';
import { 
  LayoutDashboard, 
  Users, 
  ShoppingBag, 
  Settings, 
  Bell, 
  Search, 
  Menu, 
  X, 
  TrendingUp, 
  DollarSign, 
  Package, 
  ArrowUpRight, 
  ArrowDownRight,
  LogOut,
  ChevronRight,
  MoreVertical,
  FileText,
  CreditCard,
  Server,
  ShieldCheck,
  MapPin,
  Baby,
  PhoneCall,
  Hash,
  Key,
  Info,
  Smartphone,
  Globe,
  HeartHandshake,
  FileSearch,
  Stethoscope,
  GraduationCap,
  UserCheck,
  Zap,
  AlertTriangle,
  Landmark,
  LogIn,
  History,
  Wallet,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Send,
  LayoutGrid,
  User
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc,
  serverTimestamp,
  getDocs,
  FirebaseUser,
  Timestamp,
  writeBatch
} from './firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email || undefined,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Mock Data
const salesData = [
  { name: 'Jan', sales: 4000, revenue: 2400 },
  { name: 'Feb', sales: 3000, revenue: 1398 },
  { name: 'Mar', sales: 2000, revenue: 9800 },
  { name: 'Apr', sales: 2780, revenue: 3908 },
  { name: 'May', sales: 1890, revenue: 4800 },
  { name: 'Jun', sales: 2390, revenue: 3800 },
  { name: 'Jul', sales: 3490, revenue: 4300 },
];

const recentUsers = [
  { id: 1, name: 'Sarah Johnson', email: 'sarah@example.com', role: 'Admin', status: 'Active', avatar: 'https://picsum.photos/seed/sarah/40/40' },
  { id: 2, name: 'Michael Chen', email: 'michael@example.com', role: 'Editor', status: 'Inactive', avatar: 'https://picsum.photos/seed/michael/40/40' },
  { id: 3, name: 'Emma Wilson', email: 'emma@example.com', role: 'User', status: 'Active', avatar: 'https://picsum.photos/seed/emma/40/40' },
  { id: 4, name: 'David Smith', email: 'david@example.com', role: 'User', status: 'Active', avatar: 'https://picsum.photos/seed/david/40/40' },
];

const stats = [
  { label: 'Total Revenue', value: '$45,231.89', change: '+20.1%', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  { label: 'Subscriptions', value: '+2,350', change: '+180.1%', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
  { label: 'Sales', value: '+12,234', change: '+19%', icon: ShoppingBag, color: 'text-purple-600', bg: 'bg-purple-100' },
  { label: 'Active Now', value: '+573', change: '+201', icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-100' },
];

import { UserProfile, Order, Product, GlobalSettings, TrashItem } from './types';
import { Login } from './components/Login';
import UserPanel from './components/UserPanel';
import AdminPanel from './components/AdminPanel';

const initialProducts: Product[] = [
  { id: 1, titleBn: 'সাইন কপি অর্ডার', titleEn: 'Sign Copy Order', category: 'NID', icon: FileText, color: 'bg-blue-500', price: 40, isActive: true, options: [{ name: 'FORM_NO', price: 40 }, { name: 'NID_NO', price: 40 }, { name: 'VOTER_NO', price: 40 }, { name: 'BIRTH_NO', price: 40 }], defaultData: `এনআইডি নম্বর:
জন্ম তারিখ:
ভোটার নম্বর (যদি থাকে):` },
  { id: 2, titleBn: 'এনআইডি কপি অর্ডার', titleEn: 'NID Copy Order', category: 'NID', icon: CreditCard, color: 'bg-indigo-500', price: 50, isActive: true, options: [{ name: 'FORM_NO', price: 50 }, { name: 'NID_NO', price: 50 }, { name: 'VOTER_NO', price: 50 }, { name: 'BIRTH_NO', price: 50 }], defaultData: `এনআইডি নম্বর:
জন্ম তারিখ:` },
  { id: 3, titleBn: 'অফিসিয়াল সার্ভার কপি', titleEn: 'Official Server Copy', category: 'Server', icon: Server, color: 'bg-slate-700', price: 80, isActive: true, options: [{ name: 'FORM_NO', price: 80 }, { name: 'NID_NO', price: 80 }, { name: 'VOTER_NO', price: 80 }, { name: 'BIRTH_NO', price: 80 }], defaultData: `এনআইডি নম্বর:
জন্ম তারিখ:` },
  { id: 4, titleBn: 'টিন সার্টিফিকেট অর্ডার করুন', titleEn: 'TIN Certificate Order', category: 'Tax', icon: FileText, color: 'bg-orange-500', price: 100, isActive: true },
  { id: 5, titleBn: 'বায়োমেট্রিক অর্ডার', titleEn: 'Biometric Order', category: 'Biometric', icon: ShieldCheck, color: 'bg-pink-500', price: 200, isActive: true, options: [{ name: 'Grameenphone', price: 100 }, { name: 'Banglalink', price: 100 }, { name: 'Robi', price: 100 }, { name: 'Airtel', price: 100 }, { name: 'Teletalk', price: 100 }], defaultData: `নাম:
এনআইডি নম্বর:
মোবাইল নম্বর:
অপারেটর:
পিতার নাম:
মাতার নাম:` },
  { id: 6, titleBn: 'লোকেশন অর্ডার', titleEn: 'Location Order', category: 'Location', icon: MapPin, color: 'bg-slate-800', price: 300, isActive: true },
  { id: 7, titleBn: 'নতুন জন্ম নিবন্ধন', titleEn: 'New Birth Registration', category: 'Government', icon: Baby, color: 'bg-cyan-500', price: 1200, isActive: true, options: [{ name: 'মিনিস্ট্রি', price: 1200 }], defaultData: `• Name (English):*
• পিতার নাম (বাংলা):*
• Father's Name:*
• মাতার নাম (বাংলা):*
• Mother's Name:*
• জন্মতারিখ:*
• Date of Birth:*
• লিঙ্গ:*
• জন্মস্থান (বাংলা):*
• জন্মস্থান (ইংরেজি):*
• স্থায়ী ঠিকানা (বাংলা):*
• স্থায়ী ঠিকানা (ইংরেজি):*
• বর্তমান ঠিকানা (বাংলা):*
• বর্তমান ঠিকানা (ইংরেজি):*` },
  { id: 8, titleBn: 'কললিস্ট অর্ডার', titleEn: 'Call List Order', category: 'Biometric', icon: PhoneCall, color: 'bg-orange-600', price: 750, isActive: true, options: [{ name: '৩ মাস কল লিস্ট', price: 750 }, { name: '৬ মাস কল লিস্ট', price: 1200 }], defaultData: `কললিস্ট এর কাজের ফরমেট* ↩️
✅ তার এক কপি ছবি

⚠️নামঃ
⚠️পিতার নাম:
⚠️মাতার নামঃ 
⚠️গ্রামঃ
⚠️ইউনিয়নঃ 
⚠️উপ উপজেলাঃ 
⚠️জেলাঃ
⚠️বিভাগঃ
⚠️কত সালে ভোটার হয়েছেঃ
⚠️জন্ম নিবন্ধন নাম্বার -(যদি থাকে) 
*🚫সাথে ভোটার হওয়া ১জনের আইডিঃ* যদি থাকে` },
  { id: 9, titleBn: 'NID টু অল নাম্বার অর্ডার', titleEn: 'NID to All Number', category: 'NID', icon: Hash, color: 'bg-indigo-600', price: 500, isActive: true },
  { id: 10, titleBn: 'Nid ইউজার পাসওয়ার্ড চেঞ্জ', titleEn: 'NID Password Change', category: 'NID', icon: Key, color: 'bg-pink-600', price: 220, isActive: true },
  { id: 11, titleBn: 'নাম ঠিকানা NID', titleEn: 'Name Address NID', category: 'NID', icon: UserCheck, color: 'bg-blue-600', price: 350, isActive: true },
  { id: 12, titleBn: 'INFO অর্ডার', titleEn: 'INFO Order', category: 'Biometric', icon: Info, color: 'bg-sky-500', price: 1150, isActive: true, options: [{ name: 'Bkash', price: 900 }, { name: 'Nagad', price: 1150 }, { name: 'Bkash Agent', price: 950 }, { name: 'BKash Merchant', price: 1000 }], defaultData: `নাম:
মোবাইল নম্বর:
তথ্য যা প্রয়োজন:
এনআইডি নম্বর (যদি থাকে):` },
  { id: 13, titleBn: 'অরজিনাল স্মার্ট কার্ড অর্ডার', titleEn: 'Original Smart Card Order', category: 'NID', icon: Smartphone, color: 'bg-blue-700', price: 3800, isActive: true, options: [{ name: 'নতুন স্মার্ট কার্ড প্রিন্ট', price: 3300 }, { name: 'রি-প্রিন্ট স্মার্ট কার্ড', price: 3800 }], defaultData: `স্মার্ট কার্ড তথ্য প্রদান করুন:
Name:
NID:
DOB:
আপনার হোয়াটসঅ্যাপ নাম্বার:

সুন্দরবন কুরিয়ার ঠিকানা:
কুরিয়ার ঠিকানা দিন
Received নাম:
Received নাম্বার:
জেলা:
থানা:
ইউনিয়ন:` },
  { id: 14, titleBn: 'পাসপোর্ট SB কপি', titleEn: 'Passport SB Copy', category: 'Passport', icon: Globe, color: 'bg-indigo-700', price: 800, isActive: true, options: [{ name: 'MRP Passport SB Copy', price: 500 }, { name: 'E Passport SB Copy', price: 800 }], defaultData: `পাসপোর্ট নম্বর:
এনআইডি নম্বর:
নাম:` },
  { id: 15, titleBn: 'পাসপোর্ট মূল কপি', titleEn: 'Passport Main Copy', category: 'Passport', icon: Globe, color: 'bg-sky-700', price: 1200, isActive: true, options: [{ name: 'MRP Passport Main Copy', price: 1000 }, { name: 'E Passport Main Copy', price: 1200 }], defaultData: `পাসপোর্ট নম্বর:
এনআইডি নম্বর:
নাম:` },
  { id: 16, titleBn: 'সুুবর্ণ প্রতিবন্ধী কার্ড', titleEn: 'Disability Card', category: 'Social', icon: HeartHandshake, color: 'bg-slate-900', price: 1250, isActive: true },
  { id: 17, titleBn: 'হারিয়ে যাওয়া জন্ম সনদ', titleEn: 'Lost Birth Certificate', category: 'Government', icon: FileSearch, color: 'bg-orange-400', price: 30, isActive: true },
  { id: 18, titleBn: 'হারিয়ে যাওয়া মৃত্যু সনদ', titleEn: 'Lost Death Certificate', category: 'Government', icon: FileSearch, color: 'bg-red-500', price: 30, isActive: true },
  { id: 19, titleBn: 'নিকানাম ফর্ম', titleEn: 'Nickname Form', category: 'Certificate', icon: FileText, color: 'bg-slate-500', price: 150, isActive: true, options: [{ name: 'পিডিএফ (বাংলা)', price: 300 }, { name: 'পিডিএফ (English)', price: 300 }, { name: 'ওয়াড ফাইল (বাংলা)', price: 400 }, { name: 'ওয়াড ফাইল (English)', price: 400 }], defaultData: `নাম:
পিতার নাম:
মাতার নাম:
ঠিকানা:` },
  { id: 20, titleBn: 'পিএসসি সার্টিফিকেট ভেক্টর ফাইল', titleEn: 'PSC Certificate Vector', category: 'Certificate', icon: GraduationCap, color: 'bg-indigo-400', price: 150, isActive: true, options: [{ name: 'ভেক্টর ফাইল', price: 150 }], defaultData: `রোল নম্বর:
রেজিস্ট্রেশন নম্বর:
সাল:
বোর্ড:` },
  { id: 21, titleBn: 'ইপিআইড/শিশুদের টিকা কার্ড ভেক্টর ফাইল', titleEn: 'EPI/Vaccine Card Vector', category: 'Certificate', icon: Stethoscope, color: 'bg-blue-400', price: 150, isActive: true, options: [{ name: 'পিডিএফ', price: 150 }, { name: 'ভেক্টর ফাইল', price: 150 }], defaultData: `শিশুর নাম:
পিতার নাম:
মাতার নাম:
জন্ম তারিখ:` },
  { id: 22, titleBn: 'আন অফিসিয়াল সার্ভার কপি', titleEn: 'Unofficial Server Copy', category: 'Server', icon: Server, color: 'bg-slate-600', price: 30, isActive: true, options: [{ name: 'Server Copy Type 1', price: 30 }, { name: 'Server Copy Type 2', price: 30 }], defaultData: `এনআইডি নম্বর:
জন্ম তারিখ:` },
  { id: 23, titleBn: 'এনআইডি সংশোধন কপি', titleEn: 'NID Correction Copy', category: 'NID', icon: CreditCard, color: 'bg-indigo-400', price: 150, isActive: true },
  { id: 24, titleBn: 'পাসপোর্ট ইনফরমেশন', titleEn: 'Passport Information', category: 'Passport', icon: FileSearch, color: 'bg-teal-600', price: 500, isActive: true, options: [{ name: 'MRP Passport Information', price: 500 }, { name: 'E Passport Information', price: 500 }], defaultData: `পাসপোর্ট নম্বর:
এনআইডি নম্বর:
নাম:` },
  { id: 25, titleBn: 'টিন সাটিফিকেট সংশোধন', titleEn: 'TIN Certificate Correction', category: 'Tax', icon: FileText, color: 'bg-orange-500', price: 150, isActive: true, defaultData: `টিন নম্বর:
সংশোধন এর বিবরণ:` },
  { id: 26, titleBn: 'ট্যাক্স রিটার্ন', titleEn: 'Tax Return', category: 'Tax', icon: Landmark, color: 'bg-emerald-600', price: 500, isActive: true, requiresFileUpload: true, instructions: 'দয়া করে আপনার ট্যাক্স ফাইলটি আপলোড করুন।' },
  { id: 27, titleBn: 'টিন সার্টিফিকেট বাতিল', titleEn: 'TIN Certificate Cancellation', category: 'Tax', icon: XCircle, color: 'bg-red-500', price: 250, isActive: true, defaultData: `টিন নম্বর:
এনআইডি নম্বর:
বাতিল করার কারণ:` },
  { id: 101, titleBn: 'অটো সাইন কপি', titleEn: 'Auto Sign Copy', category: 'PREMIUM', icon: FileText, color: 'bg-orange-500', price: 60, isActive: true, defaultData: 'এনআইডি নম্বর:' },
  { id: 102, titleBn: 'তথ্য যাচাই', titleEn: 'Info Verification', category: 'PREMIUM', icon: Search, color: 'bg-emerald-500', price: 5, isActive: true, options: [{ name: 'NID/PIN', price: 5 }, { name: 'Birth (BRN)', price: 5 }, { name: 'Mobile Number', price: 5 }, { name: 'Form Number', price: 5 }], defaultData: 'নম্বর:' },
  { id: 103, titleBn: 'ছবি বের করুন', titleEn: 'Photo Extraction', category: 'PREMIUM', icon: User, color: 'bg-blue-600', price: 85, isActive: true, defaultData: 'এনআইডি নম্বর:\nজন্ম তারিখ (YYYY-MM-DD):' },
  { id: 104, titleBn: 'অটো এনআইডি', titleEn: 'Auto NID', category: 'PREMIUM', icon: CreditCard, color: 'bg-purple-600', price: 100, isActive: true, defaultData: 'এনআইডি নম্বর:\nজন্ম তারিখ (YYYY-MM-DD):' },
  { id: 105, titleBn: 'স্মার্ট ভোটার অনুসন্ধান', titleEn: 'Smart Voter Search', category: 'PREMIUM', icon: UserCheck, color: 'bg-teal-600', price: 50, isActive: true }
];

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  const [user, setUser] = useState<FirebaseUser | any | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>(initialProducts);

  useEffect(() => {
    if (userProfile?.themeColor) {
      document.documentElement.style.setProperty('--primary-color', userProfile.themeColor);
    } else {
      document.documentElement.style.setProperty('--primary-color', '#10b981');
    }
  }, [userProfile?.themeColor]);

  useEffect(() => {
    const trackSessionAndHistory = async () => {
      if (!user || loading) return;

      const uid = user.uid;
      const userAgent = navigator.userAgent;
      const ip = '103.234.203.55'; 

      let sessionId = localStorage.getItem(`sessionId_${uid}`);
      if (!sessionId) {
        sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem(`sessionId_${uid}`, sessionId);

        // Record in sessions
        try {
          await setDoc(doc(db, 'sessions', sessionId), {
            uid,
            active: true,
            userAgent,
            ip,
            createdAt: serverTimestamp(),
            lastSeen: serverTimestamp()
          });

          // Record in login history
          await addDoc(collection(db, 'login_history'), {
            uid,
            userAgent,
            ip,
            timestamp: serverTimestamp()
          });
        } catch (err) {
          console.error("Error creating session in collection 'sessions' or 'login_history':", err);
        }
      } else {
        // Update last seen
        try {
          await updateDoc(doc(db, 'sessions', sessionId), {
            lastSeen: serverTimestamp()
          });
        } catch (err) {
          // If session doc doesn't exist, recreate it
          try {
            await setDoc(doc(db, 'sessions', sessionId), {
              uid,
              active: true,
              userAgent,
              ip,
              createdAt: serverTimestamp(),
              lastSeen: serverTimestamp()
            });
          } catch (e) {
            console.error("Error updating/recreating session in collection 'sessions':", e);
          }
        }
      }

      // Listen for session inactivation
      if (sessionId) {
        const unsubSession = onSnapshot(doc(db, 'sessions', sessionId), (docSnap) => {
          if (docSnap.exists() && docSnap.data().active === false) {
            handleSignOut();
            alert('Your session has been terminated from another device.');
          }
        }, (error) => {
           console.warn('Session listener error in App.tsx (collection sessions):', error);
        });
        return unsubSession;
      }
    };

    let sessionUnsub: (() => void) | undefined;
    if (user && !loading) {
      trackSessionAndHistory().then(unsub => {
        if (typeof unsub === 'function') sessionUnsub = unsub;
      });
    }

    return () => {
      if (sessionUnsub) sessionUnsub();
    };
  }, [user, loading]);
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });
  const initializationRef = useRef({
    products: false,
    admin: false,
    settings: false
  });
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({ 
    premiumUnlockFee: 500, 
    isPremiumFeatureActive: true, 
    isServiceManagementActive: true,
    bkashNumber: '01811152997',
    nagadNumber: '',
    rocketNumber: '',
    whatsappGroupLink: '',
    isTelegramNotifyActive: false,
    isWhatsappNotifyActive: false
  });

  const updateGlobalSettings = async (updates: Partial<GlobalSettings>) => {
    try {
      const settingsRef = doc(db, 'settings', 'general');
      await setDoc(settingsRef, updates, { merge: true });
    } catch (error) {
      console.error('Error updating global settings:', error);
      alert('Failed to update settings.');
    }
  };

  const handleSignOut = async () => {
    try {
      if (user?.uid) {
        localStorage.removeItem(`sessionId_${user.uid}`);
      }
      await signOut(auth);
      localStorage.removeItem('demo_session');
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  useEffect(() => {
    // 1. Listen for global settings
    const settingsRef = doc(db, 'settings', 'general');
    const unsubSettings = onSnapshot(settingsRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as GlobalSettings;
        setGlobalSettings({
          ...data,
          premiumUnlockFee: data.premiumUnlockFee || 500,
          isPremiumFeatureActive: data.isPremiumFeatureActive ?? true,
          isServiceManagementActive: data.isServiceManagementActive ?? true,
          bkashNumber: data.bkashNumber || '',
          nagadNumber: data.nagadNumber || '',
          rocketNumber: data.rocketNumber || '',
          whatsappGroupLink: data.whatsappGroupLink || ''
        });
        initializationRef.current.settings = true;
      } else if (!initializationRef.current.settings) {
        initializationRef.current.settings = true;
        const initialSettings: GlobalSettings = { 
          premiumUnlockFee: 500, 
          isPremiumFeatureActive: true, 
          isServiceManagementActive: true,
          bkashNumber: '01811152997',
          nagadNumber: '',
          rocketNumber: '',
          whatsappGroupLink: '',
          isTelegramNotifyActive: false,
          isWhatsappNotifyActive: false
        };
        try {
          await setDoc(settingsRef, initialSettings);
          setGlobalSettings(initialSettings);
        } catch (error) {
          console.error('Error initializing settings:', error);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/general');
    });

    // 2. Auth State Listener (Real Firebase Auth)
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        // If not authenticated via Firebase, check for demo session
        const demoSession = localStorage.getItem('demo_session');
        if (demoSession) {
          const session = JSON.parse(demoSession);
          setUser(session.user);
          setUserProfile(session.profile);
        } else {
          setUser(null);
          setUserProfile(null);
        }
      }
      setLoading(false);
    });

    return () => {
      unsubSettings();
      unsubscribeAuth();
    };
  }, []);

  // 3. User Profile Real-time Sync (Crucial for Balance updates)
  useEffect(() => {
    // Current user UID can come from Firebase Auth or Demo session
    const currentUid = user?.uid || userProfile?.uid;
    if (!currentUid) return;

    console.log('Starting profile listener for:', currentUid);
    const userRef = doc(db, 'users', currentUid);
    const unsubscribeProfile = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        console.log('Profile updated from Firestore:', data.balance);
        setUserProfile(prev => {
          // Only update if balance or basic info changed to avoid unnecessary re-renders
          if (prev?.balance !== data.balance || prev?.isPremium !== data.isPremium || prev?.isBlocked !== data.isBlocked || prev?.isVerified !== data.isVerified) {
             return data;
          }
          return prev;
        });
        
        // Sync back to demo session if used
        const demoSession = localStorage.getItem('demo_session');
        if (demoSession) {
          const session = JSON.parse(demoSession);
          localStorage.setItem('demo_session', JSON.stringify({ ...session, profile: data }));
        }
      }
    }, (error) => {
      console.warn('Profile listener error:', error);
    });

    return () => unsubscribeProfile();
  }, [user?.uid, userProfile?.uid]);

  useEffect(() => {
    const bootstrapAdmin = async () => {
      // Only bootstrap once
      if (initializationRef.current.admin) return;
      
      try {
        const adminEmail = 'secure.node.admin@gmail.com';
        
        initializationRef.current.admin = true;
        const q = query(collection(db, 'users'), where('email', '==', adminEmail));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          console.log('Bootstrapping admin user...');
          const adminId = 'admin-user-id';
          const adminProfile: UserProfile = {
            uid: adminId,
            userId: '100001',
            email: adminEmail,
            password: 'X9k@Secure2004',
            displayName: 'Super Admin',
            photoURL: 'https://ui-avatars.com/api/?name=Admin&background=f97316&color=fff',
            role: 'admin',
            balance: 0,
            isPremium: true,
            createdAt: Timestamp.now()
          };
          await setDoc(doc(db, 'users', adminId), adminProfile);
          console.log('Admin user bootstrapped successfully.');
        }
      } catch (error) {
        console.error('Error bootstrapping admin:', error);
      }
    };
    // Delay bootstrap slightly to allow auth to warm up
    const timer = setTimeout(() => {
      bootstrapAdmin();
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const initializeProducts = async () => {
      if (initializationRef.current.products) return;
      initializationRef.current.products = true;

      try {
        const q = collection(db, 'products');
        const snapshot = await getDocs(q);
        const productsData: Product[] = [];
        snapshot.forEach((doc) => {
          productsData.push(doc.data() as Product);
        });
        
          const productsToSync = initialProducts.map(p => {
            const found = productsData.find(pd => pd.id === p.id);
            if (!found) return p;
            
            let needsUpdate = false;
            const updatedProduct = { ...found };

            // Sync category if it changed in initialProducts
            if (found.category !== p.category) {
              updatedProduct.category = p.category;
              needsUpdate = true;
            }

          // Sync defaultData if it's in initialProducts but missing or different in Firestore
          if (p.defaultData && found.defaultData !== p.defaultData) {
            updatedProduct.defaultData = p.defaultData;
            needsUpdate = true;
          }
          
          return needsUpdate ? updatedProduct : null;
        }).filter(p => p !== null) as Product[];
        
        if (productsToSync.length > 0) {
          const { writeBatch } = await import('firebase/firestore');
          const batch = writeBatch(db);
          for (const p of productsToSync) {
            const { icon, color, ...serializableProduct } = p;
            const productRef = doc(db, 'products', p.id.toString());
            batch.set(productRef, serializableProduct, { merge: true });
          }
          await batch.commit();
          console.log('Products synced successfully.');
        }
      } catch (err) {
        console.error('Error initializing products:', err);
      }
    };

    if (userProfile?.role === 'admin') {
      initializeProducts();
    }

    // Sync products with Firestore for everyone
    const q = collection(db, 'products');
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const firestoreProducts: Product[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as Product;
          firestoreProducts.push(data);
        });
        
        // Create a map of initial products for easy lookup of icons/colors
        const initialProductsMap = new Map(initialProducts.map(p => [p.id, p]));

        // Merge Firestore data with initialProducts to ensure icons and colors are present
        const mergedProducts: Product[] = firestoreProducts.map(fp => {
          const ip = initialProductsMap.get(fp.id);
          if (ip) {
            // Use Firestore options directly, do not merge back deleted initial options
            return { ...fp, icon: ip.icon, color: ip.color };
          }
          // For new products added via Admin Panel, provide default icon/color if missing
          return { 
            ...fp, 
            icon: fp.icon || LayoutGrid, 
            color: fp.color || 'bg-indigo-500' 
          };
        });

        // Add any initial products that are NOT in Firestore yet (though initializeProducts should handle this)
        initialProducts.forEach(ip => {
          if (!firestoreProducts.some(fp => fp.id === ip.id)) {
            mergedProducts.push(ip);
          }
        });

        setProducts(mergedProducts.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0) || a.id - b.id));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    return () => unsubscribe();
  }, [userProfile?.role]);

  useEffect(() => {
    if (!loading && userProfile?.role === 'admin') {
      const q = collection(db, 'orders');
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const ordersData: Order[] = [];
        snapshot.forEach((doc) => {
          ordersData.push({ id: doc.id, ...doc.data() } as Order);
        });
        setOrders(ordersData.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.()?.getTime() || 0;
          const dateB = b.createdAt?.toDate?.()?.getTime() || 0;
          return dateB - dateA;
        }));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      });

      const trashQ = collection(db, 'trash');
      const unsubTrash = onSnapshot(trashQ, (snapshot) => {
        const trashData: TrashItem[] = [];
        snapshot.forEach((doc) => {
          trashData.push({ id: doc.id, ...doc.data() } as TrashItem);
        });
        setTrashItems(trashData.sort((a, b) => {
          const dateA = a.deletedAt?.toDate?.()?.getTime() || 0;
          const dateB = b.deletedAt?.toDate?.()?.getTime() || 0;
          return dateB - dateA;
        }));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'trash');
      });

      return () => {
        unsubscribe();
        unsubTrash();
      };
    }
  }, [userProfile?.role, loading]);

  const updateProduct = async (id: number, updates: Partial<Product>) => {
    try {
      console.log("updateProduct called with id:", id, "updates:", updates);
      const productRef = doc(db, 'products', id.toString());
      
      // Filter out non-serializable fields and convert undefined to null
      const { icon, ...serializableUpdates } = updates;
      
      // Create a clean object for Firestore
      const cleanUpdates: any = {};
      Object.entries(serializableUpdates).forEach(([key, value]) => {
        if (value === undefined) {
          cleanUpdates[key] = null;
        } else {
          // Deep clean if it's an object/array (optional but good practice)
          cleanUpdates[key] = value !== null ? JSON.parse(JSON.stringify(value)) : null;
        }
      });

      console.log("cleanUpdates to save:", cleanUpdates);
      await updateDoc(productRef, cleanUpdates);
      setShowSuccess(true);
    } catch (error) {
      console.error("updateProduct error:", error);
      handleFirestoreError(error, OperationType.UPDATE, `products/${id}`);
    }
  };

  const addProduct = async (productData: Omit<Product, 'id'>) => {
    try {
      // Find the highest ID to increment
      const maxId = products.length > 0 ? Math.max(...products.map(p => p.id)) : 0;
      const newId = maxId + 1;
      
      const productRef = doc(db, 'products', newId.toString());
      // Filter out non-serializable fields like 'icon'
      const { icon, ...serializableProduct } = productData as any;
      
      const cleanProduct: any = {};
      Object.entries(serializableProduct).forEach(([key, value]) => {
        if (value === undefined) {
          cleanProduct[key] = null;
        } else {
          cleanProduct[key] = value !== null ? JSON.parse(JSON.stringify(value)) : null;
        }
      });
      
      await setDoc(productRef, {
        ...cleanProduct,
        id: newId,
        isActive: true,
        createdAt: serverTimestamp()
      });
      setShowSuccess(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'products');
    }
  };

  const bulkUpdateToGlobalMarkup = async () => {
    try {
      setLoading(true);
      const batch = writeBatch(db);
      
      const mType = globalSettings?.markupType;
      const mValue = globalSettings?.markupValue;
      const isApiActive = globalSettings?.isApiResellingActive;

      products.forEach((product) => {
        const productRef = doc(db, 'products', product.id.toString());
        
        let newPrice = product.price;
        if (isApiActive && mValue) {
          if (mType === 'percentage') {
            newPrice = Math.ceil(product.price + (product.price * (mValue / 100)));
          } else {
            newPrice = product.price + mValue;
          }
        }

        // Also update options if any
        const newOptions = (product.options || []).map(opt => {
          let optPrice = opt.price;
          if (isApiActive && mValue) {
            if (mType === 'percentage') {
              optPrice = Math.ceil(opt.price + (opt.price * (mValue / 100)));
            } else {
              optPrice = opt.price + mValue;
            }
          }
          return { ...opt, price: optPrice };
        });

        batch.update(productRef, {
          price: newPrice,
          options: newOptions,
          markupType: null, // Clear individual markup to signify it's using global logic (now baked in)
          markupValue: null
        });
      });
      
      await batch.commit();
      setShowSuccess(true);
      setSuccessMessage({ 
        title: 'Bulk Update Successful', 
        message: `All ${products.length} services have been updated to fixed prices including markup.` 
      });
    } catch (error) {
      console.error('Error in bulk update:', error);
      alert('Failed to update services.');
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id: number) => {
    try {
      const productRef = doc(db, 'products', id.toString());
      await deleteDoc(productRef);
      setShowSuccess(true);
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error deleting product: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!loading && userProfile?.role === 'admin') {
      const q = collection(db, 'users');
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const usersData: UserProfile[] = [];
        snapshot.forEach((doc) => {
          usersData.push(doc.data() as UserProfile);
        });
        setAllUsers(usersData);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
      });
      return () => unsubscribe();
    }
  }, [userProfile?.role, loading]);

  const updateOrderStatus = async (orderId: string, status: Order['status'], note: string, resultFile?: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await getDoc(orderRef);
      
      if (!orderSnap.exists()) {
        throw new Error('Order not found');
      }
      
      const orderData = orderSnap.data() as Order;
      
      const updates: any = { status, note, updatedAt: serverTimestamp() };
      if (resultFile) updates.resultFile = resultFile;
      
      await updateDoc(orderRef, updates);
      
      // Handle balance refund/deduction based on status change
      if (status === 'rejected' && orderData.status !== 'rejected') {
        // Refund the user (minus 5 Taka penalty for service orders)
        const userRef = doc(db, 'users', orderData.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data() as UserProfile;
          let refundAmount = 0;
          if (orderData.price && orderData.price > 0) {
            refundAmount = orderData.price;
          }
          await updateDoc(userRef, {
            balance: (userData.balance || 0) + refundAmount
          });
        }
      } else if (status !== 'rejected' && orderData.status === 'rejected') {
        // Deduct the balance again if un-rejected
        const userRef = doc(db, 'users', orderData.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data() as UserProfile;
          let deductedAmount = 0;
          if (orderData.price && orderData.price > 0) {
            deductedAmount = orderData.price;
          }
          await updateDoc(userRef, {
            balance: (userData.balance || 0) - deductedAmount
          });
        }
      }

      setShowSuccess(true);
    } catch (error) {
      console.error('Error updating order status:', error);
      if (error instanceof Error && error.message.includes('exceeds the maximum allowed size')) {
        alert('Error: The result file is too large to be saved. Please upload a smaller file (under 750KB).');
      } else {
        alert('Error updating order status: ' + (error instanceof Error ? error.message : String(error)));
      }
    }
  };

  const deleteOrder = async (orderId: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await getDoc(orderRef);
      
      if (orderSnap.exists()) {
        const orderData = orderSnap.data() as Order;
        // Move to trash
        const trashRef = doc(db, 'trash', orderId);
        await setDoc(trashRef, {
          id: orderId,
          type: 'order',
          data: orderData,
          deletedAt: Timestamp.now()
        });
        await deleteDoc(orderRef);
        setShowSuccess(true);
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Error deleting order: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data() as UserProfile;
        
        // Fetch orders for this user
        const ordersQ = query(collection(db, 'orders'), where('uid', '==', userId));
        const ordersSnap = await getDocs(ordersQ);
        const userOrders = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Move to trash
        const trashRef = doc(db, 'trash', userId);
        await setDoc(trashRef, {
          id: userId,
          type: 'user',
          data: { ...userData, orders: userOrders }, // Include orders here
          deletedAt: Timestamp.now()
        });

        // Delete orders
        for (const order of ordersSnap.docs) {
          await deleteDoc(order.ref);
        }

        await deleteDoc(userRef);
        setShowSuccess(true);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const restoreItem = async (item: TrashItem) => {
    try {
      const collectionName = item.type === 'user' ? 'users' : item.type === 'order' ? 'orders' : 'products';
      const itemRef = doc(db, collectionName, item.id);
      await setDoc(itemRef, item.data);
      await deleteDoc(doc(db, 'trash', item.id));
      setShowSuccess(true);
    } catch (error) {
      console.error('Error restoring item:', error);
      alert('Error restoring item: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const permanentDeleteItem = async (item: TrashItem) => {
    try {
      // If it's an order and not rejected, we should probably refund now?
      // Or just delete permanently.
      if (item.type === 'order') {
        const orderData = item.data as Order;
        if (orderData.status !== 'rejected') {
          const userRef = doc(db, 'users', orderData.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data() as UserProfile;
            await updateDoc(userRef, {
              balance: (userData.balance || 0) + (orderData.price || 0)
            });
          }
        }
        await deleteDoc(doc(db, 'trash', item.id));
      } else if (item.type === 'user') {
        // Archive user instead of permanent delete
        const archiveRef = doc(db, 'archived_users', item.id);
        await setDoc(archiveRef, {
          ...item.data,
          archivedAt: Timestamp.now()
        });
        await deleteDoc(doc(db, 'trash', item.id));
      } else {
        await deleteDoc(doc(db, 'trash', item.id));
      }
      setShowSuccess(true);
    } catch (error) {
      console.error('Error permanently deleting item:', error);
      alert('Error permanently deleting item: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const updateUserProfile = async (displayName: string, photoURL: string, whatsapp: string, password?: string) => {
    if (!userProfile?.uid) return;
    try {
      const userRef = doc(db, 'users', userProfile.uid);
      const updates: any = {
        displayName,
        photoURL,
        whatsapp,
        uid: userProfile.uid,
        email: userProfile.email,
        role: userProfile.role,
        balance: userProfile.balance
      };
      if (password) updates.password = password;
      
      // Remove undefined values
      Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

      await setDoc(userRef, updates, { merge: true });
      setShowSuccess(true);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const updateUser = async (uid: string, updates: Partial<UserProfile>) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, updates);
      setShowSuccess(true);
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Error updating user: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const updateUserBalance = async (uid: string, newBalance: number) => {
    try {
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, { balance: newBalance }, { merge: true });
      setShowSuccess(true);
    } catch (error) {
      console.error('Error updating balance:', error);
    }
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAdminViewingUserPanel, setIsAdminViewingUserPanel] = useState(false);
  
  // Check for the new secure admin route
  const isAdminRoute = window.location.pathname === '/secure-node-portal-v1x9k' || window.location.pathname.startsWith('/secure-node-portal-v1x9k');

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={(userData, profileData) => {
      setUser(userData);
      setUserProfile(profileData);
      localStorage.setItem('demo_session', JSON.stringify({ user: userData, profile: profileData }));
    }} />;
  }

  if (userProfile?.role === 'user' || isAdminViewingUserPanel) {
    return (
      <div className="relative">
        {isAdminViewingUserPanel && (
          <button 
            onClick={() => setIsAdminViewingUserPanel(false)}
            className="fixed top-4 right-4 z-[100] bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            Back to Admin
          </button>
        )}
        <UserPanel 
          userProfile={userProfile!} 
          setUserProfile={setUserProfile}
          products={products} 
          globalSettings={globalSettings}
          onOrderPlaced={(order) => {
            // UserPanel handles its own success notification
          }} 
          onSignOut={handleSignOut}
          updateUserProfile={updateUserProfile}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
        />
      </div>
    );
  }

  return (
    <AdminPanel 
      userProfile={userProfile!}
      orders={orders}
      allUsers={allUsers}
      products={products}
      trashItems={trashItems}
      globalSettings={globalSettings}
      updateGlobalSettings={updateGlobalSettings}
      updateOrderStatus={updateOrderStatus}
      deleteOrder={deleteOrder}
      deleteUser={deleteUser}
      restoreItem={restoreItem}
      permanentDeleteItem={permanentDeleteItem}
      updateUserBalance={updateUserBalance}
      updateUser={updateUser}
      updateProduct={updateProduct}
      addProduct={addProduct}
      deleteProduct={deleteProduct}
      bulkUpdateToGlobalMarkup={bulkUpdateToGlobalMarkup}
      onSignOut={handleSignOut}
      isAdminViewingUserPanel={isAdminViewingUserPanel}
      setIsAdminViewingUserPanel={setIsAdminViewingUserPanel}
      updateAdminProfile={updateUserProfile}
      isSidebarOpen={isSidebarOpen}
      setIsSidebarOpen={setIsSidebarOpen}
      isDarkMode={isDarkMode}
      toggleDarkMode={toggleDarkMode}
    />
  );
}
