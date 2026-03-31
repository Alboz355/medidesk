import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FileText, Calendar, User, Loader2, Trash2, Mail, Users, ShieldAlert, ChevronDown, ChevronUp, Hash, Stethoscope, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export function Clients({ user }: { user: any }) {
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isAdmin = user?.email === 'leartshabija@gmail.com';

  useEffect(() => {
    if (!isAdmin) return;

    const q = query(
      collection(db, 'certificates'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const certs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCertificates(certs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching all certificates:", error);
      toast.error("Erreur lors du chargement des certificats clients");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'certificates', id));
      toast.success('Certificat supprimé');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const toggleDetails = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <ShieldAlert className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Accès Refusé</h2>
        <p className="text-gray-500 mt-2">Seul l'administrateur peut accéder à cette section.</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight">Clients & Certificats</h2>
        <p className="text-sm sm:text-base text-gray-500 mt-1 sm:mt-2">Vue d'ensemble de tous les certificats générés par tous les utilisateurs.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : certificates.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/40 border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">Aucun certificat trouvé</h3>
          <p className="text-gray-500 mt-1">Aucun utilisateur n'a encore généré de certificat.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {certificates.map((cert) => (
            <div key={cert.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md border border-gray-100 p-4 sm:p-6 transition-all duration-200 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">
                      {cert.patientFirstName} {cert.patientLastName}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        Créé le: {cert.createdAt ? format(cert.createdAt.toDate(), 'dd/MM/yyyy HH:mm', { locale: fr }) : 'Date inconnue'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <User className="w-4 h-4" />
                        Patient: {cert.patientGender === 'né' ? 'Né' : 'Née'} le {format(new Date(cert.patientDob), 'dd/MM/yyyy')}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => toggleDetails(cert.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                  >
                    {expandedId === cert.id ? (
                      <>
                        Masquer détails
                        <ChevronUp className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        Détails
                        <ChevronDown className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  
                  {deleteConfirmId === cert.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(cert.id)}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors"
                      >
                        Confirmer
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(cert.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded Details Section */}
              {expandedId === cert.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  {/* Patient Info */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-500" />
                      Informations Patient
                    </h5>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Nom complet:</span>
                        <span className="font-medium text-gray-900">{cert.patientFirstName} {cert.patientLastName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Date de naissance:</span>
                        <span className="font-medium text-gray-900">{format(new Date(cert.patientDob), 'dd/MM/yyyy')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Genre:</span>
                        <span className="font-medium text-gray-900 capitalize">{cert.patientGender}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Numéro EDS:</span>
                        <span className="font-mono bg-white px-2 py-1 rounded border border-gray-200 text-gray-900 flex items-center gap-1">
                          <Hash className="w-3 h-3 text-gray-400" />
                          {cert.eds || 'Non renseigné'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Doctor Info */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-emerald-500" />
                      Informations Médecin
                    </h5>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Nom du médecin:</span>
                        <span className="font-medium text-gray-900">{cert.doctorTitle} {cert.doctorName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Spécialité:</span>
                        <span className="font-medium text-gray-900">{cert.doctorRole}</span>
                      </div>
                    </div>
                  </div>

                  {/* Certificate Dates */}
                  <div className="space-y-3 md:col-span-2">
                    <h5 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-purple-500" />
                      Période du certificat
                    </h5>
                    <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="block text-gray-500 mb-1">Date de début:</span>
                        <span className="font-medium text-gray-900">{format(new Date(cert.startDate), 'dd/MM/yyyy')}</span>
                      </div>
                      <div>
                        <span className="block text-gray-500 mb-1">Date de fin:</span>
                        <span className="font-medium text-gray-900">{format(new Date(cert.endDate), 'dd/MM/yyyy')}</span>
                      </div>
                      <div>
                        <span className="block text-gray-500 mb-1">Fait le:</span>
                        <span className="font-medium text-gray-900">{format(new Date(cert.certificateDate), 'dd/MM/yyyy')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="md:col-span-2 flex items-center justify-between text-xs text-gray-400 pt-2">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      ID Utilisateur (Créateur): <span className="font-mono">{cert.uid}</span>
                    </span>
                    <span>ID Certificat: <span className="font-mono">{cert.id}</span></span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
