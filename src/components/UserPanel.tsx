import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  History, 
  Wallet, 
  Search, 
  Bell, 
  LogOut, 
  ChevronRight, 
  Zap, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Package,
  Plus,
  X,
  CheckCircle,
  Download,
  Settings,
  LogIn,
  Crown,
  Lock,
  FileText,
  ShoppingCart,
  Server,
  PhoneCall,
  Upload,
  Info,
  Tag,
  ShieldCheck,
  Edit3,
  LayoutGrid,
  Smartphone,
  CreditCard,
  UserCheck,
  MapPin,
  Globe,
  Fingerprint,
  Landmark,
  Briefcase,
  GraduationCap,
  Heart,
  HelpCircle,
  Mail,
  Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { UserProfile, Order, Product, GlobalSettings } from '../types';
import { auth, signOut, db, collection, addDoc, serverTimestamp, query, where, onSnapshot, Timestamp, doc, setDoc } from '../firebase';

interface UserPanelProps {
  userProfile: UserProfile;
  products: Product[];
  globalSettings?: GlobalSettings;
  onOrderPlaced: (order: any) => void;
  onSignOut: () => void;
  updateUserProfile?: (displayName: string, photoURL: string, whatsapp: string, password?: string) => Promise<void>;
}

const UserPanel: React.FC<UserPanelProps & { isAdmin?: boolean; onBackToAdmin?: () => void }> = ({ 
  userProfile, 
  products, 
  globalSettings,
  onOrderPlaced, 
  onSignOut,
  updateUserProfile,
  isAdmin,
  onBackToAdmin
}) => {
  const [activeTab, setActiveTab] = useState<'services' | 'history' | 'settings' | 'premium'>('services');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedOption, setSelectedOption] = useState<{name: string, price: number} | null>(null);
  const [orderData, setOrderData] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeData, setRechargeData] = useState({ amount: '', senderNumber: '', trxID: '' });
  const [orderFile, setOrderFile] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({ 
    displayName: userProfile?.displayName || '', 
    photoURL: userProfile?.photoURL || '',
    whatsapp: userProfile?.whatsapp || '',
    password: userProfile?.password || ''
  });
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const avatars = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Milo',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Lily'
  ];

  // Premium Services State
  const [autoSignNid, setAutoSignNid] = useState('');
  const [infoCategory, setInfoCategory] = useState('NID/PIN');
  const [infoNumber, setInfoNumber] = useState('');
  const [serverCopyNid, setServerCopyNid] = useState('');

  const handleUnlockPremium = async () => {
    const fee = globalSettings?.premiumUnlockFee || 500;
    if (userProfile.balance < fee) {
      alert(`Insufficient balance to unlock premium services. Please recharge ৳${fee}.`);
      return;
    }

    setIsUnlocking(true);
    try {
      const userRef = doc(db, 'users', userProfile.uid);
      await setDoc(userRef, { 
        balance: userProfile.balance - fee,
        isPremium: true
      }, { merge: true });
      
      alert('Premium Services Unlocked Successfully!');
    } catch (error) {
      console.error('Error unlocking premium:', error);
      alert('Failed to unlock premium services. Please try again.');
    } finally {
      setIsUnlocking(false);
    }
  };

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  useEffect(() => {
    if (selectedProduct && selectedProduct.options && selectedProduct.options.length > 0) {
      setSelectedOption(selectedProduct.options[0]);
    } else {
      setSelectedOption(null);
    }

    // Set default text based on product ID or defaultData
    if (selectedProduct?.defaultData && selectedProduct.defaultData.trim() !== '') {
      setOrderData(selectedProduct.defaultData);
    } else if (selectedProduct?.id === 13) {
      setOrderData(`স্মার্ট কার্ড তথ্য প্রদান করুন:
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
ইউনিয়ন:`);
    } else if (selectedProduct?.id === 8) {
      setOrderData(`কললিস্ট এর কাজের ফরমেট* ↩️
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
*🚫সাথে ভোটার হওয়া ১জনের আইডিঃ* যদি থাকে`);
    } else if (selectedProduct?.id === 11) {
      setOrderData(`*নাম ঠিকানা* এর- কাজের ফরমেট* ↩️
✅ তার এক কপি ছবি

⚠️নামঃ
⚠️স্বামী / স্ত্রীর নাম:
⚠️স্বামী / স্ত্রীর এন আইডি:
⚠️পিতার নাম:
⚠️পিতার এন আইডি:
⚠️মাতার নামঃ 
⚠️মাতার এন আইডি:

⚠️গ্রামঃ
⚠️ওয়ার্ডঃ 
⚠️ইউনিয়নঃ 
⚠️উপ উপজেলাঃ 
⚠️জেলাঃ
⚠️বিভাগঃ
⚠️কত সালে ভোটার হয়েছেঃ
⚠️জন্ম নিবন্ধন নাম্বার -(যদি থাকে) 
*🚫সাথে ভোটার হওয়া ১জনের আইডিঃ* যদি থাকে`);
    } else if (selectedProduct?.id === 7) {
      setOrderData(`📝 *ব্যক্তিগত তথ্য ফরম*  
━━━━━━━━━━
+8801811152997
এই নাম্বার এ এনআইডি গুলো সাবমিট করবেন,, 
━━━━━━━━━━

*🔹 নাম (বাংলা):*  
*🔹 Name (English):*

*🔹 পিতার নাম (বাংলা):*  
*🔹 Father's Name:*

*🔹 মাতার নাম (বাংলা):*  
*🔹 Mother's Name:*

*🔹 জন্মতারিখ:*  
*🔹 Date of Birth:*

*🔹 লিঙ্গ:*  
*🔹 সন্তানক্রমে:*  
*🔹 মোবাইল নম্বর:*

*🔹 ঠিকানা (বাংলা):*  
*🔹 ঠিকানা (English):*

*🔹 পিতার জন্মনিবন্ধন নম্বর:*  
*🔹 পিতার NID:*  
*🔹 পিতার জন্মতারিখ:*

*🔹 মাতার জন্মনিবন্ধন নম্বর:*  
*🔹 মাতার NID:*  
*🔹 মাতার জন্মতারিখ:*`);
    } else if (selectedProduct?.id === 16) {
      setOrderData(`*প্রতিবন্ধী সুবর্ণ নাগরিক কার্ড♿*

━━━━━━━━━━
নাম্বার এ ছবি আর সাইন গুলো সাবমিট করবেন,,
━━━━━━━━━━

NID/Birth certificate number:
Date of birth:

NAME ENGLISH:
নাম বাংলা:
MOTHER NAME:
মাতার নামঃ
FATHER NAME:
পিতার নামঃ 

গ্রামঃ 
ইউনিয়নঃ
উপজেলাঃ
জেলাঃ 
VILLAGE:
UNION:
UPAZILA:
DISTRICT:

*👉ঠিকানা বাংলা ইংলিশ লিখে দিবেন, ইংলিশ সব গুলো বড়ো হাতের লিখে দিবেন।*

Blood Group:
Mobile-
➡️ প্রতিবন্ধীতার ধরন: 


*ব্যক্তির ছবি, সিগনেচার স্ক্যান করে দিবেন*`);
    } else {
      setOrderData('');
    }
    setOrderFile(null);
  }, [selectedProduct]);

  const currentPrice = selectedOption ? selectedOption.price : (selectedProduct?.price || 0);

  useEffect(() => {
    if (!userProfile?.uid) return;

    const q = query(
      collection(db, 'orders'),
      where('uid', '==', userProfile.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData: Order[] = [];
      snapshot.forEach((doc) => {
        ordersData.push({ id: doc.id, ...doc.data() } as Order);
      });
      // Sort by createdAt descending
      ordersData.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.()?.getTime() || 0;
        const dateB = b.createdAt?.toDate?.()?.getTime() || 0;
        return dateB - dateA;
      });
      setOrders(ordersData);
    });

    return () => unsubscribe();
  }, [userProfile?.uid]);

  const handlePlacePremiumOrder = async (productId: number, data: string) => {
    const product = products.find(p => p.id === productId);
    if (!product || !userProfile) return;

    if (userProfile.balance < product.price) {
      alert('Insufficient balance. Please contact admin to recharge.');
      return;
    }

    setIsPlacingOrder(true);
    try {
      const newOrder = {
        uid: userProfile.uid,
        userEmail: userProfile.email,
        serviceId: product.id,
        serviceTitle: product.titleBn,
        status: 'pending',
        data: data,
        price: product.price,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'orders'), newOrder);
      
      const userRef = doc(db, 'users', userProfile.uid);
      await setDoc(userRef, {
        balance: userProfile.balance - product.price
      }, { merge: true });
      
      setShowSuccess(true);
      onOrderPlaced(newOrder);
      return true;
    } catch (error) {
      console.error('Error placing premium order:', error);
      alert('Failed to place order. Please try again.');
      return false;
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedProduct || !orderData.trim() || !userProfile) return;
    
    if (userProfile.balance < currentPrice) {
      alert('Insufficient balance. Please contact admin to recharge.');
      return;
    }

    setIsPlacingOrder(true);
    try {
      const newOrder = {
        uid: userProfile.uid,
        userEmail: userProfile.email,
        serviceId: selectedProduct.id,
        serviceTitle: selectedProduct.titleBn + (selectedOption ? ` (${selectedOption.name})` : ''),
        status: 'pending',
        data: orderData,
        fileURL: orderFile,
        price: currentPrice,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'orders'), newOrder);
      
      // Deduct balance
      const userRef = doc(db, 'users', userProfile.uid);
      await setDoc(userRef, {
        balance: userProfile.balance - currentPrice
      }, { merge: true });
      
      setSelectedProduct(null);
      setOrderData('');
      setActiveTab('history');
      setShowSuccess(true);
      onOrderPlaced(newOrder);
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const icons = {
    LayoutGrid, Smartphone, CreditCard, FileText, ShieldCheck, 
    UserCheck, MapPin, Globe, Search, Zap, Clock, Tag, 
    Fingerprint, Landmark, Briefcase, GraduationCap, Heart, 
    ShoppingCart, Settings, Bell, Info, HelpCircle, Mail, Phone
  };

  const getIcon = (product: Product) => {
    if (product.iconName && icons[product.iconName as keyof typeof icons]) {
      return icons[product.iconName as keyof typeof icons];
    }
    return product.icon || LayoutGrid;
  };

  const filteredProducts = products
    .filter(p => p.category !== 'PREMIUM')
    .filter(p => {
      const matchesSearch = 
        p.titleBn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.titleEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  const categories = ['All', ...Array.from(new Set(products.filter(p => p.category !== 'PREMIUM').map(p => p.category)))];

  const rechargeProduct = {
    id: 999,
    titleBn: 'রিচার্জ ব্যালেন্স',
    titleEn: 'Recharge Balance',
    price: 0,
    isActive: true,
    category: 'SYSTEM',
    color: 'bg-emerald-500',
    icon: Wallet
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'processing': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'completed': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'rejected': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return Clock;
      case 'processing': return Zap;
      case 'completed': return CheckCircle2;
      case 'rejected': return XCircle;
      default: return AlertTriangle;
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#1e293b] border-r border-slate-800 hidden lg:flex flex-col z-50">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Package className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">User Panel</span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('services')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium",
              activeTab === 'services' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}
          >
            <LayoutDashboard className="w-5 h-5" />
            Services
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium",
              activeTab === 'history' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}
          >
            <History className="w-5 h-5" />
            Order History
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium",
              activeTab === 'settings' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}
          >
            <Settings className="w-5 h-5" />
            Settings
          </button>
          <button 
            onClick={() => setShowRechargeModal(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-medium text-emerald-500 hover:bg-emerald-500/10"
          >
            <Wallet className="w-5 h-5" />
            Recharge Balance
          </button>
          <button 
            onClick={() => setActiveTab('premium')}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all font-medium",
              activeTab === 'premium' ? "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-lg shadow-yellow-500/20" : "text-yellow-500/70 hover:bg-slate-800 hover:text-yellow-500"
            )}
          >
            <div className="flex items-center gap-3">
              <Crown className="w-5 h-5" />
              Premium Services
            </div>
            {!userProfile.isPremium && <Lock className="w-4 h-4" />}
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <Wallet className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Balance</p>
                <p className="text-lg font-bold text-emerald-400">৳{userProfile.balance.toLocaleString()}</p>
              </div>
            </div>
            <button 
              onClick={() => setShowRechargeModal(true)}
              className="w-full py-2 bg-emerald-500/10 text-emerald-500 rounded-xl text-xs font-bold border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
            >
              Recharge Now
            </button>
          </div>
        </div>

        {globalSettings?.whatsappGroupLink && (
          <div className="p-4 border-t border-slate-800">
            <a 
              href={globalSettings.whatsappGroupLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-3 px-4 py-3 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-2xl transition-all font-bold text-sm"
            >
              <PhoneCall className="w-5 h-5" />
              Join WhatsApp Group
            </a>
          </div>
        )}

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-2xl transition-all font-medium"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64 min-h-screen">
        {/* Header */}
        <header className="h-20 bg-[#1e293b]/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search services..." 
                value={searchQuery || ''}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-12 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 lg:hidden">
              <Wallet className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-bold text-emerald-400">৳{userProfile.balance.toLocaleString()}</span>
              <button 
                onClick={() => setShowRechargeModal(true)}
                className="ml-1 p-1 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 bg-slate-800 border border-slate-700 rounded-2xl text-slate-400 hover:text-white transition-all relative"
              >
                <Bell className="w-5 h-5" />
                {orders.some(o => o.status !== 'pending') && (
                  <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-800" />
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowNotifications(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-3 w-80 bg-[#1e293b] border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                        <h3 className="font-bold">Notifications</h3>
                        <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
                          Recent
                        </span>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto">
                        {orders.length === 0 ? (
                          <div className="p-8 text-center">
                            <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-20" />
                            <p className="text-sm text-slate-500">No notifications yet</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-800">
                            {orders.slice(0, 5).map((order) => (
                              <div key={order.id} className="p-4 hover:bg-slate-800/50 transition-colors">
                                <div className="flex gap-3">
                                  <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                    order.status === 'completed' ? "bg-emerald-500/10 text-emerald-500" :
                                    order.status === 'rejected' ? "bg-red-500/10 text-red-500" :
                                    "bg-amber-500/10 text-amber-500"
                                  )}>
                                    {order.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> :
                                     order.status === 'rejected' ? <XCircle className="w-4 h-4" /> :
                                     <Clock className="w-4 h-4" />}
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-sm font-medium leading-none">
                                      {order.serviceTitle}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      Your order is <span className={cn(
                                        "font-bold",
                                        order.status === 'completed' ? "text-emerald-500" :
                                        order.status === 'rejected' ? "text-red-500" :
                                        "text-amber-500"
                                      )}>{order.status}</span>
                                    </p>
                                    <p className="text-[10px] text-slate-600">
                                      {order.createdAt?.toDate?.().toLocaleString() || 'Just now'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {orders.length > 0 && (
                        <button 
                          onClick={() => {
                            setActiveTab('history');
                            setShowNotifications(false);
                          }}
                          className="w-full p-3 text-xs text-center text-indigo-400 hover:text-indigo-300 bg-slate-800/30 font-bold transition-colors"
                        >
                          View All Orders
                        </button>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold">{userProfile.displayName}</p>
                <div className="flex flex-col items-end">
                  <p className="text-[10px] text-slate-500">{userProfile.email}</p>
                  {userProfile.whatsapp && <p className="text-[10px] text-emerald-500 font-medium">WA: {userProfile.whatsapp}</p>}
                </div>
              </div>
              <img src={userProfile.photoURL} alt="Avatar" className="w-10 h-10 rounded-2xl border-2 border-slate-800" />
            </div>
          </div>
        </header>

        <div className="p-6 lg:p-8">
          {activeTab === 'services' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
                    <LayoutGrid className="w-8 h-8 text-indigo-500" />
                    Available Services
                  </h1>
                  <p className="text-slate-400 mt-1 font-medium">Select a service to place an order</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                      type="text" 
                      placeholder="Search services..." 
                      value={searchQuery || ''}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600"
                    />
                  </div>
                  <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-2xl border border-slate-700 overflow-x-auto max-w-full custom-scrollbar">
                    {categories.map(cat => (
                      <button 
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={cn(
                          "px-4 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap",
                          selectedCategory === cat 
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                            : "text-slate-400 hover:text-white hover:bg-slate-700"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {!(globalSettings?.isServiceManagementActive ?? true) ? (
                <div className="bg-[#1e293b] rounded-3xl border border-slate-700 p-12 text-center max-w-2xl mx-auto mt-12 flex flex-col items-center justify-center gap-6">
                  <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center animate-pulse">
                    <AlertTriangle className="w-12 h-12 text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Service Maintenance</h2>
                    <p className="text-slate-400 text-lg">সাময়িক ভবে সাইটটির কাজ চলছে</p>
                  </div>
                  <div className="bg-slate-800/50 px-6 py-3 rounded-2xl border border-slate-700 text-slate-500 text-sm italic">
                    Please check back later.
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                  {/* Recharge Card */}
                  <motion.div 
                    whileHover={{ y: -5 }}
                    className="bg-[#1e293b] rounded-3xl border border-emerald-500/30 p-6 space-y-4 transition-all group relative overflow-hidden cursor-pointer hover:border-emerald-500/50"
                    onClick={() => setShowRechargeModal(true)}
                  >
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg bg-emerald-500">
                      <Wallet className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold group-hover:text-emerald-400 transition-colors">রিচার্জ ব্যালেন্স</h3>
                      <p className="text-xs text-slate-500 mt-1">Recharge Balance</p>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 text-xs font-medium">Min:</span>
                        <span className="text-lg font-bold text-emerald-400">৳100</span>
                      </div>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center transition-all bg-slate-800 group-hover:bg-emerald-600">
                        <Plus className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </motion.div>

                  {filteredProducts.map((product) => (
                  <motion.div 
                    key={product.id}
                    whileHover={product.isActive ? { y: -5 } : {}}
                    className={cn(
                      "bg-[#1e293b] rounded-3xl border border-slate-700 p-6 space-y-4 transition-all group relative overflow-hidden",
                      product.isActive ? "hover:border-indigo-500/50 cursor-pointer" : "opacity-75 cursor-not-allowed"
                    )}
                    onClick={() => product.isActive && setSelectedProduct(product)}
                  >
                    {!product.isActive && (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-4 text-center rounded-3xl">
                        <div className="bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-500/20 mb-2">
                          Temporarily Closed
                        </div>
                        <p className="text-xs text-white font-medium">কাজ বন্ধ আছে</p>
                      </div>
                    )}
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg", product.color || 'bg-indigo-600')}>
                      {(() => {
                        const Icon = getIcon(product);
                        return <Icon className="w-7 h-7 text-white" />;
                      })()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{product.category}</span>
                        {product.discountPrice && (
                          <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-lg border border-emerald-500/20">
                            OFFER
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-black group-hover:text-indigo-400 transition-colors leading-tight">{product.titleBn}</h3>
                      <p className="text-xs text-slate-500 mt-1 font-medium">{product.titleEn}</p>
                      {product.shortDescription && (
                        <p className="text-xs text-slate-400 mt-3 line-clamp-2 leading-relaxed">{product.shortDescription}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-end pt-4 border-t border-slate-800/50">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all", product.isActive ? "bg-slate-800 group-hover:bg-indigo-600 shadow-lg group-hover:shadow-indigo-500/20" : "bg-slate-800")}>
                        <ChevronRight className={cn("w-5 h-5", product.isActive ? "text-slate-500 group-hover:text-white" : "text-slate-600")} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
          
          {activeTab === 'history' && (
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Order History</h1>
                <p className="text-slate-400 mt-1">Track your service requests and their status</p>
              </div>

              <div className="bg-[#1e293b] rounded-3xl border border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-800/50 border-b border-slate-700">
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Service</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Date</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Price</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Result</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Admin Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {orders.length > 0 ? orders.map((order, i) => {
                        const StatusIcon = getStatusIcon(order.status);
                        return (
                          <tr key={order.id || i} className="hover:bg-slate-800/30 transition-colors">
                            <td className="px-6 py-4">
                              <p className="text-sm font-bold">{order.serviceTitle}</p>
                              <p className="text-[10px] text-slate-500">ID: {order.id?.slice(-6).toUpperCase()}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-slate-300">
                                {order.createdAt?.toDate?.()?.toLocaleDateString()}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {order.createdAt?.toDate?.()?.toLocaleTimeString()}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-bold text-emerald-400">৳{order.price}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider", getStatusColor(order.status))}>
                                <StatusIcon className="w-3 h-3" />
                                {order.status}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {order.resultFile ? (
                                <button 
                                  onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = order.resultFile!;
                                    
                                    // Determine extension from data URL
                                    let ext = 'pdf';
                                    if (order.resultFile?.startsWith('data:image/jpeg')) ext = 'jpg';
                                    else if (order.resultFile?.startsWith('data:image/png')) ext = 'png';
                                    else if (order.resultFile?.startsWith('data:image/webp')) ext = 'webp';
                                    
                                    link.download = `result-${order.id?.slice(-6)}.${ext}`;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                  }}
                                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-all text-[10px] font-bold uppercase"
                                >
                                  <Download className="w-3 h-3" />
                                  Download
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-600 font-bold uppercase">No File</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-xs text-slate-400 italic">
                                {order.adminNote || 'No notes yet'}
                              </p>
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-20 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <Package className="w-12 h-12 text-slate-700" />
                              <p className="text-slate-500 font-medium">No orders found</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'premium' && (
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                  <Crown className="w-8 h-8 text-yellow-500" />
                  Premium Services
                </h1>
                <p className="text-slate-400 mt-1">Exclusive services for premium members</p>
              </div>

              {!(globalSettings?.isPremiumFeatureActive ?? true) ? (
                <div className="bg-[#1e293b] rounded-3xl border border-slate-700 p-12 text-center max-w-2xl mx-auto mt-12 flex flex-col items-center justify-center gap-6">
                  <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center animate-pulse">
                    <AlertTriangle className="w-12 h-12 text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Service Maintenance</h2>
                    <p className="text-slate-400 text-lg">সাময়িক ভবে সাইটটির কাজ চলছে</p>
                  </div>
                  <div className="bg-slate-800/50 px-6 py-3 rounded-2xl border border-slate-700 text-slate-500 text-sm italic">
                    Please check back later.
                  </div>
                </div>
              ) : !userProfile.isPremium ? (
                <div className="bg-[#1e293b] rounded-3xl border border-slate-700 p-8 text-center max-w-2xl mx-auto mt-12">
                  <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Lock className="w-10 h-10 text-yellow-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-4">Unlock Premium Services</h2>
                  <p className="text-slate-400 mb-8">
                    Get access to exclusive premium services, faster processing times, and priority support. 
                    Unlock now for a one-time fee of <span className="text-emerald-400 font-bold">৳{globalSettings?.premiumUnlockFee || 500}</span>.
                  </p>
                  <button
                    onClick={handleUnlockPremium}
                    disabled={isUnlocking}
                    className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-8 py-3 rounded-xl font-bold hover:from-yellow-400 hover:to-yellow-500 transition-all shadow-lg shadow-yellow-500/20 disabled:opacity-50 flex items-center gap-2 mx-auto"
                  >
                    {isUnlocking ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Crown className="w-5 h-5" />
                        Unlock for ৳{globalSettings?.premiumUnlockFee || 500}
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {/* Auto Sign Copy Card */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden text-slate-800 shadow-sm relative">
                    {!(products.find(p => p.id === 101)?.isActive ?? true) && (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mb-3">
                          <AlertTriangle className="w-6 h-6 text-amber-500" />
                        </div>
                        <h4 className="text-white font-bold text-lg">কাজ বন্ধ আছে</h4>
                        <p className="text-slate-300 text-xs mt-1">এই সার্ভিসটি সাময়িকভাবে বন্ধ রাখা হয়েছে।</p>
                      </div>
                    )}
                    <div className="p-6 border-b border-slate-200">
                      <h3 className="text-xl font-bold text-orange-500 flex items-center gap-2">
                        <FileText className="w-6 h-6" />
                        অটো সাইন কপি
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">অরিজিনাল সাইন কপি পিডিএফ বের করুন</p>
                    </div>
                    <div className="p-6 space-y-6">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
                        <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-xs font-bold">i</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">নতুন সার্চে ৳{products.find(p => p.id === 101)?.price.toFixed(2)} কাটা হবে।</p>
                          <p className="text-xs text-slate-600">হিস্ট্রি থেকে পুনরায় দেখা সম্পূর্ণ ফ্রি!</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-700">এনআইডি নম্বর (১০, ১২ বা ১৭ ডিজিট)</label>
                        <input 
                          type="text" 
                          value={autoSignNid || ''}
                          onChange={(e) => setAutoSignNid(e.target.value)}
                          placeholder="1234567890"
                          className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-800 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                        />
                      </div>

                      <button 
                        onClick={async () => {
                          const success = await handlePlacePremiumOrder(101, `NID: ${autoSignNid}`);
                          if (success) setAutoSignNid('');
                        }}
                        disabled={!autoSignNid || isPlacingOrder || !(products.find(p => p.id === 101)?.isActive ?? true)}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <ShoppingCart className="w-5 h-5" />
                        অর্ডার করুন (৳{products.find(p => p.id === 101)?.price.toFixed(2)})
                      </button>
                    </div>
                  </div>

                  {/* Info Verification Card */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden text-slate-800 shadow-sm relative">
                    {!(products.find(p => p.id === 102)?.isActive ?? true) && (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mb-3">
                          <AlertTriangle className="w-6 h-6 text-amber-500" />
                        </div>
                        <h4 className="text-white font-bold text-lg">কাজ বন্ধ আছে</h4>
                        <p className="text-slate-300 text-xs mt-1">এই সার্ভিসটি সাময়িকভাবে বন্ধ রাখা হয়েছে।</p>
                      </div>
                    )}
                    <div className="p-6 border-b border-slate-200">
                      <h3 className="text-xl font-bold text-emerald-600 flex items-center gap-2 border-b-2 border-emerald-500 pb-2 w-fit">
                        <Search className="w-6 h-6" />
                        তথ্য যাচাই
                      </h3>
                      <p className="text-sm text-slate-500 mt-3">এনআইডি, জন্ম নিবন্ধন বা মোবাইল নম্বরের তথ্য যাচাই</p>
                    </div>
                    <div className="p-6 space-y-6">
                      <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-4 flex gap-3">
                        <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-xs font-bold italic">i</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-700">
                            প্রতিটি যাচাইয়ের জন্য ৳{(products.find(p => p.id === 102)?.options?.find((opt: any) => opt.name === infoCategory)?.price || products.find(p => p.id === 102)?.price || 0).toFixed(2)} কাটা হবে।
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-bold text-slate-700">ক্যাটাগরি</label>
                          <select 
                            value={infoCategory || ''}
                            onChange={(e) => setInfoCategory(e.target.value)}
                            className="w-full border border-emerald-500 rounded-lg px-4 py-3 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
                          >
                            {products.find(p => p.id === 102)?.options?.map((opt: any) => (
                              <option key={opt.name} value={opt.name}>{opt.name}</option>
                            )) || (
                              <>
                                <option>NID/PIN</option>
                                <option>Birth (BRN)</option>
                                <option>Mobile Number</option>
                                <option>Form Number</option>
                              </>
                            )}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-bold text-slate-700">নম্বর ইনপুট দিন</label>
                          <input 
                            type="text" 
                            value={infoNumber || ''}
                            onChange={(e) => setInfoNumber(e.target.value)}
                            placeholder="নম্বর লিখুন..."
                            className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                          />
                        </div>
                      </div>

                      <button 
                        onClick={async () => {
                          const success = await handlePlacePremiumOrder(102, `Category: ${infoCategory}\nNumber: ${infoNumber}`);
                          if (success) setInfoNumber('');
                        }}
                        disabled={!infoNumber || isPlacingOrder || !(products.find(p => p.id === 102)?.isActive ?? true)}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
                      >
                        <Search className="w-5 h-5" />
                        তথ্য যাচাই করুন (৳{(products.find(p => p.id === 102)?.options?.find((opt: any) => opt.name === infoCategory)?.price || products.find(p => p.id === 102)?.price || 0).toFixed(2)})
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto space-y-6"
            >
              <div className="bg-[#1e293b] rounded-3xl border border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-800">
                  <h2 className="text-xl font-bold">Profile Settings</h2>
                  <p className="text-sm text-slate-400 mt-1">Update your personal information</p>
                </div>
                <div className="p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <img 
                      src={profileForm.photoURL || `https://ui-avatars.com/api/?name=${profileForm.displayName || 'User'}&background=random`} 
                      alt="Profile" 
                      className="w-24 h-24 rounded-2xl object-cover border-4 border-slate-800 shadow-xl"
                    />
                    <div className="space-y-4 flex-1 w-full">
                      <label className="text-sm font-medium text-slate-400">Select Profile Picture</label>
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                        {avatars.map((avatar) => (
                          <button
                            key={avatar}
                            onClick={() => setProfileForm({ ...profileForm, photoURL: avatar })}
                            className={cn(
                              "relative w-10 h-10 rounded-xl overflow-hidden border-2 transition-all hover:scale-110",
                              profileForm.photoURL === avatar ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-slate-700 hover:border-slate-500"
                            )}
                          >
                            <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                            {profileForm.photoURL === avatar && (
                              <div className="absolute inset-0 bg-indigo-600/20 flex items-center justify-center">
                                <CheckCircle className="w-4 h-4 text-white shadow-sm" />
                              </div>
                            )}
                          </button>
                        ))}
                        <label className="relative w-10 h-10 rounded-xl overflow-hidden border-2 border-dashed border-slate-700 hover:border-indigo-500 transition-all cursor-pointer flex items-center justify-center bg-slate-900/50 hover:bg-slate-800">
                          <Upload className="w-5 h-5 text-slate-500" />
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 500 * 1024) {
                                  alert('Image size should be less than 500KB');
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setProfileForm({ ...profileForm, photoURL: reader.result as string });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-400">Display Name</label>
                      <input 
                        type="text" 
                        value={profileForm.displayName || ''}
                        onChange={(e) => setProfileForm({...profileForm, displayName: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        placeholder="Your Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-400">WhatsApp Number</label>
                      <input 
                        type="tel" 
                        value={profileForm.whatsapp || ''}
                        onChange={(e) => setProfileForm({...profileForm, whatsapp: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        placeholder="017XXXXXXXX"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-400">Password</label>
                      <input 
                        type="text" 
                        value={profileForm.password || ''}
                        onChange={(e) => setProfileForm({...profileForm, password: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        placeholder="Enter new password"
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <button 
                      onClick={() => {
                        if (updateUserProfile) {
                          updateUserProfile(profileForm.displayName, profileForm.photoURL, profileForm.whatsapp, profileForm.password);
                        }
                      }}
                      className="w-full sm:w-auto bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      Update Profile
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Order Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-[#1e293b] rounded-3xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg", selectedProduct.color || 'bg-indigo-600')}>
                    {(() => {
                      const Icon = getIcon(selectedProduct);
                      return <Icon className="w-6 h-6 text-white" />;
                    })()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{selectedProduct.titleBn}</h2>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{selectedProduct.titleEn}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedProduct(null)}
                  className="p-2 hover:bg-slate-800 rounded-xl transition-all border border-transparent hover:border-slate-700"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="p-0 flex-1 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-2">
                  {/* Left Side: Details */}
                  <div className="p-8 space-y-8 border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-800/20">
                    {selectedProduct.shortDescription && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                          <Info className="w-4 h-4" />
                          About Service
                        </h3>
                        <p className="text-slate-300 leading-relaxed">{selectedProduct.shortDescription}</p>
                      </div>
                    )}

                    {selectedProduct.fullDescription && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Full Details
                        </h3>
                        <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">{selectedProduct.fullDescription}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Delivery Time</p>
                        <div className="flex items-center gap-2 text-emerald-400">
                          <Clock className="w-4 h-4" />
                          <span className="font-bold">{selectedProduct.deliveryTime || '1-2 Hours'}</span>
                        </div>
                      </div>
                      <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Category</p>
                        <div className="flex items-center gap-2 text-indigo-400">
                          <Tag className="w-4 h-4" />
                          <span className="font-bold">{selectedProduct.category}</span>
                        </div>
                      </div>
                    </div>

                    {selectedProduct.requiredDocuments && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4" />
                          Required Documents
                        </h3>
                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
                          <ul className="space-y-2">
                            {selectedProduct.requiredDocuments.split('\n').map((doc, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                {doc}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {selectedProduct.instructions && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          Instructions
                        </h3>
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4">
                          <p className="text-sm text-slate-300 leading-relaxed">{selectedProduct.instructions}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Side: Form */}
                  <div className="p-8 space-y-6">
                    {selectedProduct.options && selectedProduct.options.length > 0 && (
                      <div className="space-y-4">
                        <label className="text-sm font-bold text-slate-400 flex items-center gap-2">
                          <LayoutGrid className="w-4 h-4" />
                          Select Option <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {selectedProduct.options.map((option) => (
                            <button
                              key={option.name}
                              onClick={() => setSelectedOption(option)}
                              className={cn(
                                "px-4 py-3 rounded-xl border text-sm font-bold transition-all text-left flex flex-col gap-1",
                                selectedOption?.name === option.name 
                                  ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20" 
                                  : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
                              )}
                            >
                              <span>{option.name}</span>
                              <span className={cn("text-xs", selectedOption?.name === option.name ? "text-indigo-200" : "text-emerald-400")}>
                                ৳{option.price}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <label className="text-sm font-bold text-slate-400 flex items-center gap-2">
                        <Edit3 className="w-4 h-4" />
                        Order Details / Data <span className="text-red-500">*</span>
                      </label>
                      <textarea 
                        value={orderData || ''}
                        onChange={(e) => setOrderData(e.target.value)}
                        placeholder={selectedProduct.defaultData ? "Fill in the template below..." : "Enter the required information for this service..."}
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-4 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all min-h-[200px] resize-none font-medium"
                      />
                    </div>

                    <div className="space-y-4">
                      <label className="text-sm font-bold text-slate-400 flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Upload Document (Optional)
                      </label>
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-slate-700 border-dashed rounded-2xl cursor-pointer bg-slate-800/50 hover:bg-slate-800 transition-all">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {orderFile ? (
                              <div className="flex items-center gap-2 text-emerald-400">
                                <CheckCircle className="w-6 h-6" />
                                <span className="text-sm font-bold">File Selected</span>
                              </div>
                            ) : (
                              <>
                                <Plus className="w-6 h-6 text-slate-500 mb-2" />
                                <p className="text-xs text-slate-500">Click to upload document</p>
                              </>
                            )}
                          </div>
                          <input 
                            type="file" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setOrderFile(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-800 bg-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6 w-full sm:w-auto">
                  <div className="flex flex-col">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Total Price</p>
                    <div className="flex items-center gap-2">
                      <p className="text-3xl font-black text-emerald-400">৳{currentPrice}</p>
                      {selectedProduct.discountPrice && (
                        <span className="text-sm text-slate-500 line-through">৳{selectedProduct.price}</span>
                      )}
                    </div>
                  </div>
                  <div className="h-10 w-px bg-slate-700 hidden sm:block" />
                  <div className="flex flex-col">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Your Balance</p>
                    <p className={cn("text-xl font-bold", userProfile.balance >= currentPrice ? "text-emerald-400" : "text-red-400")}>
                      ৳{userProfile.balance.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button 
                    onClick={() => setSelectedProduct(null)}
                    className="flex-1 sm:flex-none px-6 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold hover:bg-slate-700 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handlePlaceOrder}
                    disabled={isPlacingOrder || userProfile.balance < currentPrice || !orderData}
                    className="flex-[2] sm:flex-none px-10 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
                  >
                    {isPlacingOrder ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <ShoppingCart className="w-5 h-5" />
                        {selectedProduct.orderButtonText || 'অর্ডার করুন'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#1e293b] border-t border-slate-800 px-6 py-3 flex items-center justify-between z-50 pb-safe">
        <button 
          onClick={() => setActiveTab('services')} 
          className={cn("flex flex-col items-center gap-1 transition-colors", activeTab === 'services' ? "text-indigo-500" : "text-slate-400")}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-bold">Services</span>
        </button>
        <button 
          onClick={() => setActiveTab('history')} 
          className={cn("flex flex-col items-center gap-1 transition-colors", activeTab === 'history' ? "text-indigo-500" : "text-slate-400")}
        >
          <History className="w-5 h-5" />
          <span className="text-[10px] font-bold">History</span>
        </button>
        <button 
          onClick={() => setShowRechargeModal(true)} 
          className="flex flex-col items-center gap-1 -mt-8"
        >
          <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/40 border-4 border-[#0f172a]">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <span className="text-[10px] font-bold text-emerald-500 mt-1">Recharge</span>
        </button>
        <button 
          onClick={() => setActiveTab('premium')} 
          className={cn("flex flex-col items-center gap-1 transition-colors", activeTab === 'premium' ? "text-yellow-500" : "text-slate-400")}
        >
          <Crown className="w-5 h-5" />
          <span className="text-[10px] font-bold">Premium</span>
        </button>
        <button 
          onClick={() => setActiveTab('settings')} 
          className={cn("flex flex-col items-center gap-1 transition-colors", activeTab === 'settings' ? "text-indigo-500" : "text-slate-400")}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] font-bold">Settings</span>
        </button>
      </div>

      {/* Success Notification */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-8 right-8 z-[100] bg-[#1e293b] border border-slate-700 rounded-2xl shadow-2xl p-4 flex items-center gap-4 min-w-[320px]"
          >
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center shrink-0">
              <CheckCircle className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-white">Order Placed!</p>
              <p className="text-sm text-slate-400">Your request is being processed.</p>
            </div>
            <button 
              onClick={() => setShowSuccess(false)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recharge Modal */}
      <AnimatePresence>
        {showRechargeModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRechargeModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-[#1e293b] rounded-3xl border border-slate-700 shadow-2xl p-6 space-y-6"
            >
              <h2 className="text-xl font-bold">Recharge Request</h2>
              
              <div className="space-y-3">
                {globalSettings?.bkashNumber && (
                  <div className="flex items-center justify-between p-3 bg-slate-800 rounded-xl border border-slate-700">
                    <span className="text-sm text-slate-400">Bkash</span>
                    <span className="font-bold text-white">{globalSettings.bkashNumber}</span>
                  </div>
                )}
                {globalSettings?.nagadNumber && (
                  <div className="flex items-center justify-between p-3 bg-slate-800 rounded-xl border border-slate-700">
                    <span className="text-sm text-slate-400">Nagad</span>
                    <span className="font-bold text-white">{globalSettings.nagadNumber}</span>
                  </div>
                )}
                {globalSettings?.rocketNumber && (
                  <div className="flex items-center justify-between p-3 bg-slate-800 rounded-xl border border-slate-700">
                    <span className="text-sm text-slate-400">Rocket</span>
                    <span className="font-bold text-white">{globalSettings.rocketNumber}</span>
                  </div>
                )}
                <p className="text-xs text-slate-500 text-center">Min Recharge ৳100</p>
              </div>

              <div className="space-y-4">
                <input type="number" placeholder="Amount (Min 100৳)" value={rechargeData.amount || ''} onChange={(e) => setRechargeData({...rechargeData, amount: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                <input type="text" placeholder="Sender Number" value={rechargeData.senderNumber || ''} onChange={(e) => setRechargeData({...rechargeData, senderNumber: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                <input type="text" placeholder="Transaction ID" value={rechargeData.trxID || ''} onChange={(e) => setRechargeData({...rechargeData, trxID: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="flex gap-4">
                <button onClick={() => setShowRechargeModal(false)} className="flex-1 py-3 bg-slate-800 rounded-xl font-bold hover:bg-slate-700">Cancel</button>
                <button 
                  onClick={async () => {
                    const amount = Number(rechargeData.amount);
                    if (amount < 100 || !rechargeData.senderNumber || !rechargeData.trxID) {
                      alert('Please enter valid amount (min 100৳), sender number, and transaction ID.');
                      return;
                    }
                    await addDoc(collection(db, 'orders'), {
                      uid: userProfile.uid,
                      userEmail: userProfile.email,
                      serviceTitle: 'Recharge Request',
                      status: 'pending',
                      amount: amount,
                      senderNumber: rechargeData.senderNumber,
                      trxID: rechargeData.trxID,
                      createdAt: serverTimestamp()
                    });
                    setShowRechargeModal(false);
                    setRechargeData({ amount: '', senderNumber: '', trxID: '' });
                    alert('Recharge request sent to admin.');
                  }}
                  className="flex-1 py-3 bg-indigo-600 rounded-xl font-bold hover:bg-indigo-700"
                >
                  Send Request
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isAdmin && onBackToAdmin && (
        <button 
          onClick={onBackToAdmin}
          className="fixed top-4 right-4 z-[100] bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2"
        >
          <LayoutDashboard className="w-4 h-4" />
          Back to Admin
        </button>
      )}
    </div>
  );
};

export default UserPanel;
