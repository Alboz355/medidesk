import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { Sidebar } from './components/Sidebar';
import { CertificateForm } from './pages/CertificateForm';
import { History } from './pages/History';
import { Settings } from './pages/Settings';
import { Toaster } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, ShieldCheck, Zap } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('certificate');
  const [editingCertificate, setEditingCertificate] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login failed', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4 overflow-hidden relative">
        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
           <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
           <div className="absolute top-0 -right-40 w-96 h-96 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
           <div className="absolute -bottom-40 left-20 w-96 h-96 bg-pink-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-4xl w-full z-10"
        >
          <div className="text-center mb-12">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="w-20 h-20 bg-gray-900 rounded-3xl mx-auto flex items-center justify-center mb-8 shadow-2xl shadow-gray-900/20"
            >
              <Activity className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">Bienvenue sur MediDesk Pro</h1>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">La solution de gestion de certificats médicaux intelligente, sécurisée et centralisée pour votre cabinet.</p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8 sm:p-12 text-center max-w-md mx-auto relative overflow-hidden">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Accès Sécurisé</h2>
            <p className="text-gray-500 mb-8">Connectez-vous pour accéder à votre espace médical.</p>
            <button
              onClick={handleLogin}
              className="w-full bg-gray-900 text-white py-3.5 px-4 rounded-xl font-medium hover:bg-gray-800 transition-all duration-200 shadow-md hover:shadow-lg hover:shadow-gray-900/20 flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continuer avec Google
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 text-center max-w-4xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-100">
              <Zap className="w-8 h-8 text-blue-500 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900">Génération Rapide</h3>
              <p className="text-sm text-gray-500 mt-2">Générez des certificats en quelques clics aux formats Word ou PDF.</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-100">
              <ShieldCheck className="w-8 h-8 text-green-500 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900">100% Sécurisé</h3>
              <p className="text-sm text-gray-500 mt-2">Vos données et celles de vos patients sont protégées et cryptées.</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-100">
              <Activity className="w-8 h-8 text-purple-500 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900">Modèles Unifiés</h3>
              <p className="text-sm text-gray-500 mt-2">Un seul modèle de base pour tout le cabinet, simple à mettre à jour.</p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <Toaster position="top-right" />
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        userPhoto={user?.photoURL}
        userName={user?.displayName}
      />
      <main className="flex-1 overflow-y-auto pb-20 pt-16 md:pb-0 md:pt-0 bg-gray-50/50">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="max-w-5xl mx-auto p-4 md:p-8 min-h-full"
          >
            {activeTab === 'certificate' && <CertificateForm user={user} initialData={editingCertificate} onClearEdit={() => setEditingCertificate(null)} />}
            {activeTab === 'history' && <History user={user} onEditCertificate={(cert) => {
              setEditingCertificate(cert);
              setActiveTab('certificate');
            }} />}
            {activeTab === 'settings' && <Settings user={user} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
