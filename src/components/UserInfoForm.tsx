import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User, Check, Hash, ArrowRight, Pencil } from 'lucide-react';
import { cn } from '../lib/utils';

interface UserInfoFormProps {
  user: any;
  onComplete: () => void;
}

export function UserInfoForm({ user, onComplete }: UserInfoFormProps) {
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [eds, setEds] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEdsEditable, setIsEdsEditable] = useState(false);

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !dob) return;
    
    // Generate EDS: 17 + 6 random digits
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    setEds(`17${randomDigits}`);
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eds) return;

    setIsSubmitting(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        defaultInfo: {
          firstName,
          lastName,
          dob,
          eds,
          gender: 'né' // Default
        },
        hasFilledInfoV2: true
      }, { merge: true });

      onComplete();
    } catch (error) {
      console.error("Error saving user info:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-900/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative flex flex-col"
      >
        <div className="p-6 sm:p-8">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <User className="w-8 h-8 text-blue-600" />
                </div>
                
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 text-center">
                  Vos informations
                </h2>
                <p className="text-sm text-gray-500 text-center mb-8">
                  Ces informations seront utilisées pour pré-remplir vos certificats.
                </p>

                <form onSubmit={handleNextStep} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 transition-all outline-none"
                      placeholder="Jean"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 transition-all outline-none"
                      placeholder="Dupont"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date de naissance</label>
                    <input
                      type="date"
                      required
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 transition-all outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-6 flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-3.5 rounded-xl font-medium hover:bg-gray-800 transition-all shadow-md shadow-gray-900/10"
                  >
                    Suivant <ArrowRight className="w-5 h-5" />
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <Hash className="w-8 h-8 text-emerald-600" />
                </div>
                
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 text-center">
                  Numéro EDS
                </h2>
                <p className="text-sm text-gray-500 text-center mb-8">
                  Voici votre numéro EDS personnel généré automatiquement. Vous pouvez le modifier si vous en possédez déjà un.
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Votre N° EDS</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={eds}
                        readOnly={!isEdsEditable}
                        onChange={(e) => setEds(e.target.value)}
                        className={cn(
                          "w-full px-4 py-4 text-center text-xl tracking-widest font-mono rounded-xl border transition-all duration-200 outline-none",
                          !isEdsEditable ? "bg-gray-50 text-gray-700 border-gray-200" : "bg-white border-gray-900 focus:ring-2 focus:ring-gray-900/10 shadow-sm"
                        )}
                      />
                      {!isEdsEditable && (
                        <button
                          type="button"
                          onClick={() => setIsEdsEditable(true)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          title="Modifier"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-3.5 rounded-xl font-medium hover:bg-gray-800 transition-all shadow-md shadow-gray-900/10 disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        Terminer <Check className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
