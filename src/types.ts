import { Timestamp } from './firebase';

export interface UserProfile {
  uid: string;
  userId?: string;
  email: string;
  role: 'user' | 'admin';
  balance: number;
  displayName?: string;
  photoURL?: string;
  createdAt?: Timestamp;
  isPremium?: boolean;
  whatsapp?: string;
  password?: string;
  apiKey?: string;
  isBlocked?: boolean;
  isApiEnabled?: boolean;
}

export interface Order {
  id?: string;
  uid: string;
  serviceId: number;
  serviceTitle: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  data: string;
  price: number;
  createdAt: Timestamp;
  adminNote?: string;
  userEmail?: string;
  resultFile?: string;
  fileURL?: string;
  senderNumber?: string;
  trxID?: string;
}

export interface Product {
  id: number;
  titleBn: string;
  titleEn: string;
  category: string;
  price: number;
  discountPrice?: number;
  shortDescription?: string;
  fullDescription?: string;
  deliveryTime?: string;
  requiredDocuments?: string;
  instructions?: string;
  isActive: boolean;
  requiresFileUpload?: boolean;
  icon?: any;
  iconName?: string;
  color?: string;
  orderButtonText?: string;
  displayOrder?: number;
  options?: {
    name: string;
    price: number;
    autoDeliveryLink?: string;
  }[];
  defaultData?: string;
  markupType?: 'flat' | 'percentage';
  markupValue?: number;
  isDriveLinkMode?: boolean;
  autoDeliveryLink?: string;
}

export interface GlobalSettings {
  premiumUnlockFee: number;
  isPremiumFeatureActive: boolean;
  isServiceManagementActive: boolean;
  bkashNumber?: string;
  nagadNumber?: string;
  rocketNumber?: string;
  whatsappGroupLink?: string;
  smsGatewayToken?: string;
  adminPhoneNumber?: string;
  porichoyApiKey?: string;
  enkimaaApiKey?: string;
  isAutoSignApiActive?: boolean;
  autoSignApiKey?: string;
  isInfoVerifyApiActive?: boolean;
  infoVerifyApiKey?: string;
  isServerCopyApiActive?: boolean;
  serverCopyApiKey?: string;
  isAutoNidApiActive?: boolean;
  autoNidApiKey?: string;
  isAutoSignMaintenance?: boolean;
  isInfoVerifyMaintenance?: boolean;
  isServerCopyMaintenance?: boolean;
  isAutoNidMaintenance?: boolean;
  isApiResellingActive?: boolean;
  providerApiUrl?: string;
  providerApiKey?: string;
  markupType?: 'flat' | 'percentage';
  markupValue?: number;
  isSmartCardApiActive?: boolean;
  isNicknameApiActive?: boolean;
  isVaccineCardApiActive?: boolean;
  isPscVectorApiActive?: boolean;

  // Notification Settings
  telegramBotToken?: string;
  telegramChatId?: string;
  whatsappNotifyNumber?: string; // For automated WhatsApp notifications via API
  isTelegramNotifyActive?: boolean;
  isWhatsappNotifyActive?: boolean;

  // Token Based API Settings
  isAutoSignTokenBased?: boolean;
  autoSignTokenUrl?: string;
  isInfoVerifyTokenBased?: boolean;
  infoVerifyTokenUrl?: string;
  isServerCopyTokenBased?: boolean;
  serverCopyTokenUrl?: string;
  isAutoNidTokenBased?: boolean;
  autoNidTokenUrl?: string;
}

export interface TrashItem {
  id: string;
  type: 'user' | 'order' | 'product';
  data: any;
  deletedAt: Timestamp;
}
