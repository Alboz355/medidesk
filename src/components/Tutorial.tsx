import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, FileText, Settings, Clock, ArrowRight, Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface TutorialProps {
  onComplete: () => void;
}

const steps = [
  {
    id: 'welcome',
    title: 'Bienvenue sur MediDesk Pro !',
    description: "L'application qui simplifie et accélère la création de vos certificats médicaux d'absence scolaire.",
    icon: Sparkles,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    id: 'create',
    title: 'Génération rapide',
    description: "Remplissez les informations du patient et générez vos certificats en un clic, au format PDF ou Word.",
    icon: FileText,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
  },
  {
    id: 'settings',
    title: 'Gagnez du temps',
    description: "Enregistrez vos informations par défaut (Nom, N° EDS, etc.) dans les paramètres pour qu'elles soient pré-remplies à chaque fois.",
    icon: Settings,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  {
    id: 'history',
    title: 'Historique illimité',
    description: "Retrouvez, modifiez et téléchargez tous vos anciens certificats à tout moment depuis l'onglet Historique.",
    icon: Clock,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  }
];

export function Tutorial({ onComplete }: TutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const CurrentIcon = steps[currentStep].icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-900/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative flex flex-col max-h-[90vh]"
      >
        <div className="p-6 sm:p-8 overflow-y-auto">
          {/* Progress indicators */}
          <div className="flex gap-2 mb-6 sm:mb-8">
            {steps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-1.5 rounded-full flex-1 transition-all duration-300",
                  index === currentStep ? "bg-gray-900" : index < currentStep ? "bg-gray-300" : "bg-gray-100"
                )}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center text-center"
            >
              <div className={cn("w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mb-5 sm:mb-6", steps[currentStep].bgColor)}>
                <CurrentIcon className={cn("w-8 h-8 sm:w-10 sm:h-10", steps[currentStep].color)} />
              </div>
              
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">
                {steps[currentStep].title}
              </h2>
              
              <p className="text-sm sm:text-base text-gray-500 leading-relaxed">
                {steps[currentStep].description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center mt-auto">
          <button
            onClick={onComplete}
            className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors px-2 sm:px-4 py-2"
          >
            Passer
          </button>
          
          <button
            onClick={handleNext}
            className="flex items-center gap-2 bg-gray-900 text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-medium hover:bg-gray-800 transition-all shadow-md shadow-gray-900/10 text-sm sm:text-base"
          >
            {currentStep === steps.length - 1 ? (
              <>
                Commencer <Check className="w-4 h-4" />
              </>
            ) : (
              <>
                Suivant <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
