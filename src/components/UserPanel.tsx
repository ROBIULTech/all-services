import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  History, 
  Wallet, 
  Search, 
  Bell, 
  LogOut, 
  ChevronRight, 
  ChevronLeft,
  Zap, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Package,
  Plus,
  X,
  Trash2,
  CheckCircle,
  Copy,
  Download,
  Eye,
  EyeOff,
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
  Phone,
  HeadphonesIcon,
  Loader2,
  Home,
  Megaphone,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { UserProfile, Order, Product, GlobalSettings } from '../types';
import { auth, signOut, db, collection, addDoc, serverTimestamp, query, where, onSnapshot, Timestamp, doc, setDoc, updateDoc, deleteDoc } from '../firebase';
import axios from 'axios';

import { Logo } from './Logo';

interface UserPanelProps {
  userProfile: UserProfile;
  setUserProfile?: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  products: Product[];
  globalSettings?: GlobalSettings;
  onOrderPlaced: (order: any) => void;
  onSignOut: () => void;
  updateUserProfile?: (displayName: string, photoURL: string, whatsapp: string, password?: string) => Promise<void>;
  isSidebarOpen?: boolean;
  setIsSidebarOpen?: (value: boolean) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const UserPanel: React.FC<UserPanelProps & { isAdmin?: boolean; onBackToAdmin?: () => void }> = ({ 
  userProfile, 
  setUserProfile,
  products, 
  globalSettings,
  onOrderPlaced, 
  onSignOut,
  updateUserProfile,
  isAdmin,
  onBackToAdmin,
  isSidebarOpen: propIsSidebarOpen,
  setIsSidebarOpen: propSetIsSidebarOpen,
  isDarkMode,
  toggleDarkMode
}) => {
  const [localIsSidebarOpen, setLocalIsSidebarOpen] = useState(true);
  const isSidebarOpen = propIsSidebarOpen !== undefined ? propIsSidebarOpen : localIsSidebarOpen;
  const setIsSidebarOpen = propSetIsSidebarOpen !== undefined ? propSetIsSidebarOpen : setLocalIsSidebarOpen;
  const [activeTab, setActiveTab] = useState<'services' | 'history' | 'settings' | 'premium' | 'rejected' | 'completed-orders'>('services');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [selectedOption, setSelectedOption] = useState<{name: string, price: number, autoDeliveryLink?: string} | null>(null);
  const [orderData, setOrderData] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successLink, setSuccessLink] = useState<string | null>(null);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeStep, setRechargeStep] = useState<1 | 2 | 3>(1);
  const [rechargeMethod, setRechargeMethod] = useState<{id: string, name: string, color: string, logo: string, number?: string} | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [rechargeData, setRechargeData] = useState({ amount: '', senderNumber: '', trxID: '' });
  const [orderFiles, setOrderFiles] = useState<string[]>([]);
  const [profileForm, setProfileForm] = useState({ 
    displayName: userProfile?.displayName || '', 
    photoURL: userProfile?.photoURL || '',
    whatsapp: userProfile?.whatsapp || '',
    password: userProfile?.password || ''
  });
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  const themeColors = [
    { name: 'Blue', color: '#2563eb' },
    { name: 'Purple', color: '#9333ea' },
    { name: 'Sky', color: '#0ea5e9' },
    { name: 'Emerald', color: '#10b981' },
    { name: 'Orange', color: '#f97316' },
    { name: 'Red', color: '#ef4444' },
  ];

  const [selectedThemeColor, setSelectedThemeColor] = useState(userProfile.themeColor || '#10b981');
  const [customColor, setCustomColor] = useState(userProfile.themeColor || '#10b981');

  useEffect(() => {
    if (!userProfile?.uid) return;

    // Fetch active sessions
    const sessionsQ = query(collection(db, 'sessions'), where('uid', '==', userProfile.uid), where('active', '==', true));
    const unsubscribeSessions = onSnapshot(sessionsQ, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSessions(data);
    }, (error) => {
      console.error('Sessions listener error (collection sessions):', error);
    });

    // Fetch login history
    const historyQ = query(collection(db, 'login_history'), where('uid', '==', userProfile.uid));
    const unsubscribeHistory = onSnapshot(historyQ, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a: any, b: any) => b.timestamp?.toDate().getTime() - a.timestamp?.toDate().getTime());
      setLoginHistory(data.slice(0, 10));
    }, (error) => {
      console.error('Login history listener error (collection login_history):', error);
    });

    return () => {
      unsubscribeSessions();
      unsubscribeHistory();
    };
  }, [userProfile?.uid]);

  const handleUpdateThemeColor = async (color: string) => {
    try {
      const userRef = doc(db, 'users', userProfile.uid);
      await updateDoc(userRef, { themeColor: color });
      setSelectedThemeColor(color);
      document.documentElement.style.setProperty('--primary-color', color);
      alert('Theme color updated successfully!');
    } catch (error) {
      console.error('Error updating theme color:', error);
    }
  };

  const handleLogoutOtherSessions = async () => {
    // Current session ID would be needed. For now, let's assume we mark all others active=false
    try {
      const currentSessionId = localStorage.getItem('sessionId');
      for (const sess of sessions) {
        if (sess.id !== currentSessionId) {
          await updateDoc(doc(db, 'sessions', sess.id), { active: false });
        }
      }
      alert('Logout from other sessions successful!');
    } catch (error) {
      console.error('Error logging out from other sessions:', error);
    }
  };

  const handleLogoutAllSessions = async () => {
    try {
      for (const sess of sessions) {
        await updateDoc(doc(db, 'sessions', sess.id), { active: false });
      }
      onSignOut();
    } catch (error) {
      console.error('Error logging out from all sessions:', error);
    }
  };

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
  const [photoNid, setPhotoNid] = useState('');
  const [photoDob, setPhotoDob] = useState('');
  const [autoNidNumber, setAutoNidNumber] = useState('');
  const [autoNidDob, setAutoNidDob] = useState('');
  const [smartVoterModalOpen, setSmartVoterModalOpen] = useState(false);
  const [smartVoterData, setSmartVoterData] = useState({
    division: '', district: '', seat: '', upazila: '', union: '', center: '',
    name: '', fatherName: '', motherName: '', dob: ''
  });

  const sendAdminNotifications = async (message: string) => {
    // 1. Send SMS (Existing)
    try {
      await axios.post('/api/send-sms', { 
        message,
        token: globalSettings?.smsGatewayToken,
        adminPhone: globalSettings?.adminPhoneNumber,
        isSmsNotifyActive: globalSettings?.isSmsNotifyActive
      });
    } catch (error: any) {
      console.error('Failed to send admin SMS:', error.message || error);
    }

    // 2. Send Telegram Notification
    if (globalSettings?.isTelegramNotifyActive && globalSettings?.telegramBotToken && globalSettings?.telegramChatId) {
      try {
        const telegramUrl = `https://api.telegram.org/bot${globalSettings.telegramBotToken}/sendMessage`;
        await axios.post(telegramUrl, {
          chat_id: globalSettings.telegramChatId,
          text: `🔔 *New Order Notification*\n\n${message}`,
          parse_mode: 'Markdown'
        });
      } catch (error: any) {
        console.error('Failed to send Telegram notification:', error.message || error);
      }
    }

    // 3. Send WhatsApp Notification (Generic API approach)
    if (globalSettings?.isWhatsappNotifyActive && globalSettings?.whatsappNotifyNumber) {
      try {
        // This is a generic placeholder. Real implementation depends on the SMS/WA Gateway provider.
        // Usually, the same SMS gateway supports WhatsApp via a specific parameter.
        await axios.post('/api/send-sms', { 
          message: `*New Order Notification*\n\n${message}`,
          token: globalSettings?.smsGatewayToken,
          adminPhone: globalSettings?.whatsappNotifyNumber,
          isWhatsapp: true // Example flag for gateway
        });
      } catch (error: any) {
        console.error('Failed to send WhatsApp notification:', error.message || error);
      }
    }
  };

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
        balance: Number(userProfile.balance) - Number(fee),
        isPremium: true
      }, { merge: true });
      
      // Optimistic update
      if (setUserProfile) {
        setUserProfile(prev => prev ? { ...prev, balance: Number(prev.balance) - Number(fee), isPremium: true } : prev);
      }
      
      alert('Premium Services Unlocked Successfully!');
    } catch (error) {
      console.error('Error unlocking premium:', error);
      alert('Failed to unlock premium services. Please try again.');
    } finally {
      setIsUnlocking(false);
    }
  };

  useEffect(() => {
    if (showSuccess && !successLink) {
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess, successLink]);

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
    } else if (selectedProduct?.id === 27) {
      setOrderData(`টিন সার্টিফিকেট বাতিল এর কাজের ফরমেট:
⚠️ টিন নম্বর:
⚠️ এনআইডি নম্বর:
⚠️ জন্ম তারিখ:
⚠️ বাতিল করার কারণ:`);
    } else {
      setOrderData('');
    }
    setOrderFiles([]);
  }, [selectedProduct]);

  const calculatePrice = (basePrice: number, product?: Product) => {
    // Return basePrice directly as requested by user to prevent automatic price changes
    // without admin's explicit action on the product itself.
    return basePrice;
  };

  const currentPrice = calculatePrice(selectedOption ? selectedOption.price : (selectedProduct?.price || 0), selectedProduct || undefined);
  const premiumProductIds = products.filter(p => p.category === 'PREMIUM').map(p => p.id);
  const isPremium = (order: Order) => premiumProductIds.includes(order.serviceId);

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
    }, (error) => {
      console.error('Orders listener error in UserPanel.tsx (collection orders):', error);
    });

    return () => unsubscribe();
  }, [userProfile?.uid]);

  const handlePlacePremiumOrder = async (productId: number, data: string) => {
    const product = products.find(p => p.id === productId);
    if (!product || !userProfile) return;

    const price = calculatePrice(product.price, product);

    if (userProfile.balance < price) {
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
        price: price,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'orders'), newOrder);
      
      // API Reselling Forwarding
      if (globalSettings?.isApiResellingActive && globalSettings?.providerApiUrl && globalSettings?.providerApiKey) {
        try {
          await axios.post('/api/reseller/forward', {
            providerUrl: globalSettings.providerApiUrl,
            apiKey: globalSettings.providerApiKey,
            orderData: {
              ...newOrder,
              providerServiceId: product.providerServiceId
            }
          });
          console.log('Premium order forwarded to provider successfully');
        } catch (apiError) {
          console.error('Failed to forward premium order to provider:', apiError);
        }
      }

      // Send Notifications to Admin
      sendAdminNotifications(`New Premium Order! User: ${userProfile.email}, Service: ${product.titleBn}`);

      const userRef = doc(db, 'users', userProfile.uid);
      await setDoc(userRef, {
        balance: Number(userProfile.balance) - Number(price)
      }, { merge: true });
      
      // Optimistic update
      if (setUserProfile) {
        setUserProfile(prev => prev ? { ...prev, balance: Number(prev.balance) - Number(price) } : prev);
      }
      
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

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to delete this order from your history?')) return;
    try {
      await deleteDoc(doc(db, 'orders', orderId));
    } catch (error) {
      console.error('Failed to delete order', error);
      alert('Failed to delete order history.');
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
        fileURLs: orderFiles,
        price: currentPrice,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'orders'), newOrder);
      const orderId = docRef.id;
      
      // Deduct balance from user
      const userRef = doc(db, 'users', userProfile.uid);
      await updateDoc(userRef, {
        balance: Number(userProfile.balance) - Number(currentPrice)
      });
      
      // Optimistic update
      if (setUserProfile) {
        setUserProfile(prev => prev ? { ...prev, balance: Number(prev.balance) - Number(currentPrice) } : prev);
      }
      
      // Send Notifications to Admin for all orders
      console.log("Sending admin notification for order.");
      sendAdminNotifications(`New Order! User: ${userProfile.email}, Service: ${selectedProduct.titleBn}`);

      // API Reselling Forwarding
      if (globalSettings?.isApiResellingActive && globalSettings?.providerApiUrl && globalSettings?.providerApiKey) {
        try {
          await axios.post('/api/reseller/forward', {
            providerUrl: globalSettings.providerApiUrl,
            apiKey: globalSettings.providerApiKey,
            orderData: {
              ...newOrder,
              providerServiceId: selectedProduct.providerServiceId
            }
          });
          console.log('Order forwarded to provider successfully');
        } catch (apiError) {
          console.error('Failed to forward order to provider:', apiError);
        }
      }

      if (selectedProduct.id === 101 && globalSettings?.isAutoSignApiActive) {
        try {
          const response = await axios.post('/api/service/auto-sign', {
            nid: orderData,
            apiKey: globalSettings.autoSignApiKey,
            isTokenBased: globalSettings.isAutoSignTokenBased,
            tokenUrl: globalSettings.autoSignTokenUrl
          });
          if (response.data.success) {
            const secureUrl = `${window.location.origin}/api/secure-link/${orderId}?url=${encodeURIComponent(response.data.data.pdfUrl)}`;
            setSuccessLink(secureUrl);
          }
        } catch (e) { console.error("Auto Sign API failed", e); }
      } else if (selectedProduct.id === 102 && globalSettings?.isInfoVerifyApiActive) {
        try {
          const response = await axios.post('/api/service/info-verify', {
            category: selectedOption?.name || 'NID',
            number: orderData,
            apiKey: globalSettings.infoVerifyApiKey,
            isTokenBased: globalSettings.isInfoVerifyTokenBased,
            tokenUrl: globalSettings.infoVerifyTokenUrl
          });
          if (response.data.success) {
            // For info verify, we might want to show the details in a specific way
            setSuccessLink("Verification Successful: " + JSON.stringify(response.data.data.details));
          }
        } catch (e) { console.error("Info Verify API failed", e); }
      } else if (selectedProduct.id === 103 && globalSettings?.isServerCopyApiActive) {
        try {
          const lines = orderData.split('\n');
          const nid = lines[0]?.split(':')[1]?.trim() || lines[0]?.trim();
          const dob = lines[1]?.split(':')[1]?.trim() || lines[1]?.trim();
          const response = await axios.post('/api/service/server-copy', {
            nid,
            dob,
            apiKey: globalSettings.serverCopyApiKey,
            isTokenBased: globalSettings.isServerCopyTokenBased,
            tokenUrl: globalSettings.serverCopyTokenUrl
          });
          if (response.data.success) {
            const secureUrl = `${window.location.origin}/api/secure-link/${orderId}?url=${encodeURIComponent(response.data.data.documentUrl)}`;
            setSuccessLink(secureUrl);
          }
        } catch (e) { console.error("Server Copy API failed", e); }
      } else if (selectedProduct.id === 104 && globalSettings?.isAutoNidApiActive) {
        try {
          const lines = orderData.split('\n');
          const nid = lines[0]?.split(':')[1]?.trim() || lines[0]?.trim();
          const dob = lines[1]?.split(':')[1]?.trim() || lines[1]?.trim();
          const response = await axios.post('/api/service/auto-nid', {
            nid,
            dob,
            apiKey: globalSettings.autoNidApiKey,
            isTokenBased: globalSettings.isAutoNidTokenBased,
            tokenUrl: globalSettings.autoNidTokenUrl
          });
          if (response.data.success) {
            const secureUrl = `${window.location.origin}/api/secure-link/${orderId}?url=${encodeURIComponent(response.data.data.pdfUrl)}`;
            setSuccessLink(secureUrl);
          }
        } catch (e) { console.error("Auto NID API failed", e); }
      } else if (selectedProduct.id === 105 && globalSettings?.isSmartVoterApiActive) {
        try {
          // Assuming orderData stores search fields somehow, or we need to update UI to collect these
          // For now, assume orderData contains them as string/JSON
          let searchFields;
          try { searchFields = JSON.parse(orderData); } catch(e) { searchFields = { query: orderData }; }
          
          const response = await axios.post('/api/service/smart-voter-search', {
            ...searchFields,
            apiKey: globalSettings.smartVoterApiKey,
            isTokenBased: globalSettings.isSmartVoterTokenBased,
            tokenUrl: globalSettings.smartVoterTokenUrl
          });
          
          if (response.data.success) {
            setSuccessLink("Search Result: " + JSON.stringify(response.data.data));
          }
        } catch (e) { console.error("Smart Voter Search API failed", e); }
      }

      // Check if it's Drive Link Mode first to bypass secure link generation
      if (selectedOption?.autoDeliveryLink) {
        // Create secure link that expires in 5 minutes
        const secureUrl = `${window.location.origin}/api/secure-link/${orderId}?url=${encodeURIComponent(selectedOption.autoDeliveryLink)}`;
        setSuccessLink(secureUrl);
      } else if (selectedProduct.autoDeliveryLink) {
        const secureUrl = `${window.location.origin}/api/secure-link/${orderId}?url=${encodeURIComponent(selectedProduct.autoDeliveryLink)}`;
        setSuccessLink(secureUrl);
      } else {
        setSuccessLink(null);
      }
      
      // API Reselling Forwarding
      if (globalSettings?.isApiResellingActive && globalSettings?.providerApiUrl && globalSettings?.providerApiKey) {
        try {
          await axios.post('/api/reseller/forward', {
            providerUrl: globalSettings.providerApiUrl,
            apiKey: globalSettings.providerApiKey,
            orderData: {
              service: selectedProduct.id,
              data: orderData,
              external_id: userProfile.uid + '_' + Date.now()
            }
          });
          console.log('Order forwarded to provider successfully');
        } catch (apiError) {
          console.error('Failed to forward order to provider:', apiError);
        }
      }
      
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

  const [dismissedCompletedServices, setDismissedCompletedServices] = useState<number[]>([]);

  const getServiceStatus = (serviceId: number) => {
    // Find the latest non-rejected order for this user for this service
    const relevantOrder = orders.find(o => o.serviceId === serviceId && o.status !== 'rejected');
    if (!relevantOrder) return { status: 'idle' };
    
    if (relevantOrder.status === 'pending' || relevantOrder.status === 'processing') {
      return { status: 'processing', order: relevantOrder };
    }
    
    if (relevantOrder.status === 'completed' && !dismissedCompletedServices.includes(serviceId)) {
      return { status: 'completed', order: relevantOrder };
    }
    
    return { status: 'idle' };
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 bottom-0 bg-white border-r border-slate-200 transition-all duration-300 z-50 hidden lg:flex flex-col",
        isSidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <Logo className="w-10 h-10 flex-shrink-0" />
            {isSidebarOpen && (
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-slate-900 leading-none mt-1">All Services</span>
                <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mt-0.5">Platform</span>
              </div>
            )}
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
          >
            {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button 
            onClick={() => setActiveTab('services')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all font-medium",
              activeTab === 'services' ? "bg-brand/10 text-brand" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
            title={!isSidebarOpen ? "Services" : ""}
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            {isSidebarOpen && <span>Services</span>}
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all font-medium",
              activeTab === 'history' ? "bg-brand/10 text-brand" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
            title={!isSidebarOpen ? "My Orders" : ""}
          >
            <History className="w-5 h-5 flex-shrink-0" />
            {isSidebarOpen && <span>My Orders</span>}
          </button>
          <button 
            onClick={() => setActiveTab('completed-orders')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all font-medium",
              activeTab === 'completed-orders' ? "bg-emerald-50 text-emerald-600" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
            title={!isSidebarOpen ? "Completed Orders" : ""}
          >
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            {isSidebarOpen && <span>Completed Orders</span>}
          </button>
          <button 
            onClick={() => setActiveTab('rejected')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all font-medium",
              activeTab === 'rejected' ? "bg-red-50 text-red-600" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
            title={!isSidebarOpen ? "Rejected Order Management" : ""}
          >
            <XCircle className="w-5 h-5 flex-shrink-0" />
            {isSidebarOpen && <span>Rejected Order Management</span>}
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all font-medium",
              activeTab === 'settings' ? "bg-brand/10 text-brand" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
            title={!isSidebarOpen ? "Settings" : ""}
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            {isSidebarOpen && <span>Settings</span>}
          </button>
          <button 
            onClick={() => setShowRechargeModal(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all font-medium text-emerald-600 hover:bg-emerald-50"
            title={!isSidebarOpen ? "Recharge Balance" : ""}
          >
            <Wallet className="w-5 h-5 flex-shrink-0" />
            {isSidebarOpen && <span>Recharge Balance</span>}
          </button>
          <button 
            onClick={() => setActiveTab('premium')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all font-medium",
              activeTab === 'premium' ? "bg-yellow-50 text-yellow-700 shadow-sm" : "text-yellow-600 hover:bg-yellow-50/50"
            )}
            title={!isSidebarOpen ? "Premium Services" : ""}
          >
            <Crown className={cn("w-5 h-5 flex-shrink-0", !userProfile.isPremium && "text-slate-400")} />
            {isSidebarOpen && (
              <div className="flex flex-col items-start leading-none gap-1">
                <span>Premium Services</span>
                {!userProfile.isPremium && <span className="text-[8px] font-black uppercase tracking-tighter text-slate-400 bg-slate-100 px-1 rounded">Locked</span>}
              </div>
            )}
          </button>
          
          <button 
            onClick={() => setSmartVoterModalOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all font-medium text-teal-600 hover:bg-teal-50"
            title={!isSidebarOpen ? "স্মার্ট ভোটার অনুসন্ধান" : ""}
          >
            <UserCheck className="w-5 h-5 flex-shrink-0" />
            {isSidebarOpen && (
              <div className="flex flex-col items-start leading-tight">
                <span>স্মার্ট ভোটার অনুসন্ধান</span>
                <span className="text-[10px] font-bold text-teal-500">৳{calculatePrice(products.find(p => p.id === 105)?.price || 0, products.find(p => p.id === 105)).toFixed(2)}</span>
              </div>
            )}
          </button>

          <div className="pt-4 pb-2">
            {isSidebarOpen && <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Categories</p>}
            <div className="space-y-1">
              {categories.map(cat => (
                <button 
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setActiveTab('services');
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all font-medium text-sm",
                    selectedCategory === cat && activeTab === 'services' 
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" 
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                  title={!isSidebarOpen ? cat : ""}
                >
                  <Tag className={cn("w-4 h-4 flex-shrink-0", selectedCategory === cat && activeTab === 'services' ? "text-white" : "text-indigo-400")} />
                  {isSidebarOpen && <span className="truncate">{cat}</span>}
                </button>
              ))}
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-200">
          {isSidebarOpen ? (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Balance</p>
                  <p className="text-lg font-bold text-emerald-600">৳{userProfile.balance.toLocaleString()}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowRechargeModal(true)}
                className="w-full py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all"
              >
                Recharge Now
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex flex-col items-center justify-center text-emerald-600 cursor-help group relative">
                <Wallet className="w-5 h-5" />
                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  Balance: ৳{userProfile.balance.toLocaleString()}
                </div>
              </div>
              <button 
                onClick={() => setShowRechargeModal(true)}
                className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center hover:bg-emerald-700 transition-all shadow-md shadow-emerald-500/20"
                title="Recharge Now"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {globalSettings?.whatsappGroupLink && isSidebarOpen && (
          <div className="p-4 border-t border-slate-200">
            <a 
              href={globalSettings.whatsappGroupLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-3 px-4 py-3 bg-emerald-500 text-white hover:bg-emerald-600 rounded-2xl transition-all font-bold text-sm shadow-lg shadow-emerald-500/20"
            >
              <PhoneCall className="w-5 h-5" />
              Join WhatsApp Group
            </a>
          </div>
        )}

        <div className="p-4 border-t border-slate-200">
          <button 
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all font-medium"
            title={!isSidebarOpen ? "Sign Out" : ""}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {isSidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "min-h-screen transition-all duration-300",
        isSidebarOpen ? "lg:pl-64" : "lg:pl-20"
      )}>
        {/* Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search services..." 
                value={searchQuery || ''}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-100 border-none rounded-2xl pl-12 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 placeholder-slate-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={toggleDarkMode}
              className={cn(
                "p-2.5 rounded-2xl transition-all shadow-lg",
                isDarkMode 
                  ? "bg-slate-800 text-white hover:bg-slate-700" 
                  : "bg-blue-600 text-white hover:bg-blue-700"
              )}
            >
              {isDarkMode ? <Moon className="w-5 h-5 fill-current" /> : <Sun className="w-5 h-5 fill-current" />}
            </button>

            <div className="flex flex-col items-end gap-0.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-sm font-bold text-emerald-600">৳{userProfile.balance.toLocaleString()}</span>
                <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!userProfile?.uid) return;
                    try {
                      const { getDoc, doc } = await import('firebase/firestore');
                      const userSnap = await getDoc(doc(db, 'users', userProfile.uid));
                      if (userSnap.exists()) {
                        setUserProfile?.(userSnap.data() as UserProfile);
                      }
                    } catch (e) {
                      console.error('Refresh balance error:', e);
                    }
                  }}
                  className="ml-1 p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                  title="Refresh Balance"
                >
                  <History className="w-3 h-3" />
                </button>
                <button 
                  onClick={() => setShowRechargeModal(true)}
                  className="ml-1 p-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all"
                  title="Recharge"
                >
                  <Plus className="w-2.5 h-2.5" />
                </button>
              </div>
              {userProfile.userId && <p className="text-[9px] font-bold text-indigo-600 leading-none">ID: {userProfile.userId}</p>}
            </div>
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 bg-slate-100 rounded-2xl text-slate-500 hover:text-indigo-600 transition-all relative"
              >
                <Bell className="w-5 h-5" />
                {orders.some(o => o.status !== 'pending') && (
                  <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
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
                      className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-bold text-slate-900">Notifications</h3>
                        <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
                          Recent
                        </span>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto">
                        {orders.length === 0 ? (
                          <div className="p-8 text-center">
                            <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-sm text-slate-500">No notifications yet</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-50">
                            {orders.slice(0, 5).map((order) => (
                              <div key={order.id} className="p-4 hover:bg-slate-50 transition-colors text-slate-900">
                                <div className="flex gap-3">
                                  <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                    order.status === 'completed' ? "bg-emerald-100 text-emerald-600" :
                                    order.status === 'rejected' ? "bg-red-100 text-red-600" :
                                    "bg-amber-100 text-amber-600"
                                  )}>
                                    {order.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> :
                                     order.status === 'rejected' ? <XCircle className="w-4 h-4" /> :
                                     <Clock className="w-4 h-4" />}
                                  </div>
                                  <div className="space-y-1 text-left">
                                    <p className="text-sm font-medium leading-none">
                                      {order.serviceTitle}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      Your order is <span className={cn(
                                        "font-bold",
                                        order.status === 'completed' ? "text-emerald-600" :
                                        order.status === 'rejected' ? "text-red-600" :
                                        "text-amber-600"
                                      )}>{order.status}</span>
                                    </p>
                                    <p className="text-[10px] text-slate-400">
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
                          className="w-full p-3 text-xs text-center text-indigo-600 hover:text-indigo-700 bg-slate-50 font-bold transition-colors"
                        >
                          View All Orders
                        </button>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900">{userProfile.displayName}</p>
                <div className="flex flex-col items-end">
                  <p className="text-[10px] text-slate-500">{userProfile.email}</p>
                  {userProfile.userId && <p className="text-[10px] text-indigo-600 font-bold">ID: {userProfile.userId}</p>}
                  {userProfile.whatsapp && <p className="text-[10px] text-emerald-600 font-medium">WA: {userProfile.whatsapp}</p>}
                </div>
              </div>
              <img src={userProfile.photoURL} alt="Avatar" className="w-10 h-10 rounded-2xl border-2 border-slate-200" />
            </div>
          </div>
        </header>

        {/* Dynamic Scrolling Notice */}
        {globalSettings?.marqueeText && (
          <div className="bg-indigo-600 py-2 border-b border-indigo-700 overflow-hidden relative shadow-sm">
            <div className="flex whitespace-nowrap">
              <motion.div 
                animate={{ x: [0, -1000] }}
                transition={{ 
                  duration: 30, 
                  repeat: Infinity, 
                  ease: "linear" 
                }}
                className="flex gap-24 items-center pr-24"
              >
                <div className="flex items-center gap-4 text-white">
                  <Megaphone className="w-4 h-4" />
                  <span className="text-sm font-bold tracking-wide">{globalSettings.marqueeText}</span>
                </div>
                <div className="flex items-center gap-4 text-white">
                  <Megaphone className="w-4 h-4" />
                  <span className="text-sm font-bold tracking-wide">{globalSettings.marqueeText}</span>
                </div>
                <div className="flex items-center gap-4 text-white">
                  <Megaphone className="w-4 h-4" />
                  <span className="text-sm font-bold tracking-wide">{globalSettings.marqueeText}</span>
                </div>
              </motion.div>
            </div>
          </div>
        )}

        <div className="p-6 lg:p-8">
          {activeTab === 'services' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                    <LayoutGrid className="w-8 h-8 text-indigo-600" />
                    Available Services
                  </h1>
                  <p className="text-slate-500 mt-1 font-medium">Select a service to place an order</p>
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
                  {filteredProducts.map((product) => (
                    <motion.div 
                      key={product.id}
                      whileHover={product.isActive ? { y: -5 } : {}}
                      className={cn(
                        "bg-white rounded-3xl border border-slate-200 p-6 space-y-4 transition-all group relative overflow-hidden shadow-sm",
                        product.isActive ? "hover:border-indigo-500/50 cursor-pointer" : "opacity-75 cursor-not-allowed"
                      )}
                      onClick={() => {
                        if (!product.isActive) return;
                        if (product.id === 105) {
                          setSmartVoterModalOpen(true);
                        } else if (product.category === 'PREMIUM') {
                          setActiveTab('premium');
                        } else {
                          setSelectedProduct(product);
                        }
                      }}
                    >
                      {!product.isActive && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-4 text-center rounded-3xl">
                          <div className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-100 mb-2">
                            Temporarily Closed
                          </div>
                          <p className="text-xs text-slate-900 font-medium">কাজ বন্ধ আছে</p>
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
                          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{product.category}</span>
                          {product.discountPrice && (
                            <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-2 py-0.5 rounded-lg border border-emerald-100">
                              OFFER
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-black group-hover:text-indigo-600 transition-colors leading-tight text-slate-900">{product.titleBn}</h3>
                        <p className="text-xs text-slate-500 mt-1 font-medium">{product.titleEn}</p>
                        {product.shortDescription && (
                          <p className="text-xs text-slate-500 mt-3 line-clamp-2 leading-relaxed">{product.shortDescription}</p>
                        )}
                      </div>
                      <div className="flex items-center justify-end pt-4 border-t border-slate-100">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all", product.isActive ? "bg-slate-50 group-hover:bg-indigo-600 shadow-lg group-hover:shadow-indigo-500/20" : "bg-slate-50")}>
                          <ChevronRight className={cn("w-5 h-5", product.isActive ? "text-slate-400 group-hover:text-white" : "text-slate-300")} />
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
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Orders</h1>
                <p className="text-slate-500 mt-1">Track your active service requests and their status</p>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm font-sans">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Service</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Date</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Price</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Admin Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 italic">
                      {orders.filter(o => o.status !== 'rejected' && o.status !== 'completed').length > 0 ? orders.filter(o => o.status !== 'rejected' && o.status !== 'completed').map((order, i) => {
                        const StatusIcon = getStatusIcon(order.status);
                        return (
                          <tr key={order.id || i} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <p className="text-sm font-bold text-slate-900">{order.serviceTitle}</p>
                              <p className="text-[10px] text-slate-500">ID: {order.id?.slice(-8).toUpperCase()}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-slate-600">
                                {order.createdAt?.toDate?.()?.toLocaleDateString()}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {order.createdAt?.toDate?.()?.toLocaleTimeString()}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-bold text-emerald-600">৳{order.price}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider whitespace-nowrap", getStatusColor(order.status))}>
                                  <StatusIcon className="w-3 h-3" />
                                  {order.status === 'pending' ? 'Pending' : order.status === 'processing' ? 'Processing' : order.status}
                                </div>
                                <button
                                  onClick={() => handleDeleteOrder(order.id!)}
                                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete Order"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
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
                            <div className="flex flex-col items-center gap-3 opacity-40">
                              <Package className="w-12 h-12 text-slate-700" />
                              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No active orders</p>
                              <p className="text-[10px]">Your pending and processing orders will appear here.</p>
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

          {activeTab === 'completed-orders' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-emerald-600">Completed Orders</h1>
                  <p className="text-slate-500 mt-1">Successfully processed service requests</p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm border-t-4 border-t-emerald-500 font-sans">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Service</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Date</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Price</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-center">Result</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 italic">
                      {orders.filter(o => o.status === 'completed').length > 0 ? orders.filter(o => o.status === 'completed').map((order, i) => {
                        return (
                          <tr key={order.id || `completed-${i}`} className="hover:bg-emerald-50/30 transition-colors">
                            <td className="px-6 py-4">
                              <p className="text-sm font-bold text-slate-900 border-l-4 border-emerald-500 pl-3">
                                {order.serviceTitle}
                              </p>
                              <p className="text-[10px] text-slate-400 pl-4">ID: {order.id?.slice(-8).toUpperCase()}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-slate-600">
                                {order.createdAt?.toDate?.()?.toLocaleDateString()}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {order.createdAt?.toDate?.()?.toLocaleTimeString()}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-bold text-emerald-600 tracking-tighter">৳{order.price}</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {order.resultFile ? (
                                <button 
                                  onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = order.resultFile!;
                                    link.download = `result_${order.id}.jpg`;
                                    link.click();
                                  }}
                                  className="mx-auto w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center hover:bg-emerald-700 transition-all shadow-md shadow-emerald-500/20"
                                  title="Download Result"
                                >
                                  <Download className="w-5 h-5" />
                                </button>
                              ) : (
                                <div className="flex flex-col items-center gap-1 opacity-40">
                                  <XCircle className="w-5 h-5 text-slate-400" />
                                  <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400">No File</span>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 whitespace-nowrap">
                                  COMPLETED
                                </span>
                                <button
                                  onClick={() => handleDeleteOrder(order.id!)}
                                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete Order"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-20 text-center text-slate-400">
                            <div className="flex flex-col items-center gap-2">
                              <CheckCircle className="w-10 h-10 mb-2 opacity-20" />
                              <p className="font-bold uppercase tracking-widest text-xs">No completed orders found</p>
                              <p className="text-[10px]">Your successfully processed orders will appear here.</p>
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

          {activeTab === 'rejected' && (
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-red-600">Rejected Orders</h1>
                <p className="text-slate-500 mt-1">Review your rejected requests and admin reasons</p>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm border-t-4 border-t-red-500">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Service</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Date</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Price</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Rejection Reason</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orders.filter(o => o.status === 'rejected').length > 0 ? orders.filter(o => o.status === 'rejected').map((order, i) => {
                        return (
                          <tr key={order.id || i} className="hover:bg-red-50/30 transition-colors">
                            <td className="px-6 py-4">
                              <p className="text-sm font-bold text-slate-900">{order.serviceTitle}</p>
                              <p className="text-[10px] text-slate-500">ID: {order.id?.slice(-6).toUpperCase()}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-slate-600">
                                {order.createdAt?.toDate?.()?.toLocaleDateString()}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {order.createdAt?.toDate?.()?.toLocaleTimeString()}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-bold text-emerald-600">৳{order.price}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="bg-red-50 p-3 rounded-xl border border-red-100 min-w-[200px]">
                                <p className="text-xs font-bold text-red-600 leading-relaxed">
                                  {order.adminNote || (isPremium(order) ? 'No specific reason provided by api call' : 'No specific reason provided by admin')}
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider whitespace-nowrap", getStatusColor('rejected'))}>
                                  <XCircle className="w-3 h-3" />
                                  REJECTED
                                </div>
                                <button
                                  onClick={() => handleDeleteOrder(order.id!)}
                                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete Order"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-20 text-center text-slate-400 italic">
                            No rejected orders found.
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {/* Auto Sign Copy Card */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden text-slate-800 shadow-sm relative">
                    {globalSettings?.isAutoSignMaintenance && (
                      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-3">
                          <Server className="w-6 h-6 text-red-500 animate-pulse" />
                        </div>
                        <h4 className="text-white font-bold text-lg">সার্ভার মেইনটেন্যান্স</h4>
                        <p className="text-slate-300 text-xs mt-1">সার্ভারের কাজ চলছে, কিছুক্ষণ পর আবার চেষ্টা করুন।</p>
                      </div>
                    )}
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
                      {(() => {
                        const { status, order } = getServiceStatus(101);
                        if (status === 'processing') {
                          return (
                            <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 min-h-[300px]">
                              <div className="relative">
                                <div className="w-16 h-16 border-4 border-slate-100 border-t-orange-500 rounded-full animate-spin" />
                                <Zap className="w-6 h-6 text-orange-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                              </div>
                              <div className="space-y-2">
                                <h4 className="text-lg font-bold text-slate-800 animate-pulse uppercase tracking-tight">অর্ডার যাচাই চলছে...</h4>
                                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                  আপনার অর্ডারটি যাচাই করা হচ্ছে। <br />
                                  দয়া করে কিছুক্ষণ অপেক্ষা করুন।
                                </p>
                              </div>
                            </div>
                          );
                        }
                        if (status === 'completed' && order) {
                          return (
                             <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 min-h-[250px] animate-in fade-in zoom-in duration-300">
                                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
                                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                                </div>
                                <div className="space-y-1">
                                  <h4 className="text-lg font-bold text-slate-900 uppercase">সম্পন্ন হয়েছে!</h4>
                                  <p className="text-xs text-slate-500 font-medium">আপনার ফাইলটি এখন ডাউনলোডের জন্য প্রস্তুত।</p>
                                </div>
                                {order.resultFile && (
                                  <a 
                                    href={order.resultFile} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                                  >
                                    <Download className="w-5 h-5" />
                                    ফাইল ডাউনলোড করুন
                                  </a>
                                )}
                                <button 
                                  onClick={() => setDismissedCompletedServices(prev => [...prev, 101])}
                                  className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors pt-2 underline underline-offset-4"
                                >
                                  নতুন অর্ডার করুন
                                </button>
                              </div>
                          );
                        }
                        return (
                          <>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
                              <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-xs font-bold">i</span>
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-800">নতুন সার্চে ৳{calculatePrice(products.find(p => p.id === 101)?.price || 0, products.find(p => p.id === 101)).toFixed(2)} কাটা হবে।</p>
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
                                if (globalSettings?.isAutoSignApiActive) {
                                  // API Mode
                                  setIsPlacingOrder(true);
                                  try {
                                    const p101 = products.find(p => p.id === 101);
                                    const price = calculatePrice(p101?.price || 0, p101);
                                    if (userProfile.balance < price) {
                                      alert('Insufficient balance!');
                                      setIsPlacingOrder(false);
                                      return;
                                    }
                                    
                                    const response = await fetch('/api/service/auto-sign', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ 
                                        nid: autoSignNid,
                                        apiKey: globalSettings.autoSignApiKey || 'mock-key' 
                                      })
                                    });
                                    
                                    const result = await response.json();
                                    if (result.success) {
                                      // Deduct balance and create completed order
                                      await handlePlacePremiumOrder(101, `NID: ${autoSignNid}\n\nAPI Result:\n${JSON.stringify(result.data, null, 2)}`);
                                      setAutoSignNid('');
                                      alert('Auto Sign Copy generated successfully via API!');
                                    } else {
                                      alert(`API Error: ${result.error}`);
                                    }
                                  } catch (error) {
                                    alert('Failed to connect to API');
                                  } finally {
                                    setIsPlacingOrder(false);
                                  }
                                } else {
                                  // Manual Mode
                                  const success = await handlePlacePremiumOrder(101, `NID: ${autoSignNid}`);
                                  if (success) setAutoSignNid('');
                                }
                              }}
                              disabled={!autoSignNid || isPlacingOrder || !(products.find(p => p.id === 101)?.isActive ?? true) || globalSettings?.isAutoSignMaintenance}
                              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              <ShoppingCart className="w-5 h-5" />
                              অর্ডার করুন (৳{calculatePrice(products.find(p => p.id === 101)?.price || 0, products.find(p => p.id === 101)).toFixed(2)})
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden text-slate-800 shadow-sm relative">
                    {globalSettings?.isInfoVerifyMaintenance && (
                      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-3">
                          <Server className="w-6 h-6 text-red-500 animate-pulse" />
                        </div>
                        <h4 className="text-white font-bold text-lg">সার্ভার মেইনটেন্যান্স</h4>
                        <p className="text-slate-300 text-xs mt-1">সার্ভারের কাজ চলছে, কিছুক্ষণ পর আবার চেষ্টা করুন।</p>
                      </div>
                    )}
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
                      {(() => {
                        const { status, order } = getServiceStatus(102);
                        if (status === 'processing') {
                          return (
                            <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 min-h-[350px]">
                              <div className="relative">
                                <div className="w-16 h-16 border-4 border-slate-100 border-t-emerald-600 rounded-full animate-spin" />
                                <Search className="w-6 h-6 text-emerald-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                              </div>
                              <div className="space-y-2">
                                <h4 className="text-lg font-bold text-slate-800 animate-pulse uppercase tracking-tight">অর্ডার যাচাই চলছে...</h4>
                                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                  আপনার অর্ডারটি যাচাই করা হচ্ছে। <br />
                                  দয়া করে কিছুক্ষণ অপেক্ষা করুন।
                                </p>
                              </div>
                            </div>
                          );
                        }
                        if (status === 'completed' && order) {
                           return (
                             <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 min-h-[300px] animate-in fade-in zoom-in duration-300">
                                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
                                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                                </div>
                                <div className="space-y-1">
                                  <h4 className="text-lg font-bold text-slate-900 uppercase">যাচাই সম্পন্ন!</h4>
                                  <p className="text-xs text-slate-500 font-medium">আপনার ফলাফলটি এখন দেখার জন্য প্রস্তুত।</p>
                                </div>
                                {order.note && (
                                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 w-full text-left">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Result Summary</p>
                                    <p className="text-xs font-bold text-slate-700">{order.note}</p>
                                  </div>
                                )}
                                {order.resultFile && (
                                  <a 
                                    href={order.resultFile} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                                  >
                                    <Download className="w-5 h-5" />
                                    ফাইল দেখুন
                                  </a>
                                )}
                                <button 
                                  onClick={() => setDismissedCompletedServices(prev => [...prev, 102])}
                                  className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors pt-2 underline underline-offset-4"
                                >
                                  নতুন যাচাই করুন
                                </button>
                              </div>
                          );
                        }
                        return (
                          <>
                            <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-4 flex gap-3">
                              <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-xs font-bold italic">i</span>
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-700">
                                  প্রতিটি যাচাইয়ের জন্য ৳{calculatePrice(products.find(p => p.id === 102)?.options?.find((opt: any) => opt.name === infoCategory)?.price || products.find(p => p.id === 102)?.price || 0, products.find(p => p.id === 102)).toFixed(2)} কাটা হবে।
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
                                if (globalSettings?.isInfoVerifyApiActive) {
                                  // API Mode
                                  setIsPlacingOrder(true);
                                  try {
                                    const p102 = products.find(p => p.id === 102);
                                    const price = calculatePrice(p102?.options?.find((opt: any) => opt.name === infoCategory)?.price || p102?.price || 0, p102);
                                    if (userProfile.balance < price) {
                                      alert('Insufficient balance!');
                                      setIsPlacingOrder(false);
                                      return;
                                    }
                                    
                                    const response = await fetch('/api/service/info-verify', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ 
                                        category: infoCategory,
                                        number: infoNumber,
                                        apiKey: globalSettings.infoVerifyApiKey || 'mock-key' 
                                      })
                                    });
                                    
                                    const result = await response.json();
                                    if (result.success) {
                                      await handlePlacePremiumOrder(102, `Category: ${infoCategory}\nNumber: ${infoNumber}\n\nAPI Result:\n${JSON.stringify(result.data, null, 2)}`);
                                      setInfoNumber('');
                                      alert('Information verified successfully via API!');
                                    } else {
                                      alert(`API Error: ${result.error}`);
                                    }
                                  } catch (error) {
                                    alert('Failed to connect to API');
                                  } finally {
                                    setIsPlacingOrder(false);
                                  }
                                } else {
                                  // Manual Mode
                                  const success = await handlePlacePremiumOrder(102, `Category: ${infoCategory}\nNumber: ${infoNumber}`);
                                  if (success) setInfoNumber('');
                                }
                              }}
                              disabled={!infoNumber || isPlacingOrder || !(products.find(p => p.id === 102)?.isActive ?? true) || globalSettings?.isInfoVerifyMaintenance}
                              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
                            >
                              <Search className="w-5 h-5" />
                              তথ্য যাচাই করুন (৳{(products.find(p => p.id === 102)?.options?.find((opt: any) => opt.name === infoCategory)?.price || products.find(p => p.id === 102)?.price || 0).toFixed(2)})
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Photo Extraction Card */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden text-slate-800 shadow-sm relative">
                    {globalSettings?.isServerCopyMaintenance && (
                      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-3">
                          <Server className="w-6 h-6 text-red-500 animate-pulse" />
                        </div>
                        <h4 className="text-white font-bold text-lg">সার্ভার মেইনটেন্যান্স</h4>
                        <p className="text-slate-300 text-xs mt-1">সার্ভারের কাজ চলছে, কিছুক্ষণ পর আবার চেষ্টা করুন।</p>
                      </div>
                    )}
                    {!(products.find(p => p.id === 103)?.isActive ?? true) && (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mb-3">
                          <AlertTriangle className="w-6 h-6 text-amber-500" />
                        </div>
                        <h4 className="text-white font-bold text-lg">কাজ বন্ধ আছে</h4>
                        <p className="text-slate-300 text-xs mt-1">এই সার্ভিসটি সাময়িকভাবে বন্ধ রাখা হয়েছে।</p>
                      </div>
                    )}
                    <div className="p-6 border-b border-slate-200">
                      <h3 className="text-xl font-bold text-blue-600 flex items-center gap-2">
                        <Search className="w-6 h-6" />
                        তথ্য খুঁজুন
                      </h3>
                    </div>
                    <div className="p-6 space-y-6">
                      {(() => {
                        const { status, order } = getServiceStatus(103);
                        if (status === 'processing') {
                          return (
                            <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 min-h-[300px]">
                              <div className="relative">
                                <div className="w-16 h-16 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin" />
                                <Search className="w-6 h-6 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                              </div>
                              <div className="space-y-2">
                                <h4 className="text-lg font-bold text-slate-800 animate-pulse uppercase tracking-tight">অর্ডার যাচাই চলছে...</h4>
                                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                  আপনার অর্ডারটি যাচাই করা হচ্ছে। <br />
                                  দয়া করে কিছুক্ষণ অপেক্ষা করুন।
                                </p>
                              </div>
                            </div>
                          );
                        }
                        if (status === 'completed' && order) {
                           return (
                             <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 min-h-[280px] animate-in fade-in zoom-in duration-300">
                                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-2">
                                  <CheckCircle2 className="w-8 h-8 text-blue-600" />
                                </div>
                                <div className="space-y-1">
                                  <h4 className="text-lg font-bold text-slate-900 uppercase">তথ্য পাওয়া গেছে!</h4>
                                  <p className="text-xs text-slate-500 font-medium">আপনার ফাইলটি এখন ডাউনলোডের জন্য প্রস্তুত।</p>
                                </div>
                                {order.resultFile && (
                                  <a 
                                    href={order.resultFile} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-500/20"
                                  >
                                    <Download className="w-5 h-5" />
                                    ফাইল ডাউনলোড করুন
                                  </a>
                                )}
                                <button 
                                  onClick={() => setDismissedCompletedServices(prev => [...prev, 103])}
                                  className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors pt-2 underline underline-offset-4"
                                >
                                  নতুন অর্ডার করুন
                                </button>
                              </div>
                          );
                        }
                        return (
                          <>
                            <div className="space-y-2">
                              <label className="block text-sm font-bold text-slate-700">এনআইডি নম্বর (NID)</label>
                              <input 
                                type="text" 
                                value={photoNid || ''}
                                onChange={(e) => setPhotoNid(e.target.value)}
                                placeholder="যেমন: 1981493909"
                                className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="block text-sm font-bold text-slate-700">জন্ম তারিখ (YYYY-MM-DD)</label>
                              <input 
                                type="text" 
                                value={photoDob || ''}
                                onChange={(e) => setPhotoDob(e.target.value)}
                                placeholder="যেমন: 2007-05-26"
                                className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                              />
                            </div>

                            <button 
                              onClick={async () => {
                                if (globalSettings?.isServerCopyApiActive) {
                                  // API Mode
                                  setIsPlacingOrder(true);
                                  try {
                                    const p103 = products.find(p => p.id === 103);
                                    const price = calculatePrice(p103?.price || 0, p103);
                                    if (userProfile.balance < price) {
                                      alert('Insufficient balance!');
                                      setIsPlacingOrder(false);
                                      return;
                                    }
                                    
                                    const response = await fetch('/api/service/server-copy', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ 
                                        nid: photoNid,
                                        dob: photoDob,
                                        apiKey: globalSettings.serverCopyApiKey || 'mock-key' 
                                      })
                                    });
                                    
                                    const result = await response.json();
                                    if (result.success) {
                                      await handlePlacePremiumOrder(103, `NID: ${photoNid}\nDOB: ${photoDob}\n\nAPI Result:\n${JSON.stringify(result.data, null, 2)}`);
                                      setPhotoNid('');
                                      setPhotoDob('');
                                      alert('Server copy extracted successfully via API!');
                                    } else {
                                      alert(`API Error: ${result.error}`);
                                    }
                                  } catch (error) {
                                    alert('Failed to connect to API');
                                  } finally {
                                    setIsPlacingOrder(false);
                                  }
                                } else {
                                  // Manual Mode
                                  const success = await handlePlacePremiumOrder(103, `NID: ${photoNid}\nDOB: ${photoDob}`);
                                  if (success) {
                                    setPhotoNid('');
                                    setPhotoDob('');
                                  }
                                }
                              }}
                              disabled={!photoNid || !photoDob || isPlacingOrder || !(products.find(p => p.id === 103)?.isActive ?? true) || globalSettings?.isServerCopyMaintenance}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-500/20"
                            >
                              <Edit3 className="w-5 h-5" />
                              ছবি বের করুন (চার্জ ৳{calculatePrice(products.find(p => p.id === 103)?.price || 85, products.find(p => p.id === 103))})
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Auto NID Card */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden text-slate-800 shadow-sm relative">
                    {globalSettings?.isAutoNidMaintenance && (
                      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-3">
                          <Server className="w-6 h-6 text-red-500 animate-pulse" />
                        </div>
                        <h4 className="text-white font-bold text-lg">সার্ভার মেইনটেন্যান্স</h4>
                        <p className="text-slate-300 text-xs mt-1">সার্ভারের কাজ চলছে, কিছুক্ষণ পর আবার চেষ্টা করুন।</p>
                      </div>
                    )}
                    {!(products.find(p => p.id === 104)?.isActive ?? true) && (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mb-3">
                          <AlertTriangle className="w-6 h-6 text-amber-500" />
                        </div>
                        <h4 className="text-white font-bold text-lg">কাজ বন্ধ আছে</h4>
                        <p className="text-slate-300 text-xs mt-1">এই সার্ভিসটি সাময়িকভাবে বন্ধ রাখা হয়েছে।</p>
                      </div>
                    )}
                    <div className="p-6 border-b border-slate-200">
                      <h3 className="text-xl font-bold text-purple-600 flex items-center gap-2">
                        <CreditCard className="w-6 h-6" />
                        অটো এনআইডি
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">অটোমেটিক এনআইডি কার্ড মেকার</p>
                    </div>
                    <div className="p-6 space-y-6">
                      {(() => {
                        const { status, order } = getServiceStatus(104);
                        if (status === 'processing') {
                          return (
                            <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 min-h-[300px]">
                              <div className="relative">
                                <div className="w-16 h-16 border-4 border-slate-100 border-t-purple-600 rounded-full animate-spin" />
                                <CreditCard className="w-6 h-6 text-purple-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                              </div>
                              <div className="space-y-2">
                                <h4 className="text-lg font-bold text-slate-800 animate-pulse uppercase tracking-tight">অর্ডার যাচাই চলছে...</h4>
                                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                  আপনার অর্ডারটি যাচাই করা হচ্ছে। <br />
                                  দয়া করে কিছুক্ষণ অপেক্ষা করুন।
                                </p>
                              </div>
                            </div>
                          );
                        }
                        if (status === 'completed' && order) {
                           return (
                             <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 min-h-[280px] animate-in fade-in zoom-in duration-300">
                                <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mb-2">
                                  <CheckCircle2 className="w-8 h-8 text-purple-600" />
                                </div>
                                <div className="space-y-1">
                                  <h4 className="text-lg font-bold text-slate-900 uppercase">কার্ড প্রস্তুত!</h4>
                                  <p className="text-xs text-slate-500 font-medium">আপনার এনআইডি ফাইলটি এখন ডাউনলোডের জন্য প্রস্তুত।</p>
                                </div>
                                {order.resultFile && (
                                  <a 
                                    href={order.resultFile} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-purple-500/20"
                                  >
                                    <Download className="w-5 h-5" />
                                    ডাউনলোড করুন
                                  </a>
                                )}
                                <button 
                                  onClick={() => setDismissedCompletedServices(prev => [...prev, 104])}
                                  className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors pt-2 underline underline-offset-4"
                                >
                                  নতুন অর্ডার করুন
                                </button>
                              </div>
                          );
                        }
                        return (
                          <>
                            <div className="space-y-2">
                              <label className="block text-sm font-bold text-slate-700">এনআইডি নম্বর</label>
                              <input 
                                type="text" 
                                value={autoNidNumber || ''}
                                onChange={(e) => setAutoNidNumber(e.target.value)}
                                placeholder="1234567890"
                                className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="block text-sm font-bold text-slate-700">জন্ম তারিখ (YYYY-MM-DD)</label>
                              <input 
                                type="text" 
                                value={autoNidDob || ''}
                                onChange={(e) => setAutoNidDob(e.target.value)}
                                placeholder="2000-01-01"
                                className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                              />
                            </div>
                            <button 
                              onClick={async () => {
                                if (globalSettings?.isAutoNidApiActive) {
                                  setIsPlacingOrder(true);
                                  try {
                                    const p104 = products.find(p => p.id === 104);
                                    const price = calculatePrice(p104?.price || 0, p104);
                                    if (userProfile.balance < price) {
                                      alert('Insufficient balance!');
                                      setIsPlacingOrder(false);
                                      return;
                                    }
                                    
                                    const response = await fetch('/api/service/auto-nid', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ 
                                        nid: autoNidNumber,
                                        dob: autoNidDob,
                                        apiKey: globalSettings.autoNidApiKey || 'mock-key' 
                                      })
                                    });
                                    
                                    const result = await response.json();
                                    if (result.success) {
                                      await handlePlacePremiumOrder(104, `NID: ${autoNidNumber}\nDOB: ${autoNidDob}\n\nAPI Result:\n${JSON.stringify(result.data, null, 2)}`);
                                      setAutoNidNumber('');
                                      setAutoNidDob('');
                                      alert('Auto NID generated successfully via API!');
                                    } else {
                                      alert(`API Error: ${result.error}`);
                                    }
                                  } catch (error) {
                                    alert('Failed to connect to API');
                                  } finally {
                                    setIsPlacingOrder(false);
                                  }
                                } else {
                                  const success = await handlePlacePremiumOrder(104, `NID: ${autoNidNumber}\nDOB: ${autoNidDob}`);
                                  if (success) {
                                    setAutoNidNumber('');
                                    setAutoNidDob('');
                                  }
                                }
                              }}
                              disabled={!autoNidNumber || !autoNidDob || isPlacingOrder || !(products.find(p => p.id === 104)?.isActive ?? true) || globalSettings?.isAutoNidMaintenance}
                              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              <CreditCard className="w-5 h-5" />
                              অর্ডার করুন (৳{calculatePrice(products.find(p => p.id === 104)?.price || 100, products.find(p => p.id === 104))})
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Smart Voter Search Card */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden text-slate-800 shadow-sm relative">
                    {!(products.find(p => p.id === 105)?.isActive ?? true) && (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mb-3">
                          <AlertTriangle className="w-6 h-6 text-amber-500" />
                        </div>
                        <h4 className="text-white font-bold text-lg">কাজ বন্ধ আছে</h4>
                        <p className="text-slate-300 text-xs mt-1">এই সার্ভিসটি সাময়িকভাবে বন্ধ রাখা হয়েছে।</p>
                      </div>
                    )}
                    <div className="p-6 border-b border-slate-200">
                      <h3 className="text-xl font-bold text-teal-600 flex items-center gap-2">
                        <UserCheck className="w-6 h-6" />
                        স্মার্ট ভোটার অনুসন্ধান
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">ভোটার তথ্য ও ফাইল অনুসন্ধান করুন</p>
                    </div>
                    <div className="p-6 space-y-6">
                      {(() => {
                        const { status, order } = getServiceStatus(105);
                        if (status === 'processing') {
                          return (
                            <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 min-h-[300px]">
                              <div className="relative">
                                <div className="w-16 h-16 border-4 border-slate-100 border-t-teal-600 rounded-full animate-spin" />
                                <Search className="w-6 h-6 text-teal-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                              </div>
                              <div className="space-y-2">
                                <h4 className="text-lg font-bold text-slate-800 animate-pulse uppercase tracking-tight">অর্ডার যাচাই চলছে...</h4>
                                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                  আপনার অর্ডারটি যাচাই করা হচ্ছে। <br />
                                  দয়া করে কিছুক্ষণ অপেক্ষা করুন।
                                </p>
                              </div>
                            </div>
                          );
                        }
                        if (status === 'completed' && order) {
                           return (
                             <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 min-h-[250px] animate-in fade-in zoom-in duration-300">
                                <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mb-2">
                                  <CheckCircle2 className="w-8 h-8 text-teal-600" />
                                </div>
                                <div className="space-y-1">
                                  <h4 className="text-lg font-bold text-slate-900 uppercase">সম্পন্ন হয়েছে!</h4>
                                  <p className="text-xs text-slate-500 font-medium">আপনার ফাইলটি এখন ডাউনলোডের জন্য প্রস্তুত।</p>
                                </div>
                                {order.resultFile && (
                                  <a 
                                    href={order.resultFile} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-teal-500/20"
                                  >
                                    <Download className="w-5 h-5" />
                                    ফাইল ডাউনলোড করুন
                                  </a>
                                )}
                                <button 
                                  onClick={() => setDismissedCompletedServices(prev => [...prev, 105])}
                                  className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors pt-2 underline underline-offset-4"
                                >
                                  নতুন করে অনুসন্ধান করুন
                                </button>
                              </div>
                           );
                        }
                        return (
                          <div className="flex flex-col items-center justify-center py-8 space-y-4">
                            <UserCheck className="w-12 h-12 text-teal-500 mb-2" />
                            <p className="text-center text-sm text-slate-600">ভোটার তথ্য অনুসন্ধানের জন্য ফরমটি পূরণ করুন।</p>
                            <button 
                              onClick={() => setSmartVoterModalOpen(true)}
                              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                              <Search className="w-5 h-5" />
                              অনুসন্ধান করুন (৳{calculatePrice(products.find(p => p.id === 105)?.price || 50, products.find(p => p.id === 105))})
                            </button>
                          </div>
                        );
                      })()}
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
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-xl font-bold text-slate-900">Profile Settings</h2>
                  <p className="text-sm text-slate-500 mt-1">Update your personal information</p>
                </div>
                <div className="p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <img 
                      src={profileForm.photoURL || `https://ui-avatars.com/api/?name=${profileForm.displayName || 'User'}&background=random`} 
                      alt="Profile" 
                      className="w-24 h-24 rounded-2xl object-cover border-4 border-slate-50 shadow-xl"
                    />
                    <div className="space-y-4 flex-1 w-full">
                      <label className="text-sm font-medium text-slate-500">Select Profile Picture</label>
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                        {avatars.map((avatar) => (
                          <button
                            key={avatar}
                            onClick={() => setProfileForm({ ...profileForm, photoURL: avatar })}
                            className={cn(
                              "relative w-10 h-10 rounded-xl overflow-hidden border-2 transition-all hover:scale-110",
                              profileForm.photoURL === avatar ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-slate-200 hover:border-slate-400"
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
                        <div className="relative w-10 h-10 rounded-xl overflow-hidden border-2 border-dashed border-slate-200 hover:border-indigo-500 transition-all cursor-pointer flex items-center justify-center bg-slate-50 hover:bg-slate-100">
                          <Upload className="w-5 h-5 text-slate-400 pointer-events-none" />
                          <input 
                            type="file" 
                            className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" 
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
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-500">Display Name</label>
                      <input 
                        type="text" 
                        value={profileForm.displayName || ''}
                        onChange={(e) => setProfileForm({...profileForm, displayName: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                        placeholder="Your Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-500">User ID</label>
                      <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm text-indigo-600 font-bold">
                        {userProfile.userId || 'N/A'}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-500">API Key (for Resellers)</label>
                      <div className="flex gap-2">
                        <div className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-600 truncate">
                          {userProfile.apiKey || 'No API Key generated yet'}
                        </div>
                        {userProfile.apiKey && (
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(userProfile.apiKey!);
                              alert('API Key copied to clipboard!');
                            }}
                            className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all"
                          >
                            Copy
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400">Contact admin if you need an API Key for reselling.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-500">WhatsApp Number</label>
                      <input 
                        type="tel" 
                        value={profileForm.whatsapp || ''}
                        onChange={(e) => setProfileForm({...profileForm, whatsapp: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                        placeholder="017XXXXXXXX"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-500">Password</label>
                      <div className="relative">
                        <input 
                          type={showPassword ? "text" : "password"}
                          value={profileForm.password || ''}
                          onChange={(e) => setProfileForm({...profileForm, password: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900"
                          placeholder="Enter new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button 
                      onClick={() => {
                        if (updateUserProfile) {
                          updateUserProfile(profileForm.displayName, profileForm.photoURL, profileForm.whatsapp, profileForm.password);
                        }
                      }}
                      className="w-full sm:w-auto bg-brand text-white px-8 py-3.5 rounded-xl font-bold hover:bg-brand-dark transition-all shadow-lg shadow-brand/20 active:scale-95 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      Update Profile
                    </button>
                  </div>
                </div>
              </div>

              {/* Theme Color Settings */}
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center">
                    <Zap className="w-5 h-5 text-brand" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">থিম কালার</h2>
                    <p className="text-sm text-slate-500">আপনার পছন্দের কালারটি সিলেক্ট করুন</p>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  <div className="space-y-4">
                    <label className="text-sm font-bold text-slate-700">একটি কালার সিলেক্ট করুন</label>
                    <div className="flex flex-wrap gap-4">
                      {themeColors.map((theme) => (
                        <button
                          key={theme.name}
                          onClick={() => handleUpdateThemeColor(theme.color)}
                          className={cn(
                            "w-10 h-10 rounded-full transition-all hover:scale-110",
                            selectedThemeColor === theme.color ? "ring-4 ring-offset-2 ring-brand" : ""
                          )}
                          style={{ backgroundColor: theme.color }}
                          title={theme.name}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <label className="text-sm font-bold text-slate-700">কাস্টম কালার</label>
                    <div className="flex flex-wrap items-center gap-4">
                      <input 
                        type="color" 
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                        className="w-full h-12 rounded-xl cursor-pointer border border-slate-200"
                      />
                      <button 
                        onClick={() => handleUpdateThemeColor(customColor)}
                        className="flex-1 min-w-[120px] bg-brand text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-dark transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        প্রয়োগ করুন
                      </button>
                      <button 
                        onClick={() => handleUpdateThemeColor('#10b981')}
                        className="flex-1 min-w-[120px] bg-slate-100 text-slate-600 px-6 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                      >
                        <History className="w-4 h-4" />
                        রিসেট
                      </button>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <p className="text-xs text-slate-500 font-medium tracking-tight">এই কালারটি বাটন, স্ক্রলবার, এবং অনেক জায়গায় হাইলাইট হিসেবে ব্যবহার হবে।</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Login & Security */}
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-brand" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">লগইন ও সিকিউরিটি</h2>
                    <p className="text-sm text-slate-500">আপনার অ্যাকাউন্ট কোথা থেকে লগইন হয়েছে এবং কোন সেশনগুলো চালু আছে তা মনিটর করুন</p>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Current Session */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">এই সেশন</h3>
                      <div className="space-y-3">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Session ID</label>
                          <p className="text-sm font-medium text-slate-900 truncate font-mono">{localStorage.getItem('sessionId') || 'Unknown'}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">IP Address</label>
                          <p className="text-sm font-medium text-slate-900">103.234.203.55</p> 
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Device / Browser</label>
                          <p className="text-[10px] font-medium text-slate-700 leading-relaxed">{navigator.userAgent}</p>
                        </div>
                      </div>
                    </div>

                    {/* Security Actions */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">সিকিউরিটি একশন</h3>
                      <div className="space-y-3">
                        <button 
                          onClick={handleLogoutOtherSessions}
                          className="w-full h-12 bg-brand text-white rounded-xl font-bold hover:bg-brand-dark transition-all flex items-center justify-center gap-2"
                        >
                          <LogOut className="w-4 h-4 rotate-180" />
                          অন্যান্য সেশন লগআউট
                        </button>
                        <button 
                          onClick={handleLogoutAllSessions}
                          className="w-full h-12 bg-red-100 text-red-600 rounded-xl font-bold hover:bg-red-200 transition-all flex items-center justify-center gap-2"
                        >
                          <LogOut className="w-4 h-4" />
                          সব সেশন থেকে লগআউট
                        </button>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                          <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            <span className="font-bold text-slate-700">টিপস:</span> "অন্যান্য সেশন লগআউট" করলে আপনার এই ডিভাইসের লগইন থাকবে, বাকি সব ডিভাইস থেকে বের হয়ে যাবে।
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sessions & Login History */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 uppercase">একটিভ সেশন ({sessions.length})</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-brand/10 text-brand rounded-full">{sessions.length} টি</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                          <th className="px-6 py-4">Session / Device</th>
                          <th className="px-6 py-4">IP</th>
                          <th className="px-6 py-4">Last Seen</th>
                          <th className="px-6 py-4">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {sessions.map((sess) => (
                          <tr key={sess.id}>
                            <td className="px-6 py-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-800 truncate block max-w-[80px] font-mono">{sess.id}</span>
                                  {sess.id === localStorage.getItem('sessionId') && (
                                    <span className="text-[8px] font-black bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded uppercase tracking-tighter">Current</span>
                                  )}
                                </div>
                                <p className="text-[8px] text-slate-500 leading-tight max-w-[120px] line-clamp-3">{sess.userAgent}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-600 text-xs">{sess.ip || '103.234.203.55'}</td>
                            <td className="px-6 py-4 text-xs font-medium text-slate-500">{sess.lastSeen?.toDate().toLocaleString() || 'N/A'}</td>
                            <td className="px-6 py-4">
                              {sess.id !== localStorage.getItem('sessionId') && (
                                <button 
                                  onClick={async () => {
                                    await updateDoc(doc(db, 'sessions', sess.id), { active: false });
                                    alert('Session terminated.');
                                  }}
                                  className="text-red-500 hover:text-red-700 transition-colors"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              )}
                              {sess.id === localStorage.getItem('sessionId') && (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 uppercase">লগইন হিস্ট্রি</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">{loginHistory.length} টি</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                          <th className="px-6 py-4">সময়</th>
                          <th className="px-6 py-4">IP</th>
                          <th className="px-6 py-4">Device</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {loginHistory.map((hist) => (
                          <tr key={hist.id}>
                            <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-700 text-xs">
                              {hist.timestamp?.toDate().toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-600 text-xs">{hist.ip || '103.234.203.55'}</td>
                            <td className="px-6 py-4 text-[9px] text-slate-500 max-w-[150px] line-clamp-2">{hist.userAgent}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Order Modal */}
      <AnimatePresence>
        {selectedProduct && (() => {
          const isDriveLinkMode = selectedProduct.isDriveLinkMode || 
            (selectedProduct.id === 13 && globalSettings?.isSmartCardApiActive) ||
            (selectedProduct.id === 19 && globalSettings?.isNicknameApiActive) ||
            (selectedProduct.id === 21 && globalSettings?.isVaccineCardApiActive) ||
            (selectedProduct.id === 20 && globalSettings?.isPscVectorApiActive);

          return (
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

                  {/* Demo Button */}
                  {selectedProduct.demoUrl && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDemoModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 font-bold hover:bg-amber-500/20 transition-all text-xs"
                    >
                      <Eye className="w-4 h-4" />
                      View Demo / ডেমো দেখুন
                    </button>
                  )}

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
                                ৳{calculatePrice(option.price, selectedProduct || undefined)}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <label className="text-sm font-bold text-slate-400 flex items-center gap-2">
                        <Edit3 className="w-4 h-4" />
                        {isDriveLinkMode ? "Google Drive Link (গুগল ড্রাইভ লিংক)" : "Order Details / Data"} <span className="text-red-500">*</span>
                      </label>
                      {isDriveLinkMode ? (
                        <div className="space-y-2">
                          <input 
                            type="url"
                            value={orderData || ''}
                            onChange={(e) => setOrderData(e.target.value)}
                            placeholder="https://drive.google.com/..."
                            className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-4 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                          />
                          <p className="text-[10px] text-indigo-400 italic">
                            * এপিআই মোড চালু আছে। দয়া করে আপনার ফাইলের গুগল ড্রাইভ লিংকটি এখানে দিন।
                          </p>
                        </div>
                      ) : (
                        <textarea 
                          value={orderData || ''}
                          onChange={(e) => setOrderData(e.target.value)}
                          placeholder={selectedProduct.defaultData ? "Fill in the template below..." : "Enter the required information for this service..."}
                          className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-4 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all min-h-[200px] resize-none font-medium"
                        />
                      )}
                    </div>

                    <div className="space-y-4">
                      <label className="text-sm font-bold text-slate-400 flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        {selectedProduct.requiresFileUpload ? "Upload Document (Required)" : "Upload Document (Optional)"}
                        {selectedProduct.requiresFileUpload && <span className="text-red-500">*</span>}
                      </label>
                      <div className="flex flex-wrap items-center justify-start w-full gap-4">
                        {orderFiles.length === 0 ? (
                          <div className="relative flex flex-col items-center justify-center w-full h-28 border-2 border-slate-700 border-dashed rounded-2xl cursor-pointer bg-slate-800/50 hover:bg-slate-800 transition-all overflow-hidden">
                            <input 
                              type="file" 
                              className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 5 * 1024 * 1024) {
                                    alert('File is too large. Please upload a file smaller than 5MB.');
                                    return;
                                  }
                                  if (!['image/jpeg', 'image/png', 'application/pdf', 'application/zip', 'application/x-zip-compressed'].includes(file.type)) {
                                    alert('Invalid file type. Please upload an image, PDF, or ZIP file. Word files are not allowed directly.');
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setOrderFiles([reader.result as string]);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            <div className="flex flex-col items-center justify-center pt-5 pb-6 pointer-events-none z-0 relative">
                              <Plus className="w-6 h-6 text-slate-500 mb-2" />
                              <p className="text-xs text-slate-500">Click to upload document</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-4 w-full">
                            {orderFiles.map((file, index) => (
                              <div key={index} className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-emerald-500/30 bg-slate-800 flex flex-col items-center justify-center group">
                                {file.startsWith('data:image/') ? (
                                  <img src={file} className="w-full h-full object-cover" alt="upload preview" />
                                ) : (
                                  <>
                                    <CheckCircle className="w-8 h-8 text-emerald-400 mb-1" />
                                    <span className="text-[10px] font-bold text-slate-300 break-words px-1 cursor-pointer" onClick={() => window.open(file, '_blank')}>Document {index + 1}</span>
                                  </>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => { e.preventDefault(); setOrderFiles(orderFiles.filter((_, i) => i !== index)); }}
                                  className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all z-10"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                            <div className="relative flex flex-col items-center justify-center w-24 h-24 border-none rounded-2xl cursor-pointer bg-[#3b82f6] hover:bg-[#2563eb] transition-all shadow-lg shadow-blue-500/20 active:scale-95 overflow-hidden">
                              <Plus className="w-8 h-8 text-white stroke-[3] pointer-events-none" />
                              <input 
                                type="file" 
                                className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" 
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    if (file.size > 5 * 1024 * 1024) {
                                      alert('File is too large. Please upload a file smaller than 5MB.');
                                      return;
                                    }
                                    if (!['image/jpeg', 'image/png', 'application/pdf', 'application/zip', 'application/x-zip-compressed'].includes(file.type)) {
                                      alert('Invalid file type. Please upload an image, PDF, or ZIP file. Word files are not allowed directly.');
                                      return;
                                    }
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setOrderFiles([...orderFiles, reader.result as string]);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </div>
                          </div>
                        )}
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
                    disabled={isPlacingOrder || userProfile.balance < currentPrice || !orderData || (selectedProduct.requiresFileUpload && orderFiles.length === 0)}
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
        );
      })()}
      </AnimatePresence>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 px-4 py-2 flex items-center justify-around z-50 pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
        <button 
          onClick={() => setActiveTab('services')} 
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-2xl transition-all relative",
            activeTab === 'services' ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <LayoutDashboard className={cn("w-6 h-6 transition-transform", activeTab === 'services' && "scale-110")} />
          <span className="text-[10px] font-bold">Services</span>
          {activeTab === 'services' && (
            <motion.div layoutId="mobile-nav-active" className="absolute -bottom-2 w-1 h-1 bg-indigo-600 rounded-full" />
          )}
        </button>
        <button 
          onClick={() => setActiveTab('history')} 
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-2xl transition-all relative",
            activeTab === 'history' ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <History className={cn("w-6 h-6 transition-transform", activeTab === 'history' && "scale-110")} />
          <span className="text-[10px] font-bold">History</span>
          {activeTab === 'history' && (
            <motion.div layoutId="mobile-nav-active" className="absolute -bottom-2 w-1 h-1 bg-indigo-600 rounded-full" />
          )}
        </button>
        <button 
          onClick={() => setActiveTab('rejected')} 
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-2xl transition-all relative",
            activeTab === 'rejected' ? "text-red-600" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <XCircle className={cn("w-6 h-6 transition-transform", activeTab === 'rejected' && "scale-110")} />
          <span className="text-[10px] font-bold">Rejected</span>
          {activeTab === 'rejected' && (
            <motion.div layoutId="mobile-nav-active" className="absolute -bottom-2 w-1 h-1 bg-red-600 rounded-full" />
          )}
        </button>
        <button 
          onClick={() => setShowRechargeModal(true)} 
          className="flex flex-col items-center gap-1 -mt-10 group"
        >
          <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/40 border-4 border-white group-active:scale-95 transition-transform">
            <Wallet className="w-7 h-7 text-white" />
          </div>
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Recharge</span>
        </button>
        <button 
          onClick={() => setActiveTab('premium')} 
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-2xl transition-all relative",
            activeTab === 'premium' ? "text-yellow-600" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <Crown className={cn("w-6 h-6 transition-transform", activeTab === 'premium' && "scale-110")} />
          <span className="text-[10px] font-bold">Premium</span>
          {activeTab === 'premium' && (
            <motion.div layoutId="mobile-nav-active" className="absolute -bottom-2 w-1 h-1 bg-yellow-600 rounded-full" />
          )}
        </button>
        <button 
          onClick={() => setActiveTab('settings')} 
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-2xl transition-all relative",
            activeTab === 'settings' ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <Settings className={cn("w-6 h-6 transition-transform", activeTab === 'settings' && "scale-110")} />
          <span className="text-[10px] font-bold">Settings</span>
          {activeTab === 'settings' && (
            <motion.div layoutId="mobile-nav-active" className="absolute -bottom-2 w-1 h-1 bg-indigo-600 rounded-full" />
          )}
        </button>
      </div>

      {/* Success Notification */}
      <AnimatePresence>
        {showSuccess && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white border border-slate-200 rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center"
            >
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">Order Success!</h2>
              <p className="text-slate-500 mb-8">আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে।</p>
              
              {/* Removed success link display */}
              
              <button 
                onClick={() => {
                  setShowSuccess(false);
                  setSuccessLink(null);
                  setSelectedProduct(null);
                  setOrderData('');
                  setOrderFiles([]);
                }}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
              >
                Close
              </button>
            </motion.div>
          </div>
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
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-8 space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-black text-slate-900">Recharge Balance</h2>
                <p className="text-sm text-slate-500">Send money to any of these numbers</p>
              </div>

              <div className="space-y-3">
                {globalSettings?.bkashNumber && (
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Bkash</span>
                    <span className="font-black text-slate-900 text-lg">{globalSettings.bkashNumber}</span>
                  </div>
                )}
                {globalSettings?.nagadNumber && (
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Nagad</span>
                    <span className="font-black text-slate-900 text-lg">{globalSettings.nagadNumber}</span>
                  </div>
                )}
                {globalSettings?.rocketNumber && (
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Rocket</span>
                    <span className="font-black text-slate-900 text-lg">{globalSettings.rocketNumber}</span>
                  </div>
                )}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
                  <Info className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <p className="text-xs text-amber-700 font-medium">Minimum recharge amount is ৳100.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Amount</label>
                  <input 
                    type="number" 
                    placeholder="Min 100৳" 
                    value={rechargeData.amount || ''} 
                    onChange={(e) => setRechargeData({...rechargeData, amount: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Sender Number</label>
                  <input 
                    type="text" 
                    placeholder="017XXXXXXXX" 
                    value={rechargeData.senderNumber || ''} 
                    onChange={(e) => setRechargeData({...rechargeData, senderNumber: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Transaction ID</label>
                  <input 
                    type="text" 
                    placeholder="TRX12345678" 
                    value={rechargeData.trxID || ''} 
                    onChange={(e) => setRechargeData({...rechargeData, trxID: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900" 
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setShowRechargeModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all">Cancel</button>
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

                    // Send SMS to admin
                    sendAdminNotifications(`New Recharge Request! User: ${userProfile.email}, Amount: ৳${amount}, TrxID: ${rechargeData.trxID}`);

                    setShowRechargeModal(false);
                    setRechargeData({ amount: '', senderNumber: '', trxID: '' });
                    alert('Recharge request sent to admin.');
                  }}
                  className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all"
                >
                  Send Request
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

        {smartVoterModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-lg w-full space-y-6 relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-slate-800">স্মার্ট ভোটার অনুসন্ধান</h2>
                <button onClick={() => setSmartVoterModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 group transition-all">
                  <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                </button>
              </div>

              {(() => {
                const { status, order } = getServiceStatus(105);
                if (status === 'processing') {
                  return (
                    <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                      <div className="relative">
                        <div className="w-16 h-16 border-4 border-slate-100 border-t-teal-600 rounded-full animate-spin" />
                        <Search className="w-6 h-6 text-teal-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-lg font-bold text-slate-800 animate-pulse tracking-tight">অনুসন্ধান করা হচ্ছে...</h4>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                          আপনার ভোটার তথ্যটি অনুসন্ধান করা হচ্ছে। <br />
                          দয়া করে কিছুক্ষণ অপেক্ষা করুন।
                        </p>
                      </div>
                    </div>
                  );
                }
                if (status === 'completed' && order) {
                   return (
                     <div className="flex flex-col items-center justify-center p-4 text-center space-y-4 animate-in fade-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mb-2">
                          <CheckCircle2 className="w-8 h-8 text-teal-600" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-lg font-bold text-slate-900 uppercase">তথ্য পাওয়া গেছে!</h4>
                          <p className="text-xs text-slate-500 font-medium">আপনার ভোটার তথ্যটি এখন দেখার জন্য প্রস্তুত।</p>
                        </div>
                        {order.resultFile && (
                          <a 
                            href={order.resultFile} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-teal-500/20"
                          >
                            <Download className="w-5 h-5" />
                            ফাইল ডাউনলোড করুন
                          </a>
                        )}
                        <button 
                          onClick={() => setDismissedCompletedServices(prev => [...prev, 105])}
                          className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors pt-2 underline underline-offset-4"
                        >
                          নতুন করে অনুসন্ধান করুন
                        </button>
                      </div>
                  );
                }
                return (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <input type="text" placeholder="বিভাগ" className="border border-slate-200 p-3 rounded-xl text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 outline-none hover:border-teal-200 transition-all" value={smartVoterData.division || ''} onChange={(e) => setSmartVoterData({...smartVoterData, division: e.target.value})} />
                      <input type="text" placeholder="জেলা" className="border border-slate-200 p-3 rounded-xl text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 outline-none hover:border-teal-200 transition-all" value={smartVoterData.district || ''} onChange={(e) => setSmartVoterData({...smartVoterData, district: e.target.value})} />
                      <input type="text" placeholder="আসন" className="border border-slate-200 p-3 rounded-xl text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 outline-none hover:border-teal-200 transition-all" value={smartVoterData.seat || ''} onChange={(e) => setSmartVoterData({...smartVoterData, seat: e.target.value})} />
                      <input type="text" placeholder="উপজেলা" className="border border-slate-200 p-3 rounded-xl text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 outline-none hover:border-teal-200 transition-all" value={smartVoterData.upazila || ''} onChange={(e) => setSmartVoterData({...smartVoterData, upazila: e.target.value})} />
                      <input type="text" placeholder="ইউনিয়ন" className="border border-slate-200 p-3 rounded-xl text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 outline-none hover:border-teal-200 transition-all" value={smartVoterData.union || ''} onChange={(e) => setSmartVoterData({...smartVoterData, union: e.target.value})} />
                      <input type="text" placeholder="কেন্দ্র" className="border border-slate-200 p-3 rounded-xl text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 outline-none hover:border-teal-200 transition-all" value={smartVoterData.center || ''} onChange={(e) => setSmartVoterData({...smartVoterData, center: e.target.value})} />
                    </div>
                    <input type="text" placeholder="নাম" className="w-full border border-slate-200 p-3 rounded-xl text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 outline-none hover:border-teal-200 transition-all" value={smartVoterData.name || ''} onChange={(e) => setSmartVoterData({...smartVoterData, name: e.target.value})} />
                    <input type="text" placeholder="পিতার নাম" className="w-full border border-slate-200 p-3 rounded-xl text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 outline-none hover:border-teal-200 transition-all" value={smartVoterData.fatherName || ''} onChange={(e) => setSmartVoterData({...smartVoterData, fatherName: e.target.value})} />
                    <input type="text" placeholder="মাতার নাম" className="w-full border border-slate-200 p-3 rounded-xl text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 outline-none hover:border-teal-200 transition-all" value={smartVoterData.motherName || ''} onChange={(e) => setSmartVoterData({...smartVoterData, motherName: e.target.value})} />
                    <input type="date" placeholder="জন্ম তারিখ" className="w-full border border-slate-200 p-3 rounded-xl text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 outline-none hover:border-teal-200 transition-all" value={smartVoterData.dob || ''} onChange={(e) => setSmartVoterData({...smartVoterData, dob: e.target.value})} />
                    <div className="flex gap-4 pt-2">
                      <button onClick={() => setSmartVoterModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all active:scale-95">বাতিল</button>
                      <button 
                        onClick={async () => {
                          const p105 = products.find(p => p.id === 105);
                          const price = calculatePrice(p105?.price || 50, p105);
                          if (userProfile.balance < price) {
                            alert('ইনসাফিসিয়েন্ট ব্যালেন্স!');
                            return;
                          }
                          const details = `Division: ${smartVoterData.division}\nDistrict: ${smartVoterData.district}\nSeat: ${smartVoterData.seat}\nUpazila: ${smartVoterData.upazila}\nUnion: ${smartVoterData.union}\nCenter: ${smartVoterData.center}\nName: ${smartVoterData.name}\nFather: ${smartVoterData.fatherName}\nMother: ${smartVoterData.motherName}\nDOB: ${smartVoterData.dob}`;
                          const success = await handlePlacePremiumOrder(105, details);
                          if (success) {
                            setSmartVoterData({});
                          }
                        }} 
                        disabled={isPlacingOrder || !smartVoterData.name || !smartVoterData.dob}
                        className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50 active:scale-95"
                      >
                        {isPlacingOrder ? 'অর্ডার হচ্ছে...' : `অনুসন্ধান করুন (৳${calculatePrice(products.find(p => p.id === 105)?.price || 50, products.find(p => p.id === 105))})`}
                      </button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </div>
        )}

      {/* Demo View Modal */}
      <AnimatePresence>
        {showDemoModal && selectedProduct?.demoUrl && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Service Demo / ডেমো</h3>
                    <p className="text-xs text-slate-400">{selectedProduct.titleBn} ({selectedProduct.titleEn})</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowDemoModal(false)}
                  className="p-2 hover:bg-slate-800 rounded-full transition-all text-slate-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-4 bg-slate-950 flex items-center justify-center custom-scrollbar">
                {selectedProduct.demoFileType === 'pdf' ? (
                  <iframe 
                    src={selectedProduct.demoUrl} 
                    className="w-full h-full min-h-[60vh] rounded-xl"
                    title="Service Demo PDF"
                  />
                ) : (
                  <img 
                    src={selectedProduct.demoUrl} 
                    alt="Service Demo" 
                    className="max-w-full h-auto rounded-xl shadow-2xl"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>

              <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end">
                <button 
                  onClick={() => setShowDemoModal(false)}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                >
                  Close / বন্ধ করুন
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
