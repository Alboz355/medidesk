import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, X, Loader2 } from 'lucide-react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';

interface PasswordPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PasswordPrompt({ isOpen, onClose, onSuccess }: PasswordPromptProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Veuillez entrer un mot de passe');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const pwdRef = doc(db, 'passwords', password.trim().toUpperCase());
      const pwdSnap = await getDoc(pwdRef);

      if (pwdSnap.exists() && pwdSnap.data().status === 'active') {
        // Mark as used
        await updateDoc(pwdRef, {
          status: 'used',
          usedAt: serverTimestamp(),
          usedBy: auth.currentUser?.uid || 'unknown'
        });
        
        setPassword('');
        onSuccess();
        onClose();
      } else {
        setError('Mot de passe invalide, expiré ou déjà utilisé');
      }
    } catch (err) {
      console.error("Erreur lors de la vérification:", err);
      setError('Erreur lors de la vérification du mot de passe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-gray-900">
                  <Lock className="w-5 h-5" />
                  <h3 className="font-semibold text-lg">Accès restreint</h3>
                </div>
                <button onClick={onClose} disabled={loading} className="text-gray-400 hover:text-gray-600 disabled:opacity-50">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Veuillez entrer un mot de passe à usage unique (fourni par l'administrateur) pour générer ce certificat.
              </p>
              <form onSubmit={handleSubmit}>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ex: A8F9B2"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all mb-2 uppercase"
                  autoFocus
                  disabled={loading}
                />
                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                <div className="flex gap-2 mt-6">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-70"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Valider'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
