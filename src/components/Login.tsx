import React, { useState, useEffect } from 'react';
import { LogIn, ShieldCheck, Shield, Mail, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, auth, db, doc, getDoc, setDoc, serverTimestamp, query, where, collection, getDocs, signInAnonymously } from '../firebase';
import { motion } from 'motion/react';
import { Logo } from './Logo';

interface LoginProps {
  onLogin: (user: any, profile: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
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
        // 1. Verify in Firestore first (our source of truth for profiles)
        const q = query(collection(db, 'users'), where('email', '==', email));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          throw new Error('No account found with this email. Please sign up.');
        }

        const userDoc = querySnapshot.docs[0];
        const profileData = userDoc.data();
        
        if (profileData.password && profileData.password !== password) {
          throw new Error('Wrong password. Please try again.');
        }

        if (isAdminRoute && profileData.role !== 'admin') {
          throw new Error('Access Denied! Only admins can login.');
        }
        
        if (!isAdminRoute && profileData.role === 'admin') {
          throw new Error('Admin login is only possible through the admin panel.');
        }

        localStorage.setItem('demo_session', JSON.stringify({ user: profileData, profile: profileData }));
        onLogin(profileData, profileData);
      } else {
        // simulated Sign Up logic remains
        const q = query(collection(db, 'users'), where('email', '==', email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          throw new Error('This email is already in use. Please use a different email.');
        }

        // Create a new user profile in Firestore
        const newUserId = doc(collection(db, 'users')).id;
        const shortId = Math.floor(100000 + Math.random() * 900000).toString();
        const newProfile = {
          uid: newUserId,
          userId: shortId,
          email: email,
          password: password,
          whatsapp: whatsapp,
          displayName: email.split('@')[0] || 'User',
          photoURL: `https://ui-avatars.com/api/?name=${email.split('@')[0] || 'User'}&background=random`,
          role: 'user',
          balance: 0,
          isPremium: false,
          createdAt: new Date(),
          isVerified: false // New field
        };

        setPendingProfile(newProfile);
        setShowVerification(true);
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Simulated Auth error:', err);
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a202c] flex items-center justify-center p-4 relative">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-[#2d3748] rounded-2xl border border-slate-700 shadow-2xl overflow-hidden"
      >
        <div className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="flex flex-col items-center justify-center mx-auto mb-6">
              <Logo className="w-16 h-16 mb-2" />
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black tracking-tight text-white leading-none mt-1">ALL SERVICES</span>
                <span className="text-xs font-bold tracking-widest text-slate-400 uppercase mt-1">PLATFORM</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {isAdminRoute ? 'Admin Panel' : (isLogin ? 'Welcome' : 'Create Account')}
            </h1>
            <p className="text-sm text-slate-400">
              {isAdminRoute ? 'Login to Admin Panel' : (isLogin ? 'Login to your account' : 'Provide information to create a new account')}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm text-center">
              {error}
            </div>
          )}

          {showVerification ? (
            <div className="space-y-6 text-center">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-xl text-emerald-500">
                <p className="font-bold">A few more steps left!</p>
                <p className="text-sm mt-1">Please verify your WhatsApp number to activate your account.</p>
              </div>
              <a
                href={`https://wa.me/8801811152997?text=${encodeURIComponent(`Hello, I want to activate my account. My email: ${pendingProfile.email}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={async () => {
                  await setDoc(doc(db, 'users', pendingProfile.uid), pendingProfile);
                  alert('Verification message sent. Admin will activate your account soon.');
                  setIsLogin(true);
                  setShowVerification(false);
                }}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/25 block text-center"
              >
                Verify via WhatsApp
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* ... existing form fields ... */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">{isAdminRoute ? 'Email' : 'Email Address'}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    type="email"
                    value={email || ''}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#1a202c] border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder={isAdminRoute ? "secure.node.admin@gmail.com" : "you@example.com"}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">{isAdminRoute ? 'Password' : 'Password'}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password || ''}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#1a202c] border border-slate-700 rounded-xl pl-10 pr-12 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {!isLogin && !isAdminRoute && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">WhatsApp Number</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </div>
                    <input
                      type="tel"
                      value={whatsapp || ''}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className="w-full bg-[#1a202c] border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="017XXXXXXXX"
                      required
                    />
                  </div>
                </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className={`w-full py-3.5 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed ${isAdminRoute ? 'bg-[#f43f5e] hover:bg-rose-600 shadow-rose-500/25' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/25'}`}
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
            <div className="text-center pt-2 space-y-4 border-t border-slate-700/50">
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                className="text-sm text-slate-400 hover:text-indigo-400 transition-colors block w-full"
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
