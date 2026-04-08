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
  }[];
  defaultData?: string;
}

export interface GlobalSettings {
  premiumUnlockFee: number;
  isPremiumFeatureActive: boolean;
  isServiceManagementActive: boolean;
  bkashNumber?: string;
  nagadNumber?: string;
  rocketNumber?: string;
  whatsappGroupLink?: string;
}

export interface TrashItem {
  id: string;
  type: 'user' | 'order' | 'product';
  data: any;
  deletedAt: Timestamp;
}
