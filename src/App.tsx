import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from './firebase';
import { Sidebar } from './components/Sidebar';
import { CertificateForm } from './pages/CertificateForm';
import { History } from './pages/History';
import { Settings } from './pages/Settings';
import { Admin } from './pages/Admin';
import { Tutorial } from './components/Tutorial';
import { Toaster } from 'sonner';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('certificate');
  const [editData, setEditData] = useState<any>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (!userDoc.exists() || !userDoc.data().hasSeenTutorial) {
            setShowTutorial(true);
          }
        } catch (error) {
          console.error("Error checking tutorial status:", error);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleTutorialComplete = async () => {
    setShowTutorial(false);
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          hasSeenTutorial: true,
          role: user.email === 'leartshabija@gmail.com' ? 'admin' : 'client'
        }, { merge: true });
      } catch (error) {
        console.error("Error saving tutorial state:", error);
      }
    }
  };

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-6 sm:p-8 text-center">
          <div className="w-16 h-16 bg-gray-900 rounded-2xl mx-auto flex items-center justify-center mb-6">
            <span className="text-white text-2xl font-semibold">M</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">MediDesk Pro</h1>
          <p className="text-gray-500 mb-8">Connectez-vous pour accéder à votre espace médical sécurisé.</p>
          <button
            onClick={handleLogin}
            className="w-full bg-gray-900 text-white py-3 px-4 rounded-xl font-medium hover:bg-gray-800 transition-all duration-200 shadow-md shadow-gray-900/10 flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continuer avec Google
          </button>
        </div>
      </div>
    );
  }

  const isAdmin = user.email === 'leartshabija@gmail.com';

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <Toaster position="top-right" />
      {showTutorial && <Tutorial onComplete={handleTutorialComplete} />}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        userPhoto={user?.photoURL}
        userName={user?.displayName}
        isAdmin={isAdmin}
      />
      <main className="flex-1 overflow-y-auto pb-20 pt-16 md:pb-0 md:pt-0">
        <div className="max-w-5xl mx-auto p-4 md:p-8">
          {activeTab === 'certificate' && <CertificateForm user={user} editData={editData} onClearEdit={() => setEditData(null)} />}
          {activeTab === 'history' && <History user={user} onEdit={(data) => { setEditData(data); setActiveTab('certificate'); }} />}
          {activeTab === 'settings' && <Settings user={user} />}
          {activeTab === 'admin' && isAdmin && <Admin user={user} />}
        </div>
      </main>
    </div>
  );
}
