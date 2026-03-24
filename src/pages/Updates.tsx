import React from 'react';
import { Rocket, FileText, User, Shield, Key, Mail, Globe } from 'lucide-react';
import { motion } from 'motion/react';

const updates = [
  {
    date: '24 Mars 2026',
    title: 'Déploiement & Gmail',
    icon: Globe,
    color: 'bg-blue-500',
    items: [
      'Préparation pour le déploiement sur Vercel et GitHub.',
      'Migration du service d\'envoi d\'emails de Resend vers Gmail (SMTP).',
      'Possibilité d\'envoyer des certificats à n\'importe quelle adresse email sans restriction.',
    ]
  },
  {
    date: '24 Mars 2026',
    title: 'Sécurité & Authentification',
    icon: Key,
    color: 'bg-purple-500',
    items: [
      'Mise en place d\'un système de mot de passe à usage unique (Session).',
      'Suppression du mot de passe unique statique pour plus de sécurité.',
      'Protection des routes critiques (envoi, téléchargement) par authentification.',
    ]
  },
  {
    date: '23 Mars 2026',
    title: 'Informations Personnelles',
    icon: User,
    color: 'bg-green-500',
    items: [
      'Ajout de la gestion des informations du médecin (Titre, Nom, Spécialité).',
      'Sauvegarde automatique des préférences dans les paramètres.',
      'Personnalisation de la signature sur les documents.',
    ]
  },
  {
    date: '23 Mars 2026',
    title: 'Certificats PDF',
    icon: FileText,
    color: 'bg-orange-500',
    items: [
      'Génération automatique de certificats médicaux au format PDF.',
      'Mise en page professionnelle avec en-tête et signature.',
      'Option de téléchargement direct et d\'envoi par email.',
    ]
  },
  {
    date: '23 Mars 2026',
    title: 'Lancement Initial',
    icon: Rocket,
    color: 'bg-gray-900',
    items: [
      'Création de la première version de MediDesk Pro.',
      'Interface de gestion des patients et des consultations.',
      'Système d\'historique des certificats générés.',
    ]
  }
];

export function Updates() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Journal des Mises à jour</h2>
        <p className="text-gray-500 mt-1">Suivez l'évolution de MediDesk Pro et les nouvelles fonctionnalités.</p>
      </div>

      <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
        {updates.map((update, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
          >
            {/* Icon */}
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border border-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${update.color} text-white z-10`}>
              <update.icon className="w-5 h-5" />
            </div>

            {/* Content */}
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-gray-200 transition-colors">
              <div className="flex items-center justify-between space-x-2 mb-1">
                <div className="font-bold text-gray-900">{update.title}</div>
                <time className="font-mono text-xs text-gray-400">{update.date}</time>
              </div>
              <ul className="mt-3 space-y-2">
                {update.items.map((item, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
