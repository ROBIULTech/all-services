import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  ShoppingBag, 
  Settings, 
  LogOut, 
  Search, 
  Bell, 
  Menu, 
  X, 
  ArrowUpRight, 
  DollarSign, 
  Clock, 
  MoreVertical, 
  Zap, 
  CheckCircle, 
  XCircle, 
  Plus, 
  ChevronLeft,
  ChevronRight,
  UserCheck, 
  ShieldCheck,
  Send,
  HeartHandshake,
  PhoneCall,
  FileUp,
  Download,
  Eye,
  Trash2,
  Crown,
  Upload,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { UserProfile, Order, Product, GlobalSettings, TrashItem } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db, doc, setDoc, deleteDoc, Timestamp, updateDoc, getDoc, collection, onSnapshot, serverTimestamp, getDocs, auth } from '../firebase';
import ServiceControls from './ServiceControls';

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

interface AdminPanelProps {
  userProfile: UserProfile;
  orders: Order[];
  allUsers: UserProfile[];
  products: Product[];
  trashItems: TrashItem[];
  globalSettings: GlobalSettings;
  updateGlobalSettings: (updates: Partial<GlobalSettings>) => Promise<void>;
  updateOrderStatus: (orderId: string, status: Order['status'], note: string, resultFile?: string) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  restoreItem: (item: TrashItem) => Promise<void>;
  permanentDeleteItem: (item: TrashItem) => Promise<void>;
  updateUserBalance: (userId: string, newBalance: number) => Promise<void>;
  updateProduct: (productId: number, updates: Partial<Product>) => Promise<void>;
  onSignOut: () => Promise<void>;
  isAdminViewingUserPanel: boolean;
  setIsAdminViewingUserPanel: (value: boolean) => void;
  updateAdminProfile: (displayName: string, photoURL: string) => Promise<void>;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (value: boolean) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({
  userProfile,
  orders,
  allUsers,
  products,
  trashItems,
  globalSettings,
  updateGlobalSettings,
  updateOrderStatus,
  deleteOrder,
  deleteUser,
  restoreItem,
  permanentDeleteItem,
  updateUserBalance,
  updateUser,
  updateProduct,
  onSignOut,
  isAdminViewingUserPanel,
  setIsAdminViewingUserPanel,
  updateAdminProfile,
  isSidebarOpen,
  setIsSidebarOpen
}) => {
  const handleDownloadReport = (reportType: string) => {
    let csvContent = "data:text/csv;charset=utf-8,";
    let fileName = "report.csv";

    if (reportType === '1') {
      // Products Statement (Who ordered what)
      fileName = "products_statement.csv";
      csvContent += "Product Name,Category,Total Orders,Total Revenue\n";
      products.forEach(p => {
        const productOrders = orders.filter(o => o.serviceId === p.id);
        const revenue = productOrders.reduce((sum, o) => sum + (o.status === 'completed' ? o.price : 0), 0);
        csvContent += `"${p.titleEn}","${p.category}",${productOrders.length},${revenue}\n`;
      });
    } else if (reportType === '2') {
      // Users Statement
      fileName = "users_statement.csv";
      csvContent += "Name,Email,Role,Balance,Joined At\n";
      allUsers.forEach(u => {
        csvContent += `"${u.displayName}","${u.email}","${u.role}",${u.balance},"${u.createdAt?.toDate?.()?.toLocaleString() || ''}"\n`;
      });
    } else if (reportType === '3') {
      // Orders Statement
      fileName = "orders_statement.csv";
      csvContent += "Order ID,Service,User,Data,Price,Status,Date\n";
      orders.forEach(o => {
        csvContent += `"${o.id}","${o.serviceTitle}","${o.userEmail}","${o.data || ''}",${o.price},"${o.status}","${o.createdAt?.toDate?.()?.toLocaleString() || ''}"\n`;
      });
    } else {
      alert('Invalid report type.');
      return;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadUserReport = (user: UserProfile, type: 'recharge' | 'orders' | 'profile') => {
    let csvContent = "data:text/csv;charset=utf-8,";
    let fileName = `user_${user.uid}_${type}.csv`;

    if (type === 'recharge') {
      fileName = `${user.displayName}_recharge_history.csv`;
      csvContent += "Order ID,Service,Amount,Status,Date\n";
      const userOrders = orders.filter(o => o.userEmail === user.email && (o.serviceTitle?.toLowerCase().includes('recharge') || o.serviceTitle?.toLowerCase().includes('topup')));
      userOrders.forEach(o => {
        csvContent += `"${o.id}","${o.serviceTitle}",${o.price},"${o.status}","${o.createdAt?.toDate?.()?.toLocaleString() || ''}"\n`;
      });
    } else if (type === 'orders') {
      fileName = `${user.displayName}_service_orders.csv`;
      csvContent += "Order ID,Service,Data,Price,Status,Date\n";
      const userOrders = orders.filter(o => o.userEmail === user.email && !(o.serviceTitle?.toLowerCase().includes('recharge') || o.serviceTitle?.toLowerCase().includes('topup')));
      userOrders.forEach(o => {
        csvContent += `"${o.id}","${o.serviceTitle}","${o.data || ''}",${o.price},"${o.status}","${o.createdAt?.toDate?.()?.toLocaleString() || ''}"\n`;
      });
    } else if (type === 'profile') {
      fileName = `${user.displayName}_profile_info.csv`;
      csvContent += "Field,Value\n";
      csvContent += `UID,"${user.uid}"\n`;
      csvContent += `Name,"${user.displayName}"\n`;
      csvContent += `Email,"${user.email}"\n`;
      csvContent += `Role,"${user.role}"\n`;
      csvContent += `Balance,${user.balance}\n`;
      csvContent += `Joined At,"${user.createdAt?.toDate?.()?.toLocaleString() || ''}"\n`;
      csvContent += `Is Blocked,"${(user as any).isBlocked ? 'Yes' : 'No'}"\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [activeTab, setActiveTab] = useState('dashboard');
  const [serviceFilter, setServiceFilter] = useState('All');
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [showAdminSearchResults, setShowAdminSearchResults] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });
  
  // Confirmation states
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'user' | 'order', id: string } | null>(null);
  const [rejectPrompt, setRejectPrompt] = useState<{ id: string, defaultNote: string } | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [balancePrompt, setBalancePrompt] = useState<{ uid: string, currentBalance: number } | null>(null);
  const [newBalanceValue, setNewBalanceValue] = useState('');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [userReportModalOpen, setUserReportModalOpen] = useState<UserProfile | null>(null);
  const [reportUserSearchModalOpen, setReportUserSearchModalOpen] = useState(false);
  const [reportUserSearchQuery, setReportUserSearchQuery] = useState('');

  const filteredUsers = allUsers.filter(u => 
    u.displayName?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const filteredReportUsers = allUsers.filter(u => 
    u.displayName?.toLowerCase().includes(reportUserSearchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(reportUserSearchQuery.toLowerCase())
  );

  const handleBlockUser = async (uid: string, isBlocked: boolean) => {
    try {
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, { isBlocked: !isBlocked }, { merge: true });
      setShowSuccess(true);
    } catch (error) {
      console.error('Error blocking user:', error);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    try {
      await deleteUser(uid);
      setShowSuccess(true);
      setSuccessMessage({ title: 'Success!', message: 'User moved to trash.' });
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  // Modal for completing order with file upload
  const [completingOrder, setCompletingOrder] = useState<Order | null>(null);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const filteredOrders = orders.filter(o => 
    o.serviceTitle?.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
    o.userEmail?.toLowerCase().includes(orderSearchQuery.toLowerCase())
  );
  const [resultFile, setResultFile] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState('Order completed successfully');

  const handleDownloadTrashFile = (item: TrashItem) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(item.data, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `trash_${item.type}_${item.id}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const [profileForm, setProfileForm] = useState({
    displayName: userProfile.displayName || '',
    photoURL: userProfile.photoURL || ''
  });

  const [premiumSettingsForm, setPremiumSettingsForm] = useState({
    premiumUnlockFee: globalSettings?.premiumUnlockFee || 500,
    isPremiumFeatureActive: globalSettings?.isPremiumFeatureActive ?? true,
    isServiceManagementActive: globalSettings?.isServiceManagementActive ?? true,
    bkashNumber: globalSettings?.bkashNumber || '',
    nagadNumber: globalSettings?.nagadNumber || '',
    rocketNumber: globalSettings?.rocketNumber || '',
    whatsappGroupLink: globalSettings?.whatsappGroupLink || ''
  });

  useEffect(() => {
    setProfileForm({
      displayName: userProfile.displayName || '',
      photoURL: userProfile.photoURL || ''
    });
  }, [userProfile]);

  useEffect(() => {
    if (globalSettings) {
      setPremiumSettingsForm({
        premiumUnlockFee: globalSettings.premiumUnlockFee || 500,
        isPremiumFeatureActive: globalSettings.isPremiumFeatureActive ?? true,
        isServiceManagementActive: globalSettings.isServiceManagementActive ?? true,
        bkashNumber: globalSettings.bkashNumber || '',
        nagadNumber: globalSettings.nagadNumber || '',
        rocketNumber: globalSettings.rocketNumber || '',
        whatsappGroupLink: globalSettings.whatsappGroupLink || ''
      });
    }
  }, [globalSettings]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, isSpecial: false },
    { id: 'users', label: 'Users', icon: Users, isSpecial: false },
    { id: 'products', label: 'Products', icon: Package, isSpecial: false },
    { id: 'orders', label: 'Orders', icon: ShoppingBag, isSpecial: false },
    { id: 'settings', label: 'Settings', icon: Settings, isSpecial: false },
    { id: 'trash', label: 'Trash', icon: Trash2, isSpecial: false },
  ];

  const adminSearchItems = [
    ...navItems,
    { id: 'user-panel', label: 'Switch to User Panel', icon: LayoutDashboard, isSpecial: true },
  ];

  const filteredAdminSearchItems = adminSearchItems.filter(item => 
    item.label.toLowerCase().includes(adminSearchQuery.toLowerCase())
  );

  const salesData = [
    { name: 'Mon', revenue: 4000 },
    { name: 'Tue', revenue: 3000 },
    { name: 'Wed', revenue: 2000 },
    { name: 'Thu', revenue: 2780 },
    { name: 'Fri', revenue: 1890 },
    { name: 'Sat', revenue: 2390 },
    { name: 'Sun', revenue: 3490 },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max ~750KB to allow for base64 overhead)
      if (file.size > 750 * 1024) {
        // If it's an image, try to compress it
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;
              
              // Max dimensions
              const MAX_WIDTH = 1200;
              const MAX_HEIGHT = 1200;
              
              if (width > height) {
                if (width > MAX_WIDTH) {
                  height *= MAX_WIDTH / width;
                  width = MAX_WIDTH;
                }
              } else {
                if (height > MAX_HEIGHT) {
                  width *= MAX_HEIGHT / height;
                  height = MAX_HEIGHT;
                }
              }
              
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);
              
              // Compress to JPEG with 0.7 quality
              const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
              
              // Final size check
              const base64Size = Math.round((compressedBase64.length * 3) / 4);
              if (base64Size > 1000 * 1024) {
                alert('Compressed image is still too large. Please upload a smaller file (under 750KB).');
                return;
              }
              
              setResultFile(compressedBase64);
            };
            img.src = event.target?.result as string;
          };
          reader.readAsDataURL(file);
          return;
        } else {
          alert('File is too large. Please upload a file under 750KB.');
          return;
        }
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setResultFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCompleteOrder = async () => {
    if (completingOrder) {
      await updateOrderStatus(completingOrder.id!, 'completed', adminNote, resultFile || undefined);
      setCompletingOrder(null);
      setResultFile(null);
      setAdminNote('Order completed successfully');
      setSuccessMessage({ title: 'Success!', message: 'Order marked as completed.' });
      setShowSuccess(true);
    }
  };

  // ServiceControls imported from components/ServiceControls.tsx

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900 font-sans">
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 transition-all duration-300 ease-in-out no-print flex flex-col",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 flex items-center justify-between gap-3">
            <div className={cn("flex items-center gap-3", !isSidebarOpen && "hidden")}>
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <LayoutDashboard className="text-white w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight">AdminPro</span>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg"
            >
              {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  activeTab === item.id 
                    ? "bg-indigo-50 text-indigo-600" 
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <item.icon className="w-5 h-5" />
                {isSidebarOpen && <span>{item.label}</span>}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-200">
            <button 
              onClick={onSignOut}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn("flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300", isSidebarOpen ? "ml-64" : "ml-20")}>
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-40 no-print">
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search (try 'User Panel')..." 
                value={adminSearchQuery}
                onChange={(e) => {
                  setAdminSearchQuery(e.target.value);
                  setShowAdminSearchResults(true);
                }}
                onFocus={() => setShowAdminSearchResults(true)}
                className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm w-64 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
              />
              
              <AnimatePresence>
                {showAdminSearchResults && adminSearchQuery && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowAdminSearchResults(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 py-2"
                    >
                      {filteredAdminSearchItems.length > 0 ? (
                        filteredAdminSearchItems.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              if (item.id === 'user-panel') {
                                setIsAdminViewingUserPanel(true);
                              } else {
                                setActiveTab(item.id);
                              }
                              setAdminSearchQuery('');
                              setShowAdminSearchResults(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
                          >
                            <div className={cn("p-1.5 rounded-lg", item.isSpecial ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-600")}>
                              <item.icon className="w-4 h-4" />
                            </div>
                            <span className={cn("text-sm font-medium", item.isSpecial ? "text-indigo-600" : "text-slate-700")}>
                              {item.label}
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-slate-500 text-center">
                          No results found
                        </div>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 hover:bg-slate-100 rounded-full relative"
              >
                <Bell className="w-5 h-5 text-slate-600" />
                {orders.some(o => o.status === 'pending') && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
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
                        <h3 className="font-bold text-slate-800">New Orders</h3>
                        <span className="text-[10px] bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
                          Pending
                        </span>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto">
                        {orders.filter(o => o.status === 'pending').length === 0 ? (
                          <div className="p-8 text-center">
                            <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-sm text-slate-500">No pending orders</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-50">
                            {orders.filter(o => o.status === 'pending').slice(0, 5).map((order) => (
                              <div key={order.id} className="p-4 hover:bg-slate-50 transition-colors">
                                <div className="flex gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                                    <Clock className="w-4 h-4" />
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-sm font-bold text-slate-800">
                                      {order.serviceTitle}
                                    </p>
                                    <p className="text-xs text-slate-500 line-clamp-1">
                                      User: {order.userEmail}
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
                      {orders.filter(o => o.status === 'pending').length > 0 && (
                        <button 
                          onClick={() => {
                            setActiveTab('orders');
                            setShowNotifications(false);
                          }}
                          className="w-full p-3 text-xs text-center text-indigo-600 hover:text-indigo-700 bg-slate-50 font-bold transition-colors"
                        >
                          View All Pending Orders
                        </button>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold">{userProfile?.displayName || 'Admin User'}</p>
                <p className="text-xs text-slate-500 capitalize">{userProfile?.role || 'Super Admin'}</p>
              </div>
              <img 
                src={userProfile?.photoURL || 'https://ui-avatars.com/api/?name=Admin&background=random'} 
                alt="Avatar" 
                className="w-10 h-10 rounded-full border-2 border-indigo-100 object-cover"
                referrerPolicy="no-referrer"
              />
              <button 
                onClick={onSignOut}
                className="p-2 hover:bg-red-50 rounded-full text-slate-400 hover:text-red-500 transition-all"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <div className="space-y-8">
                {/* Page Title */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
                    <p className="text-slate-500">Welcome back, {userProfile?.displayName}.</p>
                  </div>
                  <button 
                    onClick={() => setReportModalOpen(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 w-fit"
                  >
                    Download Report
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Revenue', value: `৳${orders.reduce((acc, o) => acc + (o.status === 'completed' ? o.price : 0), 0).toLocaleString()}`, change: '+12%', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-100' },
                    { label: 'Total Users', value: allUsers.length.toString(), change: '+5%', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
                    { label: 'Total Orders', value: orders.length.toString(), change: '+15%', icon: ShoppingBag, color: 'text-purple-600', bg: 'bg-purple-100' },
                    { label: 'Pending Orders', value: orders.filter(o => o.status === 'pending').length.toString(), change: 'Action Required', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-100' },
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className={cn("p-2 rounded-xl", stat.bg)}>
                          <stat.icon className={cn("w-6 h-6", stat.color)} />
                        </div>
                        <span className={cn(
                          "text-xs font-medium px-2 py-1 rounded-full",
                          stat.change.includes('+') ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
                        )}>
                          {stat.change}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                      <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                    </motion.div>
                  ))}
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-lg">Revenue Growth</h3>
                      <select className="bg-slate-50 border-none text-sm rounded-lg px-3 py-1 outline-none">
                        <option>Last 7 days</option>
                        <option>Last 30 days</option>
                      </select>
                    </div>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={salesData}>
                          <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          />
                          <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-lg mb-6">Recent Activity</h3>
                    <div className="space-y-6">
                      {orders.slice(0, 4).map((order, i) => (
                        <div key={order.id || i} className="flex gap-4">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                              <ShoppingBag className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div className="absolute top-10 left-1/2 -translate-x-1/2 w-px h-6 bg-slate-200"></div>
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{order.serviceTitle}</p>
                            <p className="text-xs text-slate-500">Order by {order.userEmail}</p>
                            <p className="text-[10px] text-slate-400 mt-1">{order.createdAt?.toDate?.()?.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={() => setActiveTab('orders')}
                      className="w-full mt-6 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      View All Activity
                    </button>
                  </div>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="font-bold text-lg">Recent Users</h3>
                    <button 
                      onClick={() => setActiveTab('users')}
                      className="text-sm font-medium text-indigo-600 hover:underline"
                    >
                      View all
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                          <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                          <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Balance</th>
                          <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {allUsers.slice(0, 5).map((u, i) => (
                          <tr key={u.uid || i} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <img src={u.photoURL} alt="" className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                                <div>
                                  <p className="text-sm font-semibold">{u.displayName || 'Unknown User'}</p>
                                  <p className="text-xs text-slate-500">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-slate-600 capitalize">{u.role}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-bold text-emerald-600">৳{u.balance.toLocaleString()}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button className="p-2 hover:bg-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="w-4 h-4 text-slate-400" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'products' && (
              <div className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">Service Management</h1>
                    <p className="text-slate-500">Manage and update service prices and availability.</p>
                  </div>
                  
                  {/* Filter Component */}
                  <div className="flex items-center bg-white border border-slate-200 rounded-full p-1 shadow-sm overflow-x-auto max-w-full no-scrollbar">
                    <span className="text-sm font-medium text-slate-500 px-4 sticky left-0 bg-white">Filter:</span>
                    {['All', 'NID', 'Passport', 'Server', 'Tax', 'Government', 'Form', 'PSC', 'EPI', 'Info', 'Biometric', 'Location', 'Call List', 'Disability', 'Premium'].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setServiceFilter(filter)}
                        className={cn(
                          "px-6 py-1.5 rounded-full text-sm font-bold transition-all whitespace-nowrap",
                          serviceFilter === filter 
                            ? "bg-indigo-600 text-white shadow-sm" 
                            : "text-slate-600 hover:text-slate-900"
                        )}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {products.filter(p => {
                    if (serviceFilter === 'All') return true;
                    return p.category?.toLowerCase() === serviceFilter.toLowerCase() || 
                           p.titleEn?.toLowerCase().includes(serviceFilter.toLowerCase()) || 
                           p.titleBn?.toLowerCase().includes(serviceFilter.toLowerCase());
                  }).map((product, i) => (
                    <motion.div
                      key={product.id || i}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className={cn(
                        "bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between h-full",
                        !product.isActive && "opacity-70"
                      )}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm", product.color)}>
                           <product.icon className="w-6 h-6" />
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const newTitleBn = prompt("Edit Service Name (BN):", product.titleBn);
                            const newPrice = prompt("Edit Price:", product.price.toString());
                            if (newTitleBn !== null && newPrice !== null) {
                              updateProduct(product.id, { 
                                titleBn: newTitleBn, 
                                price: Number(newPrice) 
                              });
                            }
                          }}
                          className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-indigo-100 hover:text-indigo-600 transition-colors z-50 relative"
                          title="Edit Service"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="cursor-pointer flex-1">
                        <h3 className="font-bold text-[17px] text-slate-800 leading-tight mb-1">{product.titleBn}</h3>
                        <p className="text-[13px] text-slate-400 font-medium mb-3">{product.titleEn}</p>
                        
                        {/* Category Tag */}
                        {product.category && (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 uppercase tracking-wider">
                            {product.category}
                          </span>
                        )}
                      </div>
                      <div className="mt-6">
                        <ServiceControls serviceId={product.id} updateProduct={updateProduct} products={products} />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">Order Management</h1>
                    <p className="text-slate-500">Review and process user service requests.</p>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search orders..." 
                      value={orderSearchQuery}
                      onChange={(e) => setOrderSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-full text-sm w-64 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Order Info</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">User</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Data</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredOrders.map((order, i) => (
                          <tr key={order.id || i} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <p className="text-sm font-bold">
                                {order.serviceTitle}
                                {order.serviceTitle === 'Recharge Request' && (
                                  <span className="block text-xs text-slate-500 font-normal">
                                    Amount: ৳{order.amount} | Number: {order.senderNumber} | TrxID: {order.trxID}
                                  </span>
                                )}
                              </p>
                              <p className="text-[10px] text-slate-400">৳{order.price || 0} • {order.createdAt?.toDate?.()?.toLocaleString()}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-slate-600">{order.userEmail}</p>
                            </td>
                            <td className="px-6 py-4">
                              <div className="max-w-xs overflow-hidden text-ellipsis whitespace-nowrap text-xs text-slate-500 font-mono">
                                {order.data || '-'}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                order.status === 'pending' ? "bg-amber-100 text-amber-700" :
                                order.status === 'processing' ? "bg-blue-100 text-blue-700" :
                                order.status === 'completed' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                              )}>
                                {order.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {order.serviceTitle === 'Recharge Request' && order.status === 'pending' ? (
                                  <>
                                    <button 
                                      onClick={async () => {
                                        // Approve: Update order status and add balance
                                        const user = allUsers.find(u => u.uid === order.uid);
                                        if (user) {
                                          const newBalance = user.balance + (order.amount || 0);
                                          await updateUserBalance(order.uid, newBalance);
                                          await updateOrderStatus(order.id!, 'completed', 'Recharge approved');
                                          alert('Recharge approved and balance updated.');
                                        } else {
                                          alert('User not found.');
                                        }
                                      }}
                                      className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                                      title="Approve Recharge"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => updateOrderStatus(order.id!, 'rejected', 'Recharge rejected')}
                                      className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                      title="Reject Recharge"
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => setDeleteConfirm({ type: 'order', id: order.id! })}
                                      className="p-1.5 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                                      title="Delete Order"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button 
                                      onClick={() => updateOrderStatus(order.id!, 'processing', 'Processing your request')}
                                      className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                      title="Mark Processing"
                                    >
                                      <Zap className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => setCompletingOrder(order)}
                                      className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                                      title="Mark Completed"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => {
                                        const newData = prompt("Edit order data:", order.data);
                                        if (newData !== null) {
                                          updateOrderStatus(order.id!, order.status, order.adminNote || '', newData);
                                        }
                                      }}
                                      className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                                      title="Edit Data"
                                    >
                                      <Settings className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setRejectionNote('Order rejected. Please contact support');
                                        setRejectPrompt({ id: order.id!, defaultNote: 'Order rejected. Please contact support' });
                                      }}
                                      className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                      title="Reject Order"
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => setDeleteConfirm({ type: 'order', id: order.id! })}
                                      className="p-1.5 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                                      title="Delete Order"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
                    <p className="text-slate-500">Manage user balances, roles, and status.</p>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search users..." 
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-full text-sm w-64 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">User</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">WhatsApp</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Password</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Role</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Balance</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredUsers.map((u) => (
                          <tr key={u.uid} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <img src={u.photoURL} alt="" className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                                <div>
                                  <p className="text-sm font-bold">{u.displayName || 'Unknown User'}</p>
                                  <p className="text-xs text-slate-500">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-slate-600">{u.whatsapp || 'N/A'}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-mono text-indigo-600 font-bold">{u.password || 'N/A'}</span>
                                <button 
                                  onClick={() => {
                                    const newEmail = prompt("Edit Email:", u.email);
                                    const newPassword = prompt("Edit Password:", u.password);
                                    if (newEmail !== null && newPassword !== null) {
                                      updateUser(u.uid, { email: newEmail, password: newPassword });
                                    }
                                  }}
                                  className="p-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors"
                                >
                                  <Settings className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-slate-600 capitalize">{u.role}</span>
                            </td>
                            <td className="px-6 py-4">
                              {u.role.toLowerCase() !== 'admin' ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-emerald-600">৳{u.balance.toLocaleString()}</span>
                                  <button 
                                    onClick={() => {
                                      setNewBalanceValue(u.balance.toString());
                                      setBalancePrompt({ uid: u.uid, currentBalance: u.balance });
                                    }}
                                    className="p-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-sm font-bold text-slate-400">৳0</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right space-x-2">
                              {u.role.toLowerCase() !== 'admin' && (
                                <>
                                  <button 
                                    onClick={() => setUserReportModalOpen(u)}
                                    className="text-xs font-bold text-indigo-600 hover:underline"
                                    title="Download User Report"
                                  >
                                    Report
                                  </button>
                                  <button 
                                    onClick={() => handleBlockUser(u.uid, (u as any).isBlocked)}
                                    className={cn("text-xs font-bold hover:underline", (u as any).isBlocked ? "text-emerald-600" : "text-orange-600")}
                                  >
                                    {(u as any).isBlocked ? 'Unblock' : 'Block'}
                                  </button>
                                  <button 
                                    onClick={() => setDeleteConfirm({ type: 'user', id: u.uid })}
                                    className="text-xs font-bold text-red-600 hover:underline"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'trash' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">Trash (ট্রাস)</h1>
                    <p className="text-slate-500">Manage deleted items. You can restore or permanently delete them.</p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Details</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Deleted At</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {trashItems.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                              <Trash2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                              <p className="font-medium">Trash is empty</p>
                              <p className="text-xs">Deleted items will appear here.</p>
                            </td>
                          </tr>
                        ) : (
                          trashItems.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={cn(
                                  "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                  item.type === 'user' ? "bg-blue-100 text-blue-600" :
                                  item.type === 'order' ? "bg-amber-100 text-amber-600" :
                                  "bg-purple-100 text-purple-600"
                                )}>
                                  {item.type}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-slate-900">
                                  {item.type === 'user' ? item.data.displayName : 
                                   item.type === 'order' ? item.data.serviceTitle : 
                                   item.data.titleEn}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {item.type === 'user' ? item.data.email : 
                                   item.type === 'order' ? `Order ID: ${item.id}` : 
                                   `Product ID: ${item.id}`}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                {item.deletedAt?.toDate?.().toLocaleString() || 'Unknown'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                                <button 
                                  onClick={() => handleDownloadTrashFile(item)}
                                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                  title="Download Data"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => restoreItem(item)}
                                  className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                  title="Restore"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => permanentDeleteItem(item)}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  title="Delete Permanently"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-8">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                  <p className="text-slate-500">Manage your profile and application preferences.</p>
                </div>

                <div className="max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-200">
                    <h3 className="font-bold text-lg">Admin Profile</h3>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="flex items-center gap-6">
                      <img 
                        src={profileForm.photoURL || 'https://ui-avatars.com/api/?name=Admin&background=random'} 
                        alt="Profile" 
                        className="w-24 h-24 rounded-2xl border-4 border-slate-100 shadow-sm object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-900">{userProfile?.displayName || 'Admin User'}</h4>
                        <p className="text-sm text-slate-500">{userProfile?.email}</p>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-100 text-indigo-700 mt-2">
                          {userProfile?.role}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Display Name</label>
                        <input 
                          type="text"
                          value={profileForm.displayName}
                          onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          placeholder="Enter your name"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Profile Photo URL</label>
                        <input 
                          type="text"
                          value={profileForm.photoURL}
                          onChange={(e) => setProfileForm({ ...profileForm, photoURL: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          placeholder="Enter image URL"
                        />
                        <div className="mt-2">
                          <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold cursor-pointer hover:bg-slate-200 transition-all border border-slate-200">
                            <Upload className="w-4 h-4" />
                            Upload Custom Photo
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

                    <div className="pt-4">
                      <button 
                        onClick={() => updateAdminProfile(profileForm.displayName, profileForm.photoURL)}
                        className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                      >
                        Update Profile
                      </button>
                    </div>
                  </div>
                </div>

                {/* Global Settings Card */}
                <div className="max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-200">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Settings className="w-5 h-5 text-indigo-500" />
                      Global Application Settings
                    </h3>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div>
                        <h4 className="font-bold text-slate-900">Enable Service Management</h4>
                        <p className="text-sm text-slate-500">Show or hide the main services tab for users.</p>
                      </div>
                      <div 
                        className={cn(
                          "w-12 h-6 rounded-full transition-all relative cursor-pointer",
                          premiumSettingsForm.isServiceManagementActive ? "bg-emerald-500" : "bg-slate-300"
                        )} 
                        onClick={() => setPremiumSettingsForm(prev => ({ ...prev, isServiceManagementActive: !prev.isServiceManagementActive }))}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                          premiumSettingsForm.isServiceManagementActive ? "left-7" : "left-1"
                        )} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div>
                        <h4 className="font-bold text-slate-900">Enable Premium Services</h4>
                        <p className="text-sm text-slate-500">Show or hide the premium services tab for users.</p>
                      </div>
                      <div 
                        className={cn(
                          "w-12 h-6 rounded-full transition-all relative cursor-pointer",
                          premiumSettingsForm.isPremiumFeatureActive ? "bg-emerald-500" : "bg-slate-300"
                        )} 
                        onClick={() => setPremiumSettingsForm(prev => ({ ...prev, isPremiumFeatureActive: !prev.isPremiumFeatureActive }))}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                          premiumSettingsForm.isPremiumFeatureActive ? "left-7" : "left-1"
                        )} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Premium Unlock Fee (৳)</label>
                      <input 
                        type="number"
                        value={premiumSettingsForm.premiumUnlockFee}
                        onChange={(e) => setPremiumSettingsForm({ ...premiumSettingsForm, premiumUnlockFee: Number(e.target.value) })}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        placeholder="e.g. 500"
                      />
                      <p className="text-xs text-slate-500">The amount deducted from user's balance to unlock premium services.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Bkash Number</label>
                        <input 
                          type="text"
                          value={premiumSettingsForm.bkashNumber}
                          onChange={(e) => setPremiumSettingsForm({ ...premiumSettingsForm, bkashNumber: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          placeholder="017XXXXXXXX"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Nagad Number</label>
                        <input 
                          type="text"
                          value={premiumSettingsForm.nagadNumber}
                          onChange={(e) => setPremiumSettingsForm({ ...premiumSettingsForm, nagadNumber: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          placeholder="017XXXXXXXX"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Rocket Number</label>
                        <input 
                          type="text"
                          value={premiumSettingsForm.rocketNumber}
                          onChange={(e) => setPremiumSettingsForm({ ...premiumSettingsForm, rocketNumber: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          placeholder="017XXXXXXXX"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">WhatsApp Group Link</label>
                      <input 
                        type="text"
                        value={premiumSettingsForm.whatsappGroupLink}
                        onChange={(e) => setPremiumSettingsForm({ ...premiumSettingsForm, whatsappGroupLink: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        placeholder="https://chat.whatsapp.com/..."
                      />
                      <p className="text-xs text-slate-500">Leave empty to hide the group join button from users.</p>
                    </div>

                    <div className="pt-4">
                      <button 
                        onClick={async () => {
                          await updateGlobalSettings({
                            premiumUnlockFee: premiumSettingsForm.premiumUnlockFee,
                            isPremiumFeatureActive: premiumSettingsForm.isPremiumFeatureActive,
                            isServiceManagementActive: premiumSettingsForm.isServiceManagementActive,
                            bkashNumber: premiumSettingsForm.bkashNumber,
                            nagadNumber: premiumSettingsForm.nagadNumber,
                            rocketNumber: premiumSettingsForm.rocketNumber,
                            whatsappGroupLink: premiumSettingsForm.whatsappGroupLink
                          });
                          setSuccessMessage({ title: 'Success!', message: 'Global settings updated successfully.' });
                          setShowSuccess(true);
                        }}
                        className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                      >
                        Save Settings
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Complete Order Modal */}
      <AnimatePresence>
        {completingOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCompletingOrder(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Complete Order</h3>
                <button onClick={() => setCompletingOrder(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Admin Note</label>
                  <textarea 
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Upload Result File (Optional)</label>
                  <div className="relative group">
                    <input 
                      type="file" 
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className={cn(
                      "border-2 border-dashed rounded-2xl p-8 text-center transition-all",
                      resultFile ? "border-emerald-500 bg-emerald-50" : "border-slate-200 group-hover:border-indigo-500 group-hover:bg-indigo-50"
                    )}>
                      {resultFile ? (
                        <div className="flex flex-col items-center gap-2">
                          <CheckCircle className="w-10 h-10 text-emerald-500" />
                          <p className="text-sm font-bold text-emerald-700">File Selected</p>
                          <button onClick={(e) => { e.stopPropagation(); setResultFile(null); }} className="text-xs text-red-500 hover:underline">Remove</button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <FileUp className="w-10 h-10 text-slate-400 group-hover:text-indigo-500" />
                          <p className="text-sm font-medium text-slate-600">Click or drag to upload result</p>
                          <p className="text-xs text-slate-400">PDF, Image or Document</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setCompletingOrder(null)}
                    className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleCompleteOrder}
                    className="flex-1 px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/25"
                  >
                    Complete Order
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 text-center"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Are you sure?</h3>
              <p className="text-slate-500 mb-6">This action cannot be undone. This {deleteConfirm.type} will be permanently removed.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all">Cancel</button>
                <button 
                  onClick={() => {
                    if (deleteConfirm.type === 'user') handleDeleteUser(deleteConfirm.id);
                    else {
                      deleteOrder(deleteConfirm.id);
                      setDeleteConfirm(null);
                    }
                  }}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reject Prompt Modal */}
      <AnimatePresence>
        {rejectPrompt && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRejectPrompt(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6"
            >
              <h3 className="text-xl font-bold mb-4">Reject Order</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Rejection Reason</label>
                  <textarea 
                    value={rejectionNote}
                    onChange={(e) => setRejectionNote(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all min-h-[100px]"
                    placeholder="Enter reason for rejection..."
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setRejectPrompt(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all">Cancel</button>
                  <button 
                    onClick={() => {
                      updateOrderStatus(rejectPrompt.id, 'rejected', rejectionNote || rejectPrompt.defaultNote);
                      setRejectPrompt(null);
                    }}
                    className="flex-1 py-3 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/20"
                  >
                    Reject Order
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Balance Update Modal */}
      <AnimatePresence>
        {balancePrompt && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setBalancePrompt(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6"
            >
              <h3 className="text-xl font-bold mb-4">Update Balance</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">New Balance (৳)</label>
                  <input 
                    type="number"
                    value={newBalanceValue}
                    onChange={(e) => setNewBalanceValue(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="Enter amount..."
                    autoFocus
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setBalancePrompt(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all">Cancel</button>
                  <button 
                    onClick={() => {
                      updateUserBalance(balancePrompt.uid, Number(newBalanceValue));
                      setBalancePrompt(null);
                    }}
                    className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                  >
                    Update
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Report Selection Modal */}
      <AnimatePresence>
        {reportModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReportModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6"
            >
              <h3 className="text-xl font-bold mb-4">Download Report</h3>
              <p className="text-slate-500 mb-6 text-sm">Select the type of report you want to download as a CSV file.</p>
              <div className="space-y-3">
                <button 
                  onClick={() => { handleDownloadReport('1'); setReportModalOpen(false); }}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-2xl transition-all group"
                >
                  <div className="text-left">
                    <p className="font-bold text-slate-900 group-hover:text-indigo-700">Products Statement</p>
                    <p className="text-xs text-slate-500">Sales and revenue by product</p>
                  </div>
                  <Download className="w-5 h-5 text-slate-400 group-hover:text-indigo-500" />
                </button>
                <button 
                  onClick={() => { setReportUserSearchModalOpen(true); setReportModalOpen(false); }}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-2xl transition-all group"
                >
                  <div className="text-left">
                    <p className="font-bold text-slate-900 group-hover:text-indigo-700">Users Statement</p>
                    <p className="text-xs text-slate-500">Search and download specific user statement</p>
                  </div>
                  <Download className="w-5 h-5 text-slate-400 group-hover:text-indigo-500" />
                </button>
                <button 
                  onClick={() => { handleDownloadReport('3'); setReportModalOpen(false); }}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-2xl transition-all group"
                >
                  <div className="text-left">
                    <p className="font-bold text-slate-900 group-hover:text-indigo-700">Orders Statement</p>
                    <p className="text-xs text-slate-500">Complete history of all orders</p>
                  </div>
                  <Download className="w-5 h-5 text-slate-400 group-hover:text-indigo-500" />
                </button>
                <button 
                  onClick={() => setReportModalOpen(false)}
                  className="w-full py-3 text-slate-500 font-bold hover:text-slate-700 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Specific Report Modal */}
      <AnimatePresence>
        {userReportModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setUserReportModalOpen(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6"
            >
              <div className="flex items-center gap-4 mb-6">
                <img src={userReportModalOpen.photoURL} alt="" className="w-12 h-12 rounded-full" referrerPolicy="no-referrer" />
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{userReportModalOpen.displayName}</h3>
                  <p className="text-sm text-slate-500">{userReportModalOpen.email}</p>
                </div>
              </div>
              
              <p className="text-slate-500 mb-6 text-sm">Select the information you want to download for this user.</p>
              
              <div className="space-y-3">
                <button 
                  onClick={() => { handleDownloadUserReport(userReportModalOpen, 'recharge'); setUserReportModalOpen(null); }}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-2xl transition-all group"
                >
                  <div className="text-left">
                    <p className="font-bold text-slate-900 group-hover:text-indigo-700">Recharge History</p>
                    <p className="text-xs text-slate-500">All top-ups and recharge orders</p>
                  </div>
                  <Download className="w-5 h-5 text-slate-400 group-hover:text-indigo-500" />
                </button>
                
                <button 
                  onClick={() => { handleDownloadUserReport(userReportModalOpen, 'orders'); setUserReportModalOpen(null); }}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-2xl transition-all group"
                >
                  <div className="text-left">
                    <p className="font-bold text-slate-900 group-hover:text-indigo-700">Service Orders</p>
                    <p className="text-xs text-slate-500">All non-recharge service requests</p>
                  </div>
                  <Download className="w-5 h-5 text-slate-400 group-hover:text-indigo-500" />
                </button>
                
                <button 
                  onClick={() => { handleDownloadUserReport(userReportModalOpen, 'profile'); setUserReportModalOpen(null); }}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-2xl transition-all group"
                >
                  <div className="text-left">
                    <p className="font-bold text-slate-900 group-hover:text-indigo-700">Profile Information</p>
                    <p className="text-xs text-slate-500">Account details and current balance</p>
                  </div>
                  <Download className="w-5 h-5 text-slate-400 group-hover:text-indigo-500" />
                </button>
                
                <button 
                  onClick={() => setUserReportModalOpen(null)}
                  className="w-full py-3 text-slate-500 font-bold hover:text-slate-700 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Report User Search Modal */}
      <AnimatePresence>
        {reportUserSearchModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReportUserSearchModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-6 max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Select User</h2>
                  <p className="text-slate-500 text-sm">Search and select a user to download their statement.</p>
                </div>
                <button 
                  onClick={() => setReportUserSearchModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search users by name or email..." 
                  value={reportUserSearchQuery}
                  onChange={(e) => setReportUserSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {filteredReportUsers.length > 0 ? (
                  filteredReportUsers.map(user => (
                    <button
                      key={user.uid}
                      onClick={() => {
                        setUserReportModalOpen(user);
                        setReportUserSearchModalOpen(false);
                      }}
                      className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-2xl transition-all group text-left"
                    >
                      <div className="flex items-center gap-4">
                        <img src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=random`} alt="" className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-indigo-700">{user.displayName}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-600">৳{user.balance.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-400">Balance</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <p className="text-slate-500">No users found matching your search.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Notification */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-8 right-8 z-[100] bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 flex items-center gap-4 min-w-[320px]"
          >
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
              <UserCheck className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-slate-900">{successMessage.title}</p>
              <p className="text-sm text-slate-500">{successMessage.message}</p>
            </div>
            <button 
              onClick={() => setShowSuccess(false)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPanel;
