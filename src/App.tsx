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
  LogIn,
  History,
  Wallet,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Send
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
  Timestamp
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
  { id: 1, titleBn: 'সাইন কপি অর্ডার', titleEn: 'Sign Copy Order', category: 'NID', icon: FileText, color: 'bg-blue-500', price: 40, isActive: true, options: [{ name: 'FORM_NO', price: 40 }, { name: 'NID_NO', price: 40 }, { name: 'VOTER_NO', price: 40 }, { name: 'BIRTH_NO', price: 40 }] },
  { id: 2, titleBn: 'এনআইডি কপি অর্ডার', titleEn: 'NID Copy Order', category: 'NID', icon: CreditCard, color: 'bg-indigo-500', price: 50, isActive: true, options: [{ name: 'FORM_NO', price: 50 }, { name: 'NID_NO', price: 50 }, { name: 'VOTER_NO', price: 50 }, { name: 'BIRTH_NO', price: 50 }] },
  { id: 3, titleBn: 'অফিসিয়াল সার্ভার কপি', titleEn: 'Official Server Copy', category: 'SERVER', icon: Server, color: 'bg-slate-700', price: 80, isActive: true, options: [{ name: 'FORM_NO', price: 80 }, { name: 'NID_NO', price: 80 }, { name: 'VOTER_NO', price: 80 }, { name: 'BIRTH_NO', price: 80 }] },
  { id: 4, titleBn: 'টিন সার্টিফিকেট অর্ডার করুন', titleEn: 'TIN Certificate Order', category: 'TAX', icon: FileText, color: 'bg-orange-500', price: 100, isActive: true },
  { id: 5, titleBn: 'বায়োমেট্রিক অর্ডার', titleEn: 'Biometric Order', category: 'SECURITY', icon: ShieldCheck, color: 'bg-pink-500', price: 200, isActive: true, options: [{ name: 'Grameenphone', price: 100 }, { name: 'Banglalink', price: 100 }, { name: 'Robi', price: 100 }, { name: 'Airtel', price: 100 }, { name: 'Teletalk', price: 100 }] },
  { id: 6, titleBn: 'লোকেশন অর্ডার', titleEn: 'Location Order', category: 'TRACKING', icon: MapPin, color: 'bg-slate-800', price: 300, isActive: true },
  { id: 7, titleBn: 'নতুন জন্ম নিবন্ধন', titleEn: 'New Birth Registration', category: 'GOVERNMENT', icon: Baby, color: 'bg-cyan-500', price: 1200, isActive: true, options: [{ name: 'মিনিস্ট্রি', price: 1200 }] },
  { id: 8, titleBn: 'কললিস্ট অর্ডার', titleEn: 'Call List Order', category: 'COMMUNICATION', icon: PhoneCall, color: 'bg-orange-600', price: 750, isActive: true, options: [{ name: '৩ মাস কল লিস্ট', price: 750 }, { name: '৬ মাস কল লিস্ট', price: 1200 }] },
  { id: 9, titleBn: 'NID টু অল নাম্বার অর্ডার', titleEn: 'NID to All Number', category: 'NID', icon: Hash, color: 'bg-indigo-600', price: 500, isActive: true },
  { id: 10, titleBn: 'Nid ইউজার পাসওয়ার্ড চেঞ্জ', titleEn: 'NID Password Change', category: 'NID', icon: Key, color: 'bg-pink-600', price: 220, isActive: true },
  { id: 11, titleBn: 'নাম ঠিকানা NID', titleEn: 'Name Address NID', category: 'NID', icon: UserCheck, color: 'bg-blue-600', price: 350, isActive: true },
  { id: 12, titleBn: 'INFO অর্ডার', titleEn: 'INFO Order', category: 'INFORMATION', icon: Info, color: 'bg-sky-500', price: 1150, isActive: true, options: [{ name: 'Bkash', price: 900 }, { name: 'Nagad', price: 1150 }, { name: 'Bkash Agent', price: 950 }, { name: 'BKash Merchant', price: 1000 }] },
  { id: 13, titleBn: 'অরজিনাল স্মার্ট কার্ড অর্ডার', titleEn: 'Original Smart Card Order', category: 'NID', icon: Smartphone, color: 'bg-blue-700', price: 3800, isActive: true, options: [{ name: 'নতুন স্মার্ট কার্ড প্রিন্ট', price: 3300 }, { name: 'রি-প্রিন্ট স্মার্ট কার্ড', price: 3800 }] },
  { id: 14, titleBn: 'পাসপোর্ট SB কপি', titleEn: 'Passport SB Copy', category: 'PASSPORT', icon: Globe, color: 'bg-indigo-700', price: 800, isActive: true, options: [{ name: 'MRP Passport SB Copy', price: 500 }, { name: 'E Passport SB Copy', price: 800 }] },
  { id: 15, titleBn: 'পাসপোর্ট মূল কপি', titleEn: 'Passport Main Copy', category: 'PASSPORT', icon: Globe, color: 'bg-sky-700', price: 1200, isActive: true, options: [{ name: 'MRP Passport Main Copy', price: 1000 }, { name: 'E Passport Main Copy', price: 1200 }] },
  { id: 16, titleBn: 'সুুবর্ণ প্রতিবন্ধী কার্ড', titleEn: 'Disability Card', category: 'SOCIAL', icon: HeartHandshake, color: 'bg-slate-900', price: 1250, isActive: true },
  { id: 17, titleBn: 'হারিয়ে যাওয়া জন্ম সনদ', titleEn: 'Lost Birth Certificate', category: 'GOVERNMENT', icon: FileSearch, color: 'bg-orange-400', price: 30, isActive: true },
  { id: 18, titleBn: 'হারিয়ে যাওয়া মৃত্যু সনদ', titleEn: 'Lost Death Certificate', category: 'GOVERNMENT', icon: FileSearch, color: 'bg-red-500', price: 30, isActive: true },
  { id: 19, titleBn: 'নিকানাম ফর্ম', titleEn: 'Nickname Form', category: 'FORM', icon: FileText, color: 'bg-slate-500', price: 150, isActive: true, options: [{ name: 'পিডিএফ', price: 150 }, { name: 'ওয়াড ফাইল', price: 150 }] },
  { id: 20, titleBn: 'পিএসসি সার্টিফিকেট ভেক্টর ফাইল', titleEn: 'PSC Certificate Vector', category: 'EDUCATION', icon: GraduationCap, color: 'bg-indigo-400', price: 150, isActive: true, options: [{ name: 'ভেক্টর ফাইল', price: 150 }] },
  { id: 21, titleBn: 'ইপিআইড/শিশুদের টিকা কার্ড ভেক্টর ফাইল', titleEn: 'EPI/Vaccine Card Vector', category: 'HEALTH', icon: Stethoscope, color: 'bg-blue-400', price: 150, isActive: true, options: [{ name: 'পিডিএফ', price: 150 }, { name: 'ভেক্টর ফাইল', price: 150 }] },
  { id: 22, titleBn: 'আন অফিসিয়াল সার্ভার কপি', titleEn: 'Unofficial Server Copy', category: 'SERVER', icon: Server, color: 'bg-slate-600', price: 30, isActive: true, options: [{ name: 'Server Copy Type 1', price: 30 }, { name: 'Server Copy Type 2', price: 30 }] },
  { id: 23, titleBn: 'এনআইডি সংশোধন কপি', titleEn: 'NID Correction Copy', category: 'NID', icon: CreditCard, color: 'bg-indigo-400', price: 150, isActive: true },
  { id: 24, titleBn: 'পাসপোর্ট ইনফরমেশন', titleEn: 'Passport Information', category: 'PASSPORT', icon: FileSearch, color: 'bg-teal-600', price: 500, isActive: true, options: [{ name: 'MRP Passport Information', price: 500 }, { name: 'E Passport Information', price: 500 }] },
  { id: 101, titleBn: 'অটো সাইন কপি', titleEn: 'Auto Sign Copy', category: 'PREMIUM', icon: FileText, color: 'bg-orange-500', price: 60, isActive: true },
  { id: 102, titleBn: 'তথ্য যাচাই', titleEn: 'Info Verification', category: 'PREMIUM', icon: Search, color: 'bg-emerald-500', price: 5, isActive: true, options: [{ name: 'NID/PIN', price: 5 }, { name: 'Birth (BRN)', price: 5 }, { name: 'Mobile Number', price: 5 }, { name: 'Form Number', price: 5 }] }
];

