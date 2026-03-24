import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Shield, Key, Trash2, CheckCircle2, XCircle, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '../lib/utils';

export function Admin({ user }: { user: any }) {
  const [passwords, setPasswords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (user?.email !== 'leartshabija@gmail.com') return;

    const q = query(
      collection(db, 'passwords'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pwds = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPasswords(pwds);
      setLoading(false);
    }, (error) => {
      console.error("Erreur lors du chargement des mots de passe:", error);
      toast.error("Erreur lors du chargement des mots de passe");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const generatePassword = async () => {
    setGenerating(true);
    try {
      // Generate a random 8-character alphanumeric code
      const code = Math.random().toString(36).slice(-8).toUpperCase();
      
      await setDoc(doc(db, 'passwords', code), {
        status: 'active',
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });
      
      toast.success('Nouveau mot de passe généré avec succès');
    } catch (error) {
      console.error("Erreur lors de la génération:", error);
      toast.error('Erreur lors de la génération du mot de passe');
    } finally {
      setGenerating(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'revoked' : 'active';
      await updateDoc(doc(db, 'passwords', id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      toast.success(`Mot de passe ${newStatus === 'active' ? 'réactivé' : 'révoqué'}`);
    } catch (error) {
      console.error("Erreur lors de la modification du statut:", error);
      toast.error('Erreur lors de la modification du statut');
    }
  };

  const deletePassword = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce mot de passe ?')) return;
    
    try {
      await deleteDoc(doc(db, 'passwords', id));
      toast.success('Mot de passe supprimé');
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast.error('Erreur lors de la suppression');
    }
  };

  if (user?.email !== 'leartshabija@gmail.com') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Shield className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Accès Refusé</h2>
        <p className="text-gray-500 mt-2">Vous n'avez pas les droits d'administrateur pour voir cette page.</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight">Administration</h2>
          <p className="text-sm sm:text-base text-gray-500 mt-1 sm:mt-2">Gérez les mots de passe de génération de certificats.</p>
        </div>
        <button
          onClick={generatePassword}
          disabled={generating}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all shadow-sm disabled:opacity-70"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
          Générer un mot de passe
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/40 border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : passwords.length === 0 ? (
          <div className="p-12 text-center">
            <Key className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Aucun mot de passe</h3>
            <p className="text-gray-500 mt-1">Générez un mot de passe pour commencer.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Mot de passe</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Créé le</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Utilisé le</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {passwords.map((pwd) => (
                  <tr key={pwd.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="px-2 py-1 bg-gray-100 text-gray-800 rounded font-mono text-sm font-bold tracking-wider">
                        {pwd.id}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                        pwd.status === 'active' ? "bg-green-100 text-green-700" :
                        pwd.status === 'used' ? "bg-gray-100 text-gray-700" :
                        "bg-red-100 text-red-700"
                      )}>
                        {pwd.status === 'active' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {pwd.status === 'used' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {pwd.status === 'revoked' && <XCircle className="w-3.5 h-3.5" />}
                        {pwd.status === 'active' ? 'Disponible' : pwd.status === 'used' ? 'Utilisé' : 'Révoqué'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {pwd.createdAt ? format(pwd.createdAt.toDate(), 'dd/MM/yyyy HH:mm', { locale: fr }) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {pwd.usedAt ? format(pwd.usedAt.toDate(), 'dd/MM/yyyy HH:mm', { locale: fr }) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleStatus(pwd.id, pwd.status)}
                          className={cn(
                            "p-2 rounded-lg transition-colors",
                            pwd.status === 'active' 
                              ? "text-amber-600 hover:bg-amber-50" 
                              : "text-green-600 hover:bg-green-50"
                          )}
                          title={pwd.status === 'active' ? "Révoquer" : "Réactiver"}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deletePassword(pwd.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
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
        )}
      </div>
    </div>
  );
}
