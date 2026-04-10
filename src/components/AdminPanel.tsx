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
  EyeOff,
  Trash2,
  Crown,
  Upload,
  RotateCcw,
  Tag,
  Filter,
  Edit3,
  LayoutGrid,
  Smartphone,
  CreditCard,
  FileText,
  MapPin,
  Globe,
  Fingerprint,
  Landmark,
  Briefcase,
  GraduationCap,
  Heart,
  ShoppingCart,
  Mail,
  MessageSquare,
  Megaphone,
  Info,
  HelpCircle,
  Phone,
  Server
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { UserProfile, Order, Product, GlobalSettings, TrashItem } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db, doc, setDoc, deleteDoc, Timestamp, updateDoc, getDoc, collection, onSnapshot, serverTimestamp, getDocs, auth } from '../firebase';
import ServiceControls from './ServiceControls';
import { Logo } from './Logo';

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
  updateUser: (uid: string, updates: Partial<UserProfile>) => Promise<void>;
  updateProduct: (productId: number, updates: Partial<Product>) => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  deleteProduct: (productId: number) => Promise<void>;
  onSignOut: () => Promise<void>;
  isAdminViewingUserPanel: boolean;
  setIsAdminViewingUserPanel: (value: boolean) => void;
  updateAdminProfile: (displayName: string, photoURL: string) => Promise<void>;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (value: boolean) => void;
}