export default function App() {
  const [user, setUser] = useState<FirebaseUser | any | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({ 
    premiumUnlockFee: 500, 
    isPremiumFeatureActive: true, 
    isServiceManagementActive: true,
    bkashNumber: '01811152997',
    nagadNumber: '',
    rocketNumber: '',
    whatsappGroupLink: ''
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
      await signOut(auth);
      localStorage.removeItem('demo_session');
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  useEffect(() => {
    // Fetch global settings
    const settingsRef = doc(db, 'settings', 'general');
    const unsubSettings = onSnapshot(settingsRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as GlobalSettings;
        setGlobalSettings({
          premiumUnlockFee: data.premiumUnlockFee || 500,
          isPremiumFeatureActive: data.isPremiumFeatureActive ?? true,
          isServiceManagementActive: data.isServiceManagementActive ?? true,
          bkashNumber: data.bkashNumber || '',
          nagadNumber: data.nagadNumber || '',
          rocketNumber: data.rocketNumber || '',
          whatsappGroupLink: data.whatsappGroupLink || ''
        });
      } else {
        // Initialize settings if they don't exist
        const initialSettings: GlobalSettings = { 
          premiumUnlockFee: 500, 
          isPremiumFeatureActive: true, 
          isServiceManagementActive: true,
          bkashNumber: '01811152997',
          nagadNumber: '',
          rocketNumber: '',
          whatsappGroupLink: ''
        };
        await setDoc(settingsRef, initialSettings);
        setGlobalSettings(initialSettings);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/general');
    });

    // Check for local demo session
    const demoSession = localStorage.getItem('demo_session');
    if (demoSession) {
      const session = JSON.parse(demoSession);
      setUser(session.user);
      // Still set up a listener for the profile even for demo session if it has a real UID
      if (session.user.uid) {
        const userRef = doc(db, 'users', session.user.uid);
        const unsubProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          } else {
            setUserProfile(session.profile); // Fallback to session profile if doc doesn't exist yet
          }
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${session.user.uid}`);
        });
        return () => unsubProfile();
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Fetch user profile
        const userRef = doc(db, 'users', firebaseUser.uid);
        const unsubProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          }
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        });
        return () => unsubProfile();
      } else {
        localStorage.removeItem('demo_session');
        setUserProfile(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const initializeProducts = async () => {
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
          
          // For product 102, we want to force the new options
          if (p.id === 102) {
            return { ...found, options: p.options };
          }
          
          // If options changed (new options added), we should sync them
          const hasNewOptions = p.options && (!found.options || p.options.some(opt => !found.options.some((fo: any) => fo.name === opt.name)));
          if (hasNewOptions) {
            const mergedOptions = p.options.map(opt => {
              const existing = found.options?.find((fo: any) => fo.name === opt.name);
              return existing ? existing : opt;
            });
            return { ...found, options: mergedOptions };
          }
          return null;
        }).filter(p => p !== null) as Product[];
        
        if (productsToSync.length > 0) {
          for (const p of productsToSync) {
            const { icon, color, ...serializableProduct } = p;
            await setDoc(doc(db, 'products', p.id.toString()), serializableProduct, { merge: true });
          }
        }
      } catch (err) {
        console.error('Error initializing products:', err);
      }
    };

    if (userProfile?.role === 'admin') {
      initializeProducts();

      // Sync products with Firestore
      const q = collection(db, 'products');
      const unsubscribe = onSnapshot(q, (snapshot) => {
          const productsData: Product[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as Product;
            productsData.push(data);
          });
          
          // Merge Firestore data with initialProducts to ensure icons and colors are present
          const mergedProducts = initialProducts.map(ip => {
            const found = productsData.find(pd => pd.id === ip.id);
            if (found) {
              let finalOptions = found.options;
              if (ip.options) {
                finalOptions = ip.options.map(ipOpt => {
                  const existingOpt = found.options?.find((o: any) => o.name === ipOpt.name);
                  return existingOpt ? existingOpt : ipOpt;
                });
              }
              return { ...found, icon: ip.icon, color: ip.color, options: finalOptions };
            }
            return ip;
          });

          setProducts(mergedProducts.sort((a, b) => a.id - b.id));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'products');
      });
      return () => unsubscribe();
    } else {
      setProducts(initialProducts);
    }
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
      const productRef = doc(db, 'products', id.toString());
      // Filter out non-serializable fields like 'icon'
      const { icon, color, ...serializableUpdates } = updates;
      await setDoc(productRef, serializableUpdates, { merge: true });
      setShowSuccess(true);
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Error updating product: ' + (error instanceof Error ? error.message : String(error)));
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
        // Refund the user
        const userRef = doc(db, 'users', orderData.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data() as UserProfile;
          await updateDoc(userRef, {
            balance: (userData.balance || 0) + (orderData.price || 0)
          });
        }
      } else if (status !== 'rejected' && orderData.status === 'rejected') {
        // Deduct the balance again if un-rejected
        const userRef = doc(db, 'users', orderData.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data() as UserProfile;
          await updateDoc(userRef, {
            balance: (userData.balance || 0) - (orderData.price || 0)
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
        // Move to trash
        const trashRef = doc(db, 'trash', userId);
        await setDoc(trashRef, {
          id: userId,
          type: 'user',
          data: userData,
          deletedAt: Timestamp.now()
        });
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
      }
      await deleteDoc(doc(db, 'trash', item.id));
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
      await setDoc(userRef, {
        displayName,
        photoURL,
        whatsapp,
        password,
        uid: userProfile.uid,
        email: userProfile.email,
        role: userProfile.role,
        balance: userProfile.balance
      }, { merge: true });
      setShowSuccess(true);
    } catch (error) {
      console.error('Error updating profile:', error);
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
  const [showSuccess, setShowSuccess] = useState(false);
  const isAdminRoute = window.location.pathname === '/admin';

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
          products={products} 
          globalSettings={globalSettings}
          onOrderPlaced={(order) => {
            // UserPanel handles its own success notification
          }} 
          onSignOut={handleSignOut}
          updateUserProfile={updateUserProfile}
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
      updateProduct={updateProduct}
      onSignOut={handleSignOut}
      isAdminViewingUserPanel={isAdminViewingUserPanel}
      setIsAdminViewingUserPanel={setIsAdminViewingUserPanel}
      updateAdminProfile={updateUserProfile}
    />
  );
}