const icons = {
  LayoutGrid, Smartphone, CreditCard, FileText, ShieldCheck, 
  UserCheck, MapPin, Globe, Search, Zap, Clock, Tag, 
  Fingerprint, Landmark, Briefcase, GraduationCap, Heart, 
  ShoppingCart, Settings, Bell, Info, HelpCircle, Mail, Phone
};

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
  addProduct,
  deleteProduct,
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

  const handleSendNotification = (type: 'whatsapp' | 'email', target: UserProfile | 'all' | 'selected') => {
    if (!notificationMessage) {
      alert('Please enter a message.');
      return;
    }

    const message = encodeURIComponent(notificationMessage);
    const subject = encodeURIComponent(notificationSubject);

    let targetUsers: UserProfile[] = [];

    if (target === 'all') {
      targetUsers = allUsers;
    } else if (target === 'selected') {
      targetUsers = allUsers.filter(u => selectedUserIds.includes(u.uid));
      if (targetUsers.length === 0) {
        alert('No users selected.');
        return;
      }
    } else {
      targetUsers = [target];
    }

    if (type === 'whatsapp') {
      if (targetUsers.length > 1) {
        if (!confirm(`You are about to send messages to ${targetUsers.length} users. This will open multiple WhatsApp tabs. Continue?`)) {
          return;
        }
        targetUsers.forEach((user, index) => {
          if (user.whatsapp) {
            const cleanNumber = user.whatsapp.replace(/\D/g, '');
            const whatsappUrl = `https://wa.me/${cleanNumber}?text=${message}`;
            // Delay to prevent browser blocking multiple popups
            setTimeout(() => {
              window.open(whatsappUrl, '_blank');
            }, index * 1000);
          }
        });
      } else {
        const user = targetUsers[0];
        if (!user.whatsapp) {
          alert('This user does not have a WhatsApp number.');
          return;
        }
        const cleanNumber = user.whatsapp.replace(/\D/g, '');
        const whatsappUrl = `https://wa.me/${cleanNumber}?text=${message}`;
        window.open(whatsappUrl, '_blank');
      }
    } else {
      if (targetUsers.length > 1) {
        const emails = targetUsers.map(u => u.email).join(',');
        const mailtoUrl = `mailto:?bcc=${emails}&subject=${subject}&body=${message}`;
        window.open(mailtoUrl, '_blank');
      } else {
        const user = targetUsers[0];
        const mailtoUrl = `mailto:${user.email}?subject=${subject}&body=${message}`;
        window.open(mailtoUrl, '_blank');
      }
    }
    
    setNotificationModalOpen(null);
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
  
  const [rechargeSearchQuery, setRechargeSearchQuery] = useState('');
  
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
  
  // Notification States
  const [notificationModalOpen, setNotificationModalOpen] = useState<UserProfile | 'all' | 'selected' | null>(null);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationSubject, setNotificationSubject] = useState('Important Update from User Panel');
  const [notificationUserSearch, setNotificationUserSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  
  // Service Management States
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Product | null>(null);
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState('All');

  const filteredUsers = allUsers.filter(u => 
    u.displayName?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.userId?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.whatsapp?.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const filteredReportUsers = allUsers.filter(u => 
    u.displayName?.toLowerCase().includes(reportUserSearchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(reportUserSearchQuery.toLowerCase()) ||
    u.userId?.toLowerCase().includes(reportUserSearchQuery.toLowerCase()) ||
    u.whatsapp?.toLowerCase().includes(reportUserSearchQuery.toLowerCase())
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
    o.serviceTitle !== 'Recharge Request' && (
      o.serviceTitle?.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      o.userEmail?.toLowerCase().includes(orderSearchQuery.toLowerCase())
    )
  );

  const filteredRechargeRequests = orders.filter(o => 
    o.serviceTitle === 'Recharge Request' && (
      o.userEmail?.toLowerCase().includes(rechargeSearchQuery.toLowerCase()) ||
      o.trxID?.toLowerCase().includes(rechargeSearchQuery.toLowerCase()) ||
      o.senderNumber?.toLowerCase().includes(rechargeSearchQuery.toLowerCase())
    )
  );
  const [resultFile, setResultFile] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState('Order completed successfully');

  const handleDownloadTrashFile = (item: TrashItem) => {
    // Generate CSV content
    let csvContent = "Field,Value\n";
    const data = item.data;
    for (const key in data) {
      csvContent += `${key},${JSON.stringify(data[key])}\n`;
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", url);
    downloadAnchorNode.setAttribute("download", `trash_${item.type}_${item.id}.csv`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    URL.revokeObjectURL(url);
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
    whatsappGroupLink: globalSettings?.whatsappGroupLink || '',
    smsGatewayToken: globalSettings?.smsGatewayToken || '',
    adminPhoneNumber: globalSettings?.adminPhoneNumber || '01811152997',
    porichoyApiKey: globalSettings?.porichoyApiKey || '',
    enkimaaApiKey: globalSettings?.enkimaaApiKey || '',
    isAutoSignApiActive: globalSettings?.isAutoSignApiActive ?? false,
    autoSignApiKey: globalSettings?.autoSignApiKey || '',
    isInfoVerifyApiActive: globalSettings?.isInfoVerifyApiActive ?? false,
    infoVerifyApiKey: globalSettings?.infoVerifyApiKey || '',
    isServerCopyApiActive: globalSettings?.isServerCopyApiActive ?? false,
    serverCopyApiKey: globalSettings?.serverCopyApiKey || '',
    isAutoNidApiActive: globalSettings?.isAutoNidApiActive ?? false,
    autoNidApiKey: globalSettings?.autoNidApiKey || '',
    isAutoSignMaintenance: globalSettings?.isAutoSignMaintenance ?? false,
    isInfoVerifyMaintenance: globalSettings?.isInfoVerifyMaintenance ?? false,
    isServerCopyMaintenance: globalSettings?.isServerCopyMaintenance ?? false,
    isAutoNidMaintenance: globalSettings?.isAutoNidMaintenance ?? false,
    isApiResellingActive: globalSettings?.isApiResellingActive ?? false,
    providerApiUrl: globalSettings?.providerApiUrl || '',
    providerApiKey: globalSettings?.providerApiKey || '',
    markupType: globalSettings?.markupType || 'flat',
    markupValue: globalSettings?.markupValue || 0,
    isSmartCardApiActive: globalSettings?.isSmartCardApiActive ?? false,
    isNicknameApiActive: globalSettings?.isNicknameApiActive ?? false,
    isVaccineCardApiActive: globalSettings?.isVaccineCardApiActive ?? false,
    isPscVectorApiActive: globalSettings?.isPscVectorApiActive ?? false,
    isAutoSignTokenBased: globalSettings?.isAutoSignTokenBased ?? false,
    autoSignTokenUrl: globalSettings?.autoSignTokenUrl || '',
    isInfoVerifyTokenBased: globalSettings?.isInfoVerifyTokenBased ?? false,
    infoVerifyTokenUrl: globalSettings?.infoVerifyTokenUrl || '',
    isServerCopyTokenBased: globalSettings?.isServerCopyTokenBased ?? false,
    serverCopyTokenUrl: globalSettings?.serverCopyTokenUrl || '',
    isAutoNidTokenBased: globalSettings?.isAutoNidTokenBased ?? false,
    autoNidTokenUrl: globalSettings?.autoNidTokenUrl || ''
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
        whatsappGroupLink: globalSettings.whatsappGroupLink || '',
        smsGatewayToken: globalSettings.smsGatewayToken || '',
        adminPhoneNumber: globalSettings.adminPhoneNumber || '01811152997',
        porichoyApiKey: globalSettings.porichoyApiKey || '',
        enkimaaApiKey: globalSettings.enkimaaApiKey || '',
        isAutoSignApiActive: globalSettings.isAutoSignApiActive ?? false,
        autoSignApiKey: globalSettings.autoSignApiKey || '',
        isInfoVerifyApiActive: globalSettings.isInfoVerifyApiActive ?? false,
        infoVerifyApiKey: globalSettings.infoVerifyApiKey || '',
        isServerCopyApiActive: globalSettings.isServerCopyApiActive ?? false,
        serverCopyApiKey: globalSettings.serverCopyApiKey || '',
        isAutoNidApiActive: globalSettings.isAutoNidApiActive ?? false,
        autoNidApiKey: globalSettings.autoNidApiKey || '',
        isAutoSignMaintenance: globalSettings.isAutoSignMaintenance ?? false,
        isInfoVerifyMaintenance: globalSettings.isInfoVerifyMaintenance ?? false,
        isServerCopyMaintenance: globalSettings.isServerCopyMaintenance ?? false,
        isAutoNidMaintenance: globalSettings.isAutoNidMaintenance ?? false,
        isApiResellingActive: globalSettings.isApiResellingActive ?? false,
        providerApiUrl: globalSettings.providerApiUrl || '',
        providerApiKey: globalSettings.providerApiKey || '',
        markupType: globalSettings.markupType || 'flat',
        markupValue: globalSettings.markupValue || 0,
        isSmartCardApiActive: globalSettings.isSmartCardApiActive ?? false,
        isNicknameApiActive: globalSettings.isNicknameApiActive ?? false,
        isVaccineCardApiActive: globalSettings.isVaccineCardApiActive ?? false,
        isPscVectorApiActive: globalSettings.isPscVectorApiActive ?? false,
        isAutoSignTokenBased: globalSettings.isAutoSignTokenBased ?? false,
        autoSignTokenUrl: globalSettings.autoSignTokenUrl || '',
        isInfoVerifyTokenBased: globalSettings.isInfoVerifyTokenBased ?? false,
        infoVerifyTokenUrl: globalSettings.infoVerifyTokenUrl || '',
        isServerCopyTokenBased: globalSettings.isServerCopyTokenBased ?? false,
        serverCopyTokenUrl: globalSettings.serverCopyTokenUrl || '',
        isAutoNidTokenBased: globalSettings.isAutoNidTokenBased ?? false,
        autoNidTokenUrl: globalSettings.autoNidTokenUrl || ''
      });
    }
  }, [globalSettings]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, isSpecial: false },
    { id: 'users', label: 'Users', icon: Users, isSpecial: false },
    { id: 'services', label: 'Services', icon: LayoutGrid, isSpecial: false },
    { id: 'orders', label: 'Orders', icon: ShoppingBag, isSpecial: false },
    { id: 'recharge-requests', label: 'Recharge Requests', icon: CreditCard, isSpecial: false },
    { id: 'notifications', label: 'Notifications', icon: Megaphone, isSpecial: false },
    { id: 'settings', label: 'Settings', icon: Settings, isSpecial: false },
    { id: 'trash', label: 'Trash', icon: Trash2, isSpecial: false },
  ];

  const adminSearchItems = [
    ...navItems,
    { id: 'user-panel', label: 'Switch to User Panel', icon: LayoutDashboard, isSpecial: true },
  ];

  const filteredAdminSearchItems = [
    ...adminSearchItems.filter(item => 
      item.label.toLowerCase().includes(adminSearchQuery.toLowerCase())
    ),
    ...allUsers.filter(u => 
      u.displayName?.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
      u.userId?.toLowerCase().includes(adminSearchQuery.toLowerCase())
    ).map(u => ({
      id: `user-${u.uid}`,
      label: `User: ${u.displayName || u.email} (${u.userId || 'No ID'})`,
      icon: Users,
      isSpecial: false,
      isUser: true,
      uid: u.uid
    }))
  ];

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
              <Logo className="w-8 h-8 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-slate-900 leading-none mt-1">All Services</span>
                <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mt-0.5">Platform</span>
              </div>
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
                value={adminSearchQuery || ''}
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
                              } else if ((item as any).isUser) {
                                const uid = (item as any).uid;
                                const user = allUsers.find(u => u.uid === uid);
                                if (user) {
                                  // Set the user profile to the selected user and switch to user panel
                                  // Assuming there's a way to set the current user context
                                  // Based on existing code, setting userProfile might work if it's passed down
                                  // But for now, we'll use the existing admin viewing mechanism
                                  // We need to make sure the UserPanel component receives the correct user
                                  // For now, let's just trigger the admin view
                                  setIsAdminViewingUserPanel(true);
                                  // You might need to add a state to track which user is being viewed
                                  // and pass it to UserPanel
                                }
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

            {activeTab === 'services' && (
              <div className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">Service Management</h1>
                    <p className="text-slate-500">Add, edit, and manage all platform services.</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Search services..." 
                        value={serviceSearchQuery || ''}
                        onChange={(e) => setServiceSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-full text-sm w-64 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                      />
                    </div>
                    <button 
                      onClick={() => {
                        setEditingService(null);
                        setIsServiceModalOpen(true);
                      }}
                      className="bg-indigo-600 text-white px-6 py-2 rounded-full font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Service
                    </button>
                  </div>
                </div>

                {/* Category Filter */}
                <div className="flex items-center bg-white border border-slate-200 rounded-full p-1 shadow-sm overflow-x-auto max-w-full no-scrollbar">
                  <div className="flex items-center px-4 sticky left-0 bg-white border-r border-slate-100 mr-2">
                    <Filter className="w-4 h-4 text-slate-400 mr-2" />
                    <span className="text-sm font-bold text-slate-600">Category:</span>
                  </div>
                  {['All', 'NID', 'Certificate', 'Biometric', 'Location', 'Passport', 'Server', 'Tax', 'Government', 'Social', 'Premium'].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setServiceCategoryFilter(filter)}
                      className={cn(
                        "px-6 py-1.5 rounded-full text-sm font-bold transition-all whitespace-nowrap",
                        serviceCategoryFilter === filter 
                          ? "bg-indigo-600 text-white shadow-sm" 
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {products.filter(p => {
                    const matchesSearch = p.titleEn?.toLowerCase().includes(serviceSearchQuery.toLowerCase()) || 
                                        p.titleBn?.toLowerCase().includes(serviceSearchQuery.toLowerCase());
                    const matchesCategory = serviceCategoryFilter === 'All' || p.category?.toLowerCase() === serviceCategoryFilter.toLowerCase();
                    return matchesSearch && matchesCategory;
                  }).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)).map((product, i) => {
                    const IconComponent = product.iconName && icons[product.iconName as keyof typeof icons] 
                      ? icons[product.iconName as keyof typeof icons] 
                      : (product.icon || LayoutGrid);
                    
                    return (
                    <motion.div
                      key={product.id || i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden flex flex-col"
                    >
                      <div className="p-5 flex-1">
                        <div className="flex items-start justify-between mb-4">
                          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg", product.color || 'bg-indigo-500')}>
                            <IconComponent className="w-6 h-6" />
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => updateProduct(product.id, { isActive: !product.isActive })}
                              className={cn(
                                "p-2 rounded-lg transition-all",
                                product.isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                              )}
                              title={product.isActive ? "Active" : "Inactive"}
                            >
                              {product.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        
                        <h3 className="font-bold text-slate-900 mb-1">{product.titleBn}</h3>
                        <p className="text-[13px] text-slate-400 font-medium mb-3">{product.titleEn}</p>
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Clock className="w-3 h-3" />
                            <span>{product.deliveryTime || 'Standard Delivery'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Tag className="w-3 h-3" />
                            <span>{product.category}</span>
                          </div>
                        </div>

                        {product.shortDescription && (
                          <p className="text-xs text-slate-500 line-clamp-2 mb-4">{product.shortDescription}</p>
                        )}
                      </div>

                      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button 
                          onClick={() => {
                            setEditingService(product);
                            setIsServiceModalOpen(true);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all"
                        >
                          <Edit3 className="w-3 h-3" />
                          Edit Details
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this service?')) {
                              deleteProduct(product.id);
                            }
                          }}
                          className="p-2 bg-white border border-slate-200 rounded-xl text-red-500 hover:bg-red-50 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )})}
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
                      value={orderSearchQuery || ''}
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
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">User (ID)</th>
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
                              </p>
                              <p className="text-[10px] text-slate-400">৳{order.price || 0} • {order.createdAt?.toDate?.()?.toLocaleString()}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-slate-600">{order.userEmail}</p>
                              <p className="text-[10px] text-indigo-600 font-mono font-bold mt-1">ID: {allUsers.find(u => u.uid === order.uid)?.userId || 'N/A'}</p>
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
                                  <Edit3 className="w-3 h-3" />
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
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
                      <button 
                        onClick={async () => {
                          const usersWithoutId = allUsers.filter(u => !u.userId);
                          if (usersWithoutId.length === 0) {
                            alert('All users already have a UserID.');
                            return;
                          }
                          if (confirm(`Found ${usersWithoutId.length} users without UserID. Generate IDs for them?`)) {
                            let count = 0;
                            for (const u of usersWithoutId) {
                              const shortId = Math.floor(100000 + Math.random() * 900000).toString();
                              await updateUser(u.uid, { userId: shortId });
                              count++;
                            }
                            alert(`Successfully generated IDs for ${count} users.`);
                          }
                        }}
                        className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-200 transition-all flex items-center gap-1.5"
                      >
                        <Fingerprint className="w-3.5 h-3.5" />
                        Fix Missing IDs
                      </button>
                    </div>
                    <p className="text-slate-500">Manage user balances, roles, and status.</p>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search users..." 
                      value={userSearchQuery || ''}
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
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">UserID</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">WhatsApp</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Password</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Role</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">API Key</th>
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
                              <span className="text-sm font-mono text-indigo-600 font-bold">{u.userId || 'N/A'}</span>
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
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-slate-500 truncate max-w-[80px]" title={u.apiKey || 'No API Key'}>
                                  {u.apiKey || 'N/A'}
                                </span>
                                <button 
                                  onClick={() => {
                                    const newKey = 'ak_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                                    if (confirm(`Generate new API Key for ${u.displayName}?`)) {
                                      updateUser(u.uid, { apiKey: newKey });
                                    }
                                  }}
                                  className="p-1 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 transition-colors"
                                  title="Generate API Key"
                                >
                                  <Zap className="w-3 h-3" />
                                </button>
                              </div>
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
                                    onClick={() => setNotificationModalOpen(u)}
                                    className="text-xs font-bold text-emerald-600 hover:underline"
                                    title="Send Notification"
                                  >
                                    Notify
                                  </button>
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
                                <div className="text-xs text-slate-500 mt-1">
                                  {item.type === 'user' ? (
                                    <>
                                      {item.data.email} <br/>
                                      <span className="font-mono font-bold text-indigo-600">ID: {item.data.userId || 'N/A'}</span>
                                      {item.data.orders && item.data.orders.length > 0 && (
                                        <div className="mt-2 p-2 bg-slate-100 rounded-lg max-h-20 overflow-y-auto">
                                          <p className="font-bold text-slate-700 text-[10px]">Orders ({item.data.orders.length}):</p>
                                          {item.data.orders.map((o: any) => (
                                            <p key={o.id} className="text-[10px] text-slate-600">{o.serviceTitle} - {o.status}</p>
                                          ))}
                                        </div>
                                      )}
                                    </>
                                  ) : item.type === 'order' ? (
                                    <>
                                      Order ID: {item.id} <br/>
                                      User: {item.data.userEmail} <br/>
                                      <span className="font-mono font-bold text-indigo-600">ID: {item.data.userId || allUsers.find(u => u.uid === item.data.uid)?.userId || 'N/A'}</span>
                                    </>
                                  ) : `Product ID: ${item.id}`}
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

            {activeTab === 'recharge-requests' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">Recharge Requests</h1>
                    <p className="text-slate-500">Review and approve user balance recharge requests.</p>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search by Email or TrxID..." 
                      value={rechargeSearchQuery || ''}
                      onChange={(e) => setRechargeSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-full text-sm w-64 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">User Info</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Amount & Method</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Transaction Details</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredRechargeRequests.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                              No recharge requests found.
                            </td>
                          </tr>
                        ) : (
                          filteredRechargeRequests.map((order, i) => (
                            <tr key={order.id || i} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4">
                                <p className="text-sm font-bold text-slate-900">{order.userEmail}</p>
                                <p className="text-[10px] text-indigo-600 font-mono font-bold mt-1">ID: {allUsers.find(u => u.uid === order.uid)?.userId || 'N/A'}</p>
                                <p className="text-[10px] text-slate-400">{order.createdAt?.toDate?.()?.toLocaleString()}</p>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm font-black text-emerald-600">৳{order.amount}</p>
                                <p className="text-[10px] text-slate-500">Manual Recharge</p>
                              </td>
                              <td className="px-6 py-4">
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-slate-700">Sender: <span className="font-bold">{order.senderNumber}</span></p>
                                  <p className="text-xs font-medium text-slate-700">TrxID: <span className="font-bold text-indigo-600">{order.trxID}</span></p>
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
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {order.status === 'pending' && (
                                    <>
                                      <button 
                                        onClick={async () => {
                                          const user = allUsers.find(u => u.uid === order.uid);
                                          if (user) {
                                            const newBalance = user.balance + (order.amount || 0);
                                            await updateUserBalance(order.uid, newBalance);
                                            await updateOrderStatus(order.id!, 'completed', `Recharge of ৳${order.amount} approved.`);
                                            setSuccessMessage({ title: 'Success!', message: `Recharge of ৳${order.amount} approved and balance updated.` });
                                            setShowSuccess(true);
                                          } else {
                                            alert('User not found.');
                                          }
                                        }}
                                        className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all"
                                        title="Approve Recharge"
                                      >
                                        <CheckCircle className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={() => updateOrderStatus(order.id!, 'rejected', 'Recharge request rejected by admin.')}
                                        className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all"
                                        title="Reject Recharge"
                                      >
                                        <XCircle className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                  <button 
                                    onClick={() => setDeleteConfirm({ type: 'order', id: order.id! })}
                                    className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all"
                                    title="Delete Request"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
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

            {activeTab === 'notifications' && (
              <div className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">Notification Center</h1>
                    <p className="text-slate-500">Send customized messages to your users via Email or WhatsApp.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedUserIds.length > 0 && (
                      <button 
                        onClick={() => setNotificationModalOpen('selected')}
                        className="px-6 py-2.5 bg-emerald-600 text-white rounded-full text-sm font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        Send to Selected ({selectedUserIds.length})
                      </button>
                    )}
                    <button 
                      onClick={() => setNotificationModalOpen('all')}
                      className="px-6 py-2.5 bg-indigo-600 text-white rounded-full text-sm font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center gap-2"
                    >
                      <Megaphone className="w-4 h-4" />
                      Broadcast to All Users
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-indigo-600" />
                        Quick Message
                      </h3>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Subject (for Email)</label>
                          <input 
                            type="text"
                            value={notificationSubject}
                            onChange={(e) => setNotificationSubject(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            placeholder="Enter subject..."
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Message Content</label>
                          <textarea 
                            rows={6}
                            value={notificationMessage}
                            onChange={(e) => setNotificationMessage(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                            placeholder="Type your message here..."
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-6 flex items-start gap-4">
                      <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                        <Info className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-indigo-900">How it works</p>
                        <p className="text-xs text-indigo-700 leading-relaxed">
                          When you click "Send", the system will generate a direct link for WhatsApp or Email. 
                          For individual users, it uses their registered contact details. 
                          For broadcasts, you can select users from the list below to send messages sequentially.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-[600px]">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-lg">Users List</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {selectedUserIds.length} Selected
                          </span>
                        </div>
                      </div>

                      <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="text"
                          placeholder="Search users..."
                          value={notificationUserSearch}
                          onChange={(e) => setNotificationUserSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                      </div>

                      <div className="flex items-center justify-between px-2 py-2 bg-slate-50 rounded-lg mb-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={selectedUserIds.length === allUsers.length && allUsers.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUserIds(allUsers.map(u => u.uid));
                              } else {
                                setSelectedUserIds([]);
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-xs font-bold text-slate-600">Select All</span>
                        </label>
                        {selectedUserIds.length > 0 && (
                          <button 
                            onClick={() => setSelectedUserIds([])}
                            className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase"
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {allUsers
                          .filter(u => 
                            u.displayName?.toLowerCase().includes(notificationUserSearch.toLowerCase()) ||
                            u.email?.toLowerCase().includes(notificationUserSearch.toLowerCase()) ||
                            u.userId?.toLowerCase().includes(notificationUserSearch.toLowerCase())
                          )
                          .map(u => (
                            <div 
                              key={u.uid} 
                              className={cn(
                                "flex items-center justify-between p-3 rounded-xl border transition-all group",
                                selectedUserIds.includes(u.uid) 
                                  ? "bg-indigo-50 border-indigo-200" 
                                  : "bg-white border-slate-100 hover:border-slate-200"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <input 
                                  type="checkbox"
                                  checked={selectedUserIds.includes(u.uid)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedUserIds([...selectedUserIds, u.uid]);
                                    } else {
                                      setSelectedUserIds(selectedUserIds.filter(id => id !== u.uid));
                                    }
                                  }}
                                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <img src={u.photoURL} alt="" className="w-8 h-8 rounded-full border border-slate-200" />
                                <div>
                                  <p className="text-sm font-bold text-slate-900 line-clamp-1">{u.displayName}</p>
                                  <p className="text-[10px] text-slate-500">{u.userId || u.email}</p>
                                </div>
                              </div>
                              <button 
                                onClick={() => setNotificationModalOpen(u)}
                                className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
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
                          value={profileForm.displayName || ''}
                          onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          placeholder="Enter your name"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Profile Photo URL</label>
                        <input 
                          type="text"
                          value={profileForm.photoURL || ''}
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
                        value={premiumSettingsForm.premiumUnlockFee || 0}
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
                          value={premiumSettingsForm.bkashNumber || ''}
                          onChange={(e) => setPremiumSettingsForm({ ...premiumSettingsForm, bkashNumber: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          placeholder="017XXXXXXXX"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Nagad Number</label>
                        <input 
                          type="text"
                          value={premiumSettingsForm.nagadNumber || ''}
                          onChange={(e) => setPremiumSettingsForm({ ...premiumSettingsForm, nagadNumber: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          placeholder="017XXXXXXXX"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Rocket Number</label>
                        <input 
                          type="text"
                          value={premiumSettingsForm.rocketNumber || ''}
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
                        value={premiumSettingsForm.whatsappGroupLink || ''}
                        onChange={(e) => setPremiumSettingsForm({ ...premiumSettingsForm, whatsappGroupLink: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        placeholder="https://chat.whatsapp.com/..."
                      />
                      <p className="text-xs text-slate-500">Leave empty to hide the group join button from users.</p>
                    </div>

                    <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 space-y-4">
                      <h4 className="font-bold text-indigo-900 flex items-center gap-2">
                        <Smartphone className="w-4 h-4" />
                        SMS Notification Settings
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Admin Phone Number</label>
                          <input 
                            type="text"
                            value={premiumSettingsForm.adminPhoneNumber || ''}
                            onChange={(e) => setPremiumSettingsForm({ ...premiumSettingsForm, adminPhoneNumber: e.target.value })}
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            placeholder="01811152997"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">SMS Gateway Token (GreenWeb)</label>
                          <input 
                            type="password"
                            value={premiumSettingsForm.smsGatewayToken || ''}
                            onChange={(e) => setPremiumSettingsForm({ ...premiumSettingsForm, smsGatewayToken: e.target.value })}
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            placeholder="Enter your API Token"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-indigo-600 font-medium">
                        * This token is used to send SMS alerts to your phone when new orders arrive. 
                        Get your token from <a href="https://greenweb.com.bd" target="_blank" className="underline">GreenWeb.com.bd</a>
                      </p>
                    </div>

                    <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 space-y-4">
                      <h4 className="font-bold text-orange-900 flex items-center gap-2">
                        <Server className="w-4 h-4" />
                        Service API Settings
                      </h4>
                      
                      {/* Auto Sign Copy API Settings */}
                      <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between">
                          <h5 className="font-bold text-slate-800">অটো সাইন কপি (Auto Sign Copy)</h5>
                          <div className="flex items-center gap-4">
                            <label className="relative inline-flex items-center cursor-pointer" title="Maintenance Mode">
                              <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={premiumSettingsForm.isAutoSignMaintenance}
                                onChange={(e) => setPremiumSettingsForm({ ...premiumSettingsForm, isAutoSignMaintenance: e.target.checked })}
                              />
                              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                              <span className="ml-3 text-xs font-medium text-slate-700">
                                {premiumSettingsForm.isAutoSignMaintenance ? 'Maintenance ON' : 'Maintenance OFF'}
                              </span>
                            </label>
                            <label className="relative inline-flex items-center cursor-pointer" title="API Mode">
                              <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={premiumSettingsForm.isAutoSignApiActive}
                                onChange={(e) => setPremiumSettingsForm({ ...premiumSettingsForm, isAutoSignApiActive: e.target.checked })}
                              />
                              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                              <span className="ml-3 text-xs font-medium text-slate-700">
                                {premiumSettingsForm.isAutoSignApiActive ? 'API Mode' : 'Manual Mode'}
                              </span>
                            </label>
                          </div>
                        </div>
                        {premiumSettingsForm.isAutoSignApiActive && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg border border-orange-100">
                              <span className="text-xs font-bold text-orange-700">Token Based Auth</span>
                              <div 
                                className={cn(
                                  "w-10 h-5 rounded-full transition-all relative cursor-pointer",
                                  premiumSettingsForm.isAutoSignTokenBased ? "bg-orange-500" : "bg-slate-300"
                                )} 
                                onClick={() => setPremiumSettingsForm(prev => ({ ...prev, isAutoSignTokenBased: !prev.isAutoSignTokenBased }))}
                              >
                                <div className={cn(
                                  "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                                  premiumSettingsForm.isAutoSignTokenBased ? "left-5.5" : "left-0.5"
                                )} />
                              </div>
                            </div>
                            
                            {premiumSettingsForm.isAutoSignTokenBased && (
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Token URL</label>
                                <input 
                                  type="text"
                                  value={premiumSettingsForm.autoSignTokenUrl || ''}
                                  onChange={(e) => setPremiumSettingsForm({ ...premiumSettingsForm, autoSignTokenUrl: e.target.value })}
                                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                  placeholder="https://api.provider.com/v1/login"
                                />
                              </div>
                            )}

                            <div className="space-y-2">
                              <label className="text-sm font-medium text-slate-700">API Key</label>
                              <input 
                                type="password"
                                value={premiumSettingsForm.autoSignApiKey || ''}
                                onChange={(e) => setPremiumSettingsForm({ ...premiumSettingsForm, autoSignApiKey: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                placeholder="Enter API Key for Auto Sign Copy"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Info Verification API Settings */}
                      <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between">
                          <h5 className="font-bold text-slate-800">তথ্য যাচাই (Info Verification)</h5>
                          <div className="flex items-center gap-4">
                            <label className="relative inline-flex items-center cursor-pointer" title="Maintenance Mode">
                              <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={premiumSettingsForm.isInfoVerifyMaintenance}
                                onChange={(e) => setPremiumSettingsForm({ ...premiumSettingsForm, isInfoVerifyMaintenance: e.target.checked })}
                              />
                              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                              <span className="ml-3 text-xs font-medium text-slate-700">
                                {premiumSettingsForm.isInfoVerifyMaintenance ? 'Maintenance ON' : 'Maintenance OFF'}
                              </span>
                            </label>
                            <label className="relative inline-flex items-center cursor-pointer" title="API Mode">
                              <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={premiumSettingsForm.isInfoVerifyApiActive}
                                onChange={(e) => setPremiumSettingsForm({ ...premiumSettingsForm, isInfoVerifyApiActive: e.target.checked })}
                              />
                              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                              <span className="ml-3 text-xs font-medium text-slate-700">
                                {premiumSettingsForm.isInfoVerifyApiActive ? 'API Mode' : 'Manual Mode'}
                              </span>
                            </label>
                          </div>
                        </div>
                        {premiumSettingsForm.isInfoVerifyApiActive && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                              <span className="text-xs font-bold text-emerald-700">Token Based Auth</span>
                              <div 
                                className={cn(
                                  "w-10 h-5 rounded-full transition-all relative cursor-pointer",
                                  premiumSettingsForm.isInfoVerifyTokenBased ? "bg-emerald-500" : "bg-slate-300"
                                )} 
                                onClick={() => setPremiumSettingsForm(prev => ({ ...prev, isInfoVerifyTokenBased: !prev.isInfoVerifyTokenBased }))}
                              >
                                <div className={cn(
                                  "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                                  premiumSettingsForm.isInfoVerifyTokenBased ? "left-5.5" : "left-0.5"
                                )} />
                              </div>
                            </div>

                            {premiumSettingsForm.isInfoVerifyTokenBased && (
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Token URL</label>
                                <input 
                                  type="text"
                                  value={premiumSettingsForm.infoVerifyTokenUrl || ''}
                                  onChange={(e) => setPremiumSettingsForm({ ...premiumSettingsForm, infoVerifyTokenUrl: e.target.value })}
                                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                  placeholder="https://api.provider.com/v1/login"
                                />
                              </div>
                            )}

                            <div className="space-y-2">
                              <label className="text-sm font-medium text-slate-700">API Key (e.g. Porichoy)</label>
                              <input 
                                type="password"
                                value={premiumSettingsForm.infoVerifyApiKey || ''}
                                onChange={(e) => setPremiumSettingsForm({ ...premiumSettingsForm, infoVerifyApiKey: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                placeholder="Enter API Key for Info Verification"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Server Copy API Settings */}
                      <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between">
                          <h5 className="font-bold text-slate-800">তথ্য খুঁজুন / ছবি বের করুন (Server Copy)</h5>
                          <div className="flex items-center gap-4">
                            <label className="relative inline-flex items-center cursor-pointer" title="Maintenance Mode">
                              <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={premiumSettingsForm.isServerCopyMaintenance}
                                onChange={(e) => setPremiumSettingsForm({ ...premiumSettingsForm, isServerCopyMaintenance: e.target.checked })}
                              />
                              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                              <span className="ml-3 text-xs font-medium text-slate-700">
                                {premiumSettingsForm.isServerCopyMaintenance ? 'Maintenance ON' : 'Maintenance OFF'}
                              </span>
                            </label>
                            <label className="relative inline-flex items-center cursor-pointer" title="API Mode">
                              <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={premiumSettingsForm.isServerCopyApiActive}
                                onChange={(e) => setPremiumSettingsForm({ ...premiumSettingsForm, isServerCopyApiActive: e.target.checked })}
                              />
                              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                              <span className="ml-3 text-xs font-medium text-slate-700">
                                {premiumSettingsForm.isServerCopyApiActive ? 'API Mode' : 'Manual Mode'}
                              </span>
                            </label>
                          </div>
                        </div>
                        {premiumSettingsForm.isServerCopyApiActive && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-100">
                              <span className="text-xs font-bold text-blue-700">Token Based Auth</span>
                              <div 
                                className={cn(
                                  "w-10 h-5 rounded-full transition-all relative cursor-pointer",
                                  premiumSettingsForm.isServerCopyTokenBased ? "bg-blue-500" : "bg-slate-300"
                                )} 
                                onClick={() => setPremiumSettingsForm(prev => ({ ...prev, isServerCopyTokenBased: !prev.isServerCopyTokenBased }))}
                              >
                                <div className={cn(
                                  "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                                  premiumSettingsForm.isServerCopyTokenBased ? "left-5.5" : "left-0.5"
                                )} />
                              </div>
                            </div>

                            {premiumSettingsForm.isServerCopyTokenBased && (
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Token URL</label>
                                <input 
                                  type="text"
                                  value={premiumSettingsForm.serverCopyTokenUrl || ''}
                                  onChange={(e) => setPremiumSettingsForm({ ...premiumSettingsForm, serverCopyTokenUrl: e.target.value })}
                                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                  placeholder="https://api.provider.com/v1/login"
                                />
                              </div>
                            )}

                            <div className="space-y-2">
                              <label className="text-sm font-medium text-slate-700">API Key</label>
                              <input 
                                type="password"
                                value={premiumSettingsForm.serverCopyApiKey || ''}
                                onChange={(e) => setPremiumSettingsForm({ ...premiumSettingsForm, serverCopyApiKey: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="Enter API Key for Server Copy"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Auto NID API Settings */}
                      <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between">
                          <h5 className="font-bold text-slate-800">অটো এনআইডি (Auto NID)</h5>
                          <div className="flex items-center gap-4">
                            <label className="relative inline-flex items-center cursor-pointer" title="Maintenance Mode">
                              <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={premiumSettingsForm.isAutoNidMaintenance}
                                onChange={(e) => setPremiumSettingsForm({ ...premiumSettingsForm, isAutoNidMaintenance: e.target.checked })}
                              />
                              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                              <span className="ml-3 text-xs font-medium text-slate-700">
                                {premiumSettingsForm.isAutoNidMaintenance ? 'Maintenance ON' : 'Maintenance OFF'}
                              </span>
                            </label>
                            <label className="relative inline-flex items-center cursor-pointer" title="API Mode">
                              <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={premiumSettingsForm.isAutoNidApiActive}
                                onChange={(e) => setPremiumSettingsForm({ ...premiumSettingsForm, isAutoNidApiActive: e.target.checked })}
                              />
                              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                              <span className="ml-3 text-xs font-medium text-slate-700">
                                {premiumSettingsForm.isAutoNidApiActive ? 'API Mode' : 'Manual Mode'}
                              </span>
                            </label>
                          </div>
                        </div>
                        {premiumSettingsForm.isAutoNidApiActive && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg border border-purple-100">
                              <span className="text-xs font-bold text-purple-700">Token Based Auth</span>
                              <div 
                                className={cn(
                                  "w-10 h-5 rounded-full transition-all relative cursor-pointer",
                                  premiumSettingsForm.isAutoNidTokenBased ? "bg-purple-500" : "bg-slate-300"
                                )} 
                                onClick={() => setPremiumSettingsForm(prev => ({ ...prev, isAutoNidTokenBased: !prev.isAutoNidTokenBased }))}
                              >
                                <div className={cn(
                                  "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                                  premiumSettingsForm.isAutoNidTokenBased ? "left-5.5" : "left-0.5"
                                )} />
                              </div>
                            </div>

                            {premiumSettingsForm.isAutoNidTokenBased && (
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Token URL</label>
                                <input 
                                  type="text"
                                  value={premiumSettingsForm.autoNidTokenUrl || ''}
                                  onChange={(e) => setPremiumSettingsForm({ ...premiumSettingsForm, autoNidTokenUrl: e.target.value })}
                                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                  placeholder="https://api.provider.com/v1/login"
                                />
                              </div>
                            )}

                            <div className="space-y-2">
                              <label className="text-sm font-medium text-slate-700">API Key</label>
                              <input 
                                type="password"
                                value={premiumSettingsForm.autoNidApiKey || ''}
                                onChange={(e) => setPremiumSettingsForm({ ...premiumSettingsForm, autoNidApiKey: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                placeholder="Enter API Key for Auto NID"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <p className="text-[10px] text-orange-600 font-medium">
                        * When API Mode is ON, the system will automatically fetch results using the provided API Key. When OFF, orders will be placed manually for admins to process.
                      </p>
                    </div>

                    {/* API Reselling Settings */}
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-4">
                      <h4 className="font-bold text-blue-900 flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        API Reselling & Automation
                      </h4>
                      
                      <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
                        <div>
                          <h4 className="font-bold text-slate-900">Enable API Reselling</h4>
                          <p className="text-sm text-slate-500">Forward orders to another provider via API.</p>
                        </div>
                        <div 
                          className={cn(
                            "w-12 h-6 rounded-full transition-all relative cursor-pointer",
                            premiumSettingsForm.isApiResellingActive ? "bg-blue-500" : "bg-slate-300"
                          )} 
                          onClick={() => setPremiumSettingsForm(prev => ({ ...prev, isApiResellingActive: !prev.isApiResellingActive }))}
                        >
                          <div className={cn(
                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                            premiumSettingsForm.isApiResellingActive ? "left-7" : "left-1"
                          )} />
                        </div>
                      </div>

                      {premiumSettingsForm.isApiResellingActive && (
                        <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-200">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-slate-700">Provider API URL</label>
                              <input 
                                type="text"
                                value={premiumSettingsForm.providerApiUrl || ''}
                                onChange={(e) => setPremiumSettingsForm({ ...premiumSettingsForm, providerApiUrl: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="https://provider.com/api/v2"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-slate-700">Provider API Key</label>
                              <input 
                                type="password"
                                value={premiumSettingsForm.providerApiKey || ''}
                                onChange={(e) => setPremiumSettingsForm({ ...premiumSettingsForm, providerApiKey: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="Enter API Key"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-slate-700">Profit Markup Type</label>
                              <select 
                                value={premiumSettingsForm.markupType || 'flat'}
                                onChange={(e) => setPremiumSettingsForm({ ...premiumSettingsForm, markupType: e.target.value as 'flat' | 'percentage' })}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                              >
                                <option value="flat">Flat Amount (৳)</option>
                                <option value="percentage">Percentage (%)</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-slate-700">Markup Value</label>
                              <input 
                                type="number"
                                value={premiumSettingsForm.markupValue || 0}
                                onChange={(e) => setPremiumSettingsForm({ ...premiumSettingsForm, markupValue: Number(e.target.value) })}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="e.g. 20"
                              />
                            </div>
                          </div>
                          <p className="text-[10px] text-blue-600 font-medium italic">
                            * This markup will be added to the provider's price automatically on your site.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Specific Service API Toggles */}
                    <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 space-y-4">
                      <h4 className="font-bold text-indigo-900 flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Special Service API Settings (ড্রাইভ লিংক মোড)
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold text-slate-700">স্মার্ট কার্ড অর্ডার</p>
                            <p className="text-[10px] text-slate-500">Enable Drive Link Mode</p>
                          </div>
                          <button 
                            onClick={() => setPremiumSettingsForm(prev => ({ ...prev, isSmartCardApiActive: !prev.isSmartCardApiActive }))}
                            className={cn(
                              "w-full py-1.5 rounded-lg text-[10px] font-bold transition-all",
                              premiumSettingsForm.isSmartCardApiActive ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"
                            )}
                          >
                            {premiumSettingsForm.isSmartCardApiActive ? 'API Mode ON' : 'Manual Mode'}
                          </button>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold text-slate-700">নিকানাম ফর্ম</p>
                            <p className="text-[10px] text-slate-500">Enable Drive Link Mode</p>
                          </div>
                          <button 
                            onClick={() => setPremiumSettingsForm(prev => ({ ...prev, isNicknameApiActive: !prev.isNicknameApiActive }))}
                            className={cn(
                              "w-full py-1.5 rounded-lg text-[10px] font-bold transition-all",
                              premiumSettingsForm.isNicknameApiActive ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"
                            )}
                          >
                            {premiumSettingsForm.isNicknameApiActive ? 'API Mode ON' : 'Manual Mode'}
                          </button>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold text-slate-700">টিকা কার্ড ভেক্টর</p>
                            <p className="text-[10px] text-slate-500">Enable Drive Link Mode</p>
                          </div>
                          <button 
                            onClick={() => setPremiumSettingsForm(prev => ({ ...prev, isVaccineCardApiActive: !prev.isVaccineCardApiActive }))}
                            className={cn(
                              "w-full py-1.5 rounded-lg text-[10px] font-bold transition-all",
                              premiumSettingsForm.isVaccineCardApiActive ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"
                            )}
                          >
                            {premiumSettingsForm.isVaccineCardApiActive ? 'API Mode ON' : 'Manual Mode'}
                          </button>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold text-slate-700">পিএসসি সার্টিফিকেট</p>
                            <p className="text-[10px] text-slate-500">Enable Drive Link Mode</p>
                          </div>
                          <button 
                            onClick={() => setPremiumSettingsForm(prev => ({ ...prev, isPscVectorApiActive: !prev.isPscVectorApiActive }))}
                            className={cn(
                              "w-full py-1.5 rounded-lg text-[10px] font-bold transition-all",
                              premiumSettingsForm.isPscVectorApiActive ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"
                            )}
                          >
                            {premiumSettingsForm.isPscVectorApiActive ? 'API Mode ON' : 'Manual Mode'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Developer API Documentation */}
                    <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-4 mt-6">
                      <h4 className="font-bold text-white flex items-center gap-2">
                        <Zap className="w-4 h-4 text-indigo-400" />
                        Developer API Documentation (আপনার এপিআই তথ্য)
                      </h4>
                      
                      <div className="space-y-4">
                        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Base URL</p>
                          <div className="flex items-center justify-between gap-2">
                            <code className="text-xs text-slate-300 font-mono break-all">{window.location.origin}</code>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(window.location.origin);
                                alert('Base URL copied!');
                              }}
                              className="p-1 hover:bg-slate-700 rounded text-slate-400 transition-colors"
                            >
                              <Download className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">Place Order</p>
                            <code className="text-[10px] text-slate-300 font-mono">POST /api/v1/order</code>
                          </div>
                          <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">Check Balance</p>
                            <code className="text-[10px] text-slate-300 font-mono">GET /api/v1/balance</code>
                          </div>
                        </div>

                        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Required Headers</p>
                          <code className="text-[10px] text-slate-300 font-mono block">x-api-key: [USER_API_KEY]</code>
                          <code className="text-[10px] text-slate-300 font-mono block">Content-Type: application/json</code>
                        </div>

                        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Example Body (Order)</p>
                          <pre className="text-[10px] text-slate-400 font-mono overflow-x-auto">
{`{
  "serviceId": 1,
  "data": "NID: 1234567890\\nDOB: 1990-01-01"
}`}
                          </pre>
                        </div>
                      </div>
                      
                      <p className="text-[10px] text-slate-500 italic">
                        * রিসেলারদের আপনার এপিআই দিতে চাইলে তাদের প্রোফাইল থেকে এপিআই কি জেনারেট করে দিন।
                      </p>
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
                            whatsappGroupLink: premiumSettingsForm.whatsappGroupLink,
                            smsGatewayToken: premiumSettingsForm.smsGatewayToken,
                            adminPhoneNumber: premiumSettingsForm.adminPhoneNumber,
                            porichoyApiKey: premiumSettingsForm.porichoyApiKey,
                            enkimaaApiKey: premiumSettingsForm.enkimaaApiKey,
                            isAutoSignApiActive: premiumSettingsForm.isAutoSignApiActive,
                            autoSignApiKey: premiumSettingsForm.autoSignApiKey,
                            isInfoVerifyApiActive: premiumSettingsForm.isInfoVerifyApiActive,
                            infoVerifyApiKey: premiumSettingsForm.infoVerifyApiKey,
                            isServerCopyApiActive: premiumSettingsForm.isServerCopyApiActive,
                            serverCopyApiKey: premiumSettingsForm.serverCopyApiKey,
                            isAutoNidApiActive: premiumSettingsForm.isAutoNidApiActive,
                            autoNidApiKey: premiumSettingsForm.autoNidApiKey,
                            isAutoSignMaintenance: premiumSettingsForm.isAutoSignMaintenance,
                            isInfoVerifyMaintenance: premiumSettingsForm.isInfoVerifyMaintenance,
                            isServerCopyMaintenance: premiumSettingsForm.isServerCopyMaintenance,
                            isAutoNidMaintenance: premiumSettingsForm.isAutoNidMaintenance,
                            isApiResellingActive: premiumSettingsForm.isApiResellingActive,
                            providerApiUrl: premiumSettingsForm.providerApiUrl,
                            providerApiKey: premiumSettingsForm.providerApiKey,
                            markupType: premiumSettingsForm.markupType,
                            markupValue: premiumSettingsForm.markupValue,
                            isSmartCardApiActive: premiumSettingsForm.isSmartCardApiActive,
                            isNicknameApiActive: premiumSettingsForm.isNicknameApiActive,
                            isVaccineCardApiActive: premiumSettingsForm.isVaccineCardApiActive,
                            isPscVectorApiActive: premiumSettingsForm.isPscVectorApiActive,
                            isAutoSignTokenBased: premiumSettingsForm.isAutoSignTokenBased,
                            autoSignTokenUrl: premiumSettingsForm.autoSignTokenUrl,
                            isInfoVerifyTokenBased: premiumSettingsForm.isInfoVerifyTokenBased,
                            infoVerifyTokenUrl: premiumSettingsForm.infoVerifyTokenUrl,
                            isServerCopyTokenBased: premiumSettingsForm.isServerCopyTokenBased,
                            serverCopyTokenUrl: premiumSettingsForm.serverCopyTokenUrl,
                            isAutoNidTokenBased: premiumSettingsForm.isAutoNidTokenBased,
                            autoNidTokenUrl: premiumSettingsForm.autoNidTokenUrl
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
        {/* Notification Modal */}
        <AnimatePresence>
          {notificationModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setNotificationModalOpen(null)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden"
              >
                <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <Megaphone className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Send Notification</h3>
                      <p className="text-xs text-slate-500">
                        {notificationModalOpen === 'all' ? 'Broadcasting to all users' : 
                         notificationModalOpen === 'selected' ? `Broadcasting to ${selectedUserIds.length} selected users` :
                         `Sending to ${notificationModalOpen.displayName}`}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setNotificationModalOpen(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="p-8 space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Subject</label>
                      <input 
                        type="text"
                        value={notificationSubject}
                        onChange={(e) => setNotificationSubject(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        placeholder="Enter subject..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Message</label>
                      <textarea 
                        rows={5}
                        value={notificationMessage}
                        onChange={(e) => setNotificationMessage(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                        placeholder="Type your message here..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => handleSendNotification('whatsapp', notificationModalOpen)}
                      className="flex flex-col items-center gap-3 p-6 bg-emerald-50 border border-emerald-100 rounded-2xl hover:bg-emerald-100 transition-all group"
                    >
                      <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-emerald-900">WhatsApp</p>
                        <p className="text-[10px] text-emerald-600 font-medium">Send via WA.me</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => handleSendNotification('email', notificationModalOpen)}
                      className="flex flex-col items-center gap-3 p-6 bg-indigo-50 border border-indigo-100 rounded-2xl hover:bg-indigo-100 transition-all group"
                    >
                      <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                        <Mail className="w-6 h-6" />
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-indigo-900">Email</p>
                        <p className="text-[10px] text-indigo-600 font-medium">Send via Mailto</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                  <p className="text-[10px] text-slate-400 font-medium">
                    Note: This will open your default Email client or WhatsApp application.
                  </p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
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
                    value={adminNote || ''}
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
                    value={rejectionNote || ''}
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
                    value={newBalanceValue || ''}
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
                  value={reportUserSearchQuery || ''}
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
      {/* Service Modal */}
      <ServiceModal 
        isOpen={isServiceModalOpen}
        onClose={() => {
          setIsServiceModalOpen(false);
          setEditingService(null);
        }}
        service={editingService}
        onSave={async (data) => {
          if (editingService) {
            await updateProduct(editingService.id, data);
          } else {
            await addProduct(data as any);
          }
          setIsServiceModalOpen(false);
          setEditingService(null);
        }}
      />
    </div>
  );
};

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: Product | null;
  onSave: (data: Partial<Product>) => Promise<void>;
}

const ServiceModal: React.FC<ServiceModalProps> = ({ isOpen, onClose, service, onSave }) => {
  const [formData, setFormData] = useState<Partial<Product>>({
    titleBn: '',
    titleEn: '',
    category: 'NID',
    shortDescription: '',
    fullDescription: '',
    price: 0,
    discountPrice: undefined,
    deliveryTime: '',
    requiredDocuments: '',
    instructions: '',
    orderButtonText: 'অর্ডার করুন',
    displayOrder: 0,
    isActive: true,
    requiresFileUpload: false,
    isDriveLinkMode: false,
    autoDeliveryLink: '',
    color: 'bg-indigo-500',
    iconName: 'LayoutGrid',
    defaultData: '',
    options: []
  });

  useEffect(() => {
    if (service) {
      setFormData({
        ...service,
        iconName: service.iconName || 'LayoutGrid',
        options: service.options || []
      });
    } else {
      setFormData({
        titleBn: '',
        titleEn: '',
        category: 'NID',
        shortDescription: '',
        fullDescription: '',
        price: 0,
        discountPrice: undefined,
        deliveryTime: '',
        requiredDocuments: '',
        instructions: '',
        orderButtonText: 'অর্ডার করুন',
        displayOrder: 0,
        isActive: true,
        requiresFileUpload: false,
        isDriveLinkMode: false,
        autoDeliveryLink: '',
        color: 'bg-indigo-500',
        iconName: 'LayoutGrid',
        defaultData: '',
        options: []
      });
    }
  }, [service, isOpen]);

  const addOption = () => {
    const currentOptions = formData.options || [];
    setFormData({
      ...formData,
      options: [...currentOptions, { name: '', price: 0 }]
    });
  };

  const removeOption = (index: number) => {
    const currentOptions = formData.options || [];
    setFormData({
      ...formData,
      options: currentOptions.filter((_, i) => i !== index)
    });
  };

  const updateOption = (index: number, field: 'name' | 'price', value: string | number) => {
    const currentOptions = formData.options || [];
    const newOptions = [...currentOptions];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setFormData({ ...formData, options: newOptions });
  };

  const colors = [
    { name: 'Indigo', class: 'bg-indigo-500' },
    { name: 'Blue', class: 'bg-blue-600' },
    { name: 'Emerald', class: 'bg-emerald-500' },
    { name: 'Amber', class: 'bg-amber-500' },
    { name: 'Rose', class: 'bg-rose-500' },
    { name: 'Violet', class: 'bg-violet-600' },
    { name: 'Cyan', class: 'bg-cyan-500' },
    { name: 'Slate', class: 'bg-slate-700' },
    { name: 'Orange', class: 'bg-orange-500' },
    { name: 'Teal', class: 'bg-teal-500' },
    { name: 'Pink', class: 'bg-pink-500' },
    { name: 'Red', class: 'bg-red-600' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-900">{service ? 'Edit Service' : 'Add New Service'}</h2>
            <p className="text-sm text-slate-500">Fill in the details below to {service ? 'update' : 'create'} a service.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-all shadow-sm border border-transparent hover:border-slate-200">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Basic Info */}
            <div className="space-y-6">
              <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest">Basic Information</h3>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Service Name (Bangla)</label>
                <input 
                  type="text"
                  value={formData.titleBn || ''}
                  onChange={(e) => setFormData({ ...formData, titleBn: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                  placeholder="উদা: নতুন জন্ম নিবন্ধন"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Service Name (English)</label>
                <input 
                  type="text"
                  value={formData.titleEn || ''}
                  onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                  placeholder="e.g. New Birth Registration"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Category</label>
                  <select 
                    value={formData.category || 'NID'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                  >
                    {['NID', 'Certificate', 'Biometric', 'Location', 'Passport', 'Server', 'Tax', 'Government', 'Social', 'Premium'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Display Order</label>
                  <input 
                    type="number"
                    value={formData.displayOrder || 0}
                    onChange={(e) => setFormData({ ...formData, displayOrder: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Price (৳)</label>
                  <input 
                    type="number"
                    value={formData.price || 0}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Discount Price (৳)</label>
                  <input 
                    type="number"
                    value={formData.discountPrice || ''}
                    onChange={(e) => setFormData({ ...formData, discountPrice: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                    placeholder="Optional"
                  />
                </div>
              </div>

              {/* Individual Markup Settings */}
              <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 space-y-4">
                <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                  <DollarSign className="w-3 h-3" />
                  Individual Markup (Optional)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600">Markup Type</label>
                    <select 
                      value={formData.markupType || ''}
                      onChange={(e) => setFormData({ ...formData, markupType: e.target.value as any || undefined })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                    >
                      <option value="">Use Global Settings</option>
                      <option value="flat">Flat Amount (৳)</option>
                      <option value="percentage">Percentage (%)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600">Markup Value</label>
                    <input 
                      type="number"
                      value={formData.markupValue ?? ''}
                      onChange={(e) => setFormData({ ...formData, markupValue: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                      placeholder="0"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  If set, this will override the Global Markup settings for this specific service.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Delivery Time</label>
                <input 
                  type="text"
                  value={formData.deliveryTime || ''}
                  onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                  placeholder="e.g. 1-2 Hours, 24 Hours"
                />
              </div>

              <div className="space-y-4 pt-4">
                <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest">Visual Style</h3>
                
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">Select Icon</label>
                  <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-200 custom-scrollbar">
                    {Object.entries(icons).map(([name, Icon]) => (
                      <button
                        key={name}
                        onClick={() => setFormData({ ...formData, iconName: name })}
                        className={cn(
                          "p-3 rounded-xl flex items-center justify-center transition-all",
                          formData.iconName === name 
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" 
                            : "bg-white text-slate-400 hover:text-slate-600 border border-slate-100"
                        )}
                        title={name}
                      >
                        <Icon className="w-5 h-5" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">Select Color Theme</label>
                  <div className="grid grid-cols-6 gap-2">
                    {colors.map((color) => (
                      <button
                        key={color.class}
                        onClick={() => setFormData({ ...formData, color: color.class })}
                        className={cn(
                          "w-full aspect-square rounded-xl transition-all border-2",
                          formData.color === color.class 
                            ? "border-indigo-600 scale-110 shadow-md" 
                            : "border-transparent hover:scale-105"
                        )}
                        title={color.name}
                      >
                        <div className={cn("w-full h-full rounded-lg", color.class)} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <label className="text-sm font-bold text-slate-700">Auto Delivery Link (Optional)</label>
                  <input 
                    type="url"
                    value={formData.autoDeliveryLink || ''}
                    onChange={(e) => setFormData({ ...formData, autoDeliveryLink: e.target.value })}
                    className="w-full px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-indigo-900"
                    placeholder="https://drive.google.com/... (Instant Delivery)"
                  />
                  <p className="text-[10px] text-indigo-500 italic">
                    * If provided, the user will receive this link immediately after ordering.
                  </p>
                </div>
              </div>
            </div>

            {/* Descriptions & Details */}
            <div className="space-y-6">
              <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest">Service Details</h3>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Short Description</label>
                <textarea 
                  value={formData.shortDescription || ''}
                  onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium h-20 resize-none"
                  placeholder="A brief overview of the service..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Required Documents</label>
                <textarea 
                  value={formData.requiredDocuments || ''}
                  onChange={(e) => setFormData({ ...formData, requiredDocuments: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium h-24 resize-none"
                  placeholder="List documents required (one per line)..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Instructions / Notes</label>
                <textarea 
                  value={formData.instructions || ''}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium h-24 resize-none"
                  placeholder="Special instructions for the user..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Order Button Text</label>
                <input 
                  type="text"
                  value={formData.orderButtonText || ''}
                  onChange={(e) => setFormData({ ...formData, orderButtonText: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                  placeholder="Default: অর্ডার করুন"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <p className="text-sm font-bold text-slate-900">Require File Upload</p>
                  <p className="text-xs text-slate-500">Force user to upload a document</p>
                </div>
                <button 
                  onClick={() => setFormData({ ...formData, requiresFileUpload: !formData.requiresFileUpload })}
                  className={cn(
                    "w-12 h-6 rounded-full transition-all relative",
                    formData.requiresFileUpload ? "bg-indigo-600" : "bg-slate-300"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                    formData.requiresFileUpload ? "right-1" : "left-1"
                  )} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                <div>
                  <p className="text-sm font-bold text-indigo-900">Google Drive Link Mode</p>
                  <p className="text-xs text-indigo-600">On: User must provide Drive Link. Off: Manual Order.</p>
                </div>
                <button 
                  onClick={() => setFormData({ ...formData, isDriveLinkMode: !formData.isDriveLinkMode })}
                  className={cn(
                    "w-12 h-6 rounded-full transition-all relative",
                    formData.isDriveLinkMode ? "bg-indigo-600" : "bg-slate-300"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                    formData.isDriveLinkMode ? "right-1" : "left-1"
                  )} />
                </button>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest">Service Options</h3>
                  <button 
                    onClick={addOption}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg transition-all"
                  >
                    <Plus className="w-3 h-3" /> Add Option
                  </button>
                </div>
                
                <div className="space-y-3">
                  {(formData.options || []).map((option, index) => (
                    <div key={index} className="flex gap-2 items-start bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                      <div className="flex-1 space-y-2">
                        <input 
                          type="text"
                          value={option.name || ''}
                          onChange={(e) => updateOption(index, 'name', e.target.value)}
                          placeholder="Option Name (e.g. 3 Months)"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                        <input 
                          type="number"
                          value={option.price || 0}
                          onChange={(e) => updateOption(index, 'price', Number(e.target.value))}
                          placeholder="Price"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                      </div>
                      <button 
                        onClick={() => removeOption(index)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {(formData.options || []).length === 0 && (
                    <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-xs text-slate-400">No options added yet. Click "Add Option" to create variations.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Full Description & Form Template */}
            <div className="md:col-span-2 space-y-6">
              <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest">Advanced Configuration</h3>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Full Description (Markdown supported)</label>
                <textarea 
                  value={formData.fullDescription || ''}
                  onChange={(e) => setFormData({ ...formData, fullDescription: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium h-32 resize-none"
                  placeholder="Detailed information about the service..."
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-700">Order Form Template (JSON)</label>
                  <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold uppercase">Advanced</span>
                </div>
                <textarea 
                  value={formData.defaultData || ''}
                  onChange={(e) => setFormData({ ...formData, defaultData: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900 text-emerald-400 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-xs h-40 resize-none"
                  placeholder='[{"label": "NID Number", "type": "text", "required": true}]'
                />
                <p className="text-[10px] text-slate-400">Define the fields users need to fill when ordering this service.</p>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <h4 className="font-bold text-slate-900">Service Status</h4>
                  <p className="text-xs text-slate-500">Toggle visibility of this service on the user panel.</p>
                </div>
                <div 
                  className={cn(
                    "w-12 h-6 rounded-full transition-all relative cursor-pointer",
                    formData.isActive ? "bg-emerald-500" : "bg-slate-300"
                  )} 
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                    formData.isActive ? "left-7" : "left-1"
                  )} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-white transition-all border border-transparent hover:border-slate-200"
          >
            Cancel
          </button>
          <button 
            onClick={() => onSave(formData)}
            className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
          >
            {service ? 'Update Service' : 'Create Service'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminPanel;
