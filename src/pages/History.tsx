import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot, getDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FileText, Download, Calendar, User, Loader2, Pencil, Trash2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { generateAndDownloadPDF, generateAndDownloadDOCX, generatePDFBlob } from '../lib/pdfGenerator';
import { PasswordPrompt } from '../components/PasswordPrompt';
import { SendEmailModal } from '../components/SendEmailModal';

export function History({ user, onEdit }: { user: any, onEdit: (data: any) => void }) {
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateBase64, setTemplateBase64] = useState<string | null>(null);
  const [convertApiKey, setConvertApiKey] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generatingFormat, setGeneratingFormat] = useState<'pdf' | 'docx' | 'email' | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{cert: any, format: 'pdf' | 'docx' | 'email'} | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'templates', 'default'));
        if (docSnap.exists()) {
          setTemplateBase64(docSnap.data().data);
        }
        
        const apiSnap = await getDoc(doc(db, 'settings', 'api'));
        if (apiSnap.exists() && apiSnap.data().convertApiKey) {
          setConvertApiKey(apiSnap.data().convertApiKey);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des paramètres:", error);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'certificates'),
      where('uid', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const certs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a: any, b: any) => {
        // Sort in memory instead of requiring a composite index
        const dateA = a.createdAt?.toMillis() || 0;
        const dateB = b.createdAt?.toMillis() || 0;
        return dateB - dateA;
      });
      setCertificates(certs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching history:", error);
      toast.error("Erreur lors du chargement de l'historique");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleGenerateClick = (cert: any, formatType: 'pdf' | 'docx' | 'email') => {
    setPendingAction({ cert, format: formatType });
    setShowPassword(true);
  };

  const handleSendEmail = async (email: string) => {
    if (!pendingAction || !templateBase64) return;
    const { cert: data } = pendingAction;
    
    try {
      const doctorName = data.doctorName || user?.displayName || 'Docteur';
      const dateJour = data.certificateDate 
        ? format(new Date(data.certificateDate), 'dd.MM.yyyy') 
        : data.createdAt 
          ? format(data.createdAt.toDate(), 'dd.MM.yyyy') 
          : format(new Date(), 'dd.MM.yyyy');
      const ddn = format(new Date(data.patientDob), 'dd.MM.yyyy');
      const duree1 = format(new Date(data.startDate), 'dd.MM.yyyy');
      const duree2 = format(new Date(data.endDate), 'dd.MM.yyyy');

      const templateData = {
        PRENOM: data.patientFirstName,
        NOM: data.patientLastName,
        DDN: ddn,
        EDS: data.eds,
        DATE_JOUR: dateJour,
        DATE_DU_JOUR: dateJour,
        DUREE1: duree1,
        DUREE2: duree2,
        DOCTEUR: doctorName,
        hof: data.doctorTitle || 'Docteur',
        "i/a": data.doctorRole || 'interne',
        "né": data.patientGender || 'né'
      };

      const pdfBlob = await generatePDFBlob(templateBase64, templateData, convertApiKey);
      
      const reader = new FileReader();
      reader.readAsDataURL(pdfBlob);
      await new Promise((resolve) => {
        reader.onloadend = resolve;
      });
      const base64Content = (reader.result as string).split(',')[1];

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          subject: `Certificat Médical - ${data.patientFirstName} ${data.patientLastName}`,
          html: `
            <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
              <h2>Bonjour,</h2>
              <p>Veuillez trouver ci-joint le certificat médical de <strong>${data.patientFirstName} ${data.patientLastName}</strong>.</p>
              <p>Cordialement,<br/>${data.doctorTitle || 'Docteur'} ${doctorName}</p>
            </div>
          `,
          attachments: [
            {
              filename: `Certificat_${data.patientLastName}.pdf`,
              content: base64Content,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || 'Failed to send email');
      }

      toast.success('Email envoyé avec succès au patient');
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Erreur lors de l\'envoi de l\'email');
      throw error;
    }
  };

  const executeGeneration = async () => {
    if (!pendingAction) return;
    const { cert: data, format: formatType } = pendingAction;
    
    if (formatType === 'email') {
      setShowEmailModal(true);
      return;
    }

    setGeneratingId(data.id);
    setGeneratingFormat(formatType);
    try {
      const doctorName = data.doctorName || user?.displayName || 'Docteur';
      const dateJour = data.certificateDate 
        ? format(new Date(data.certificateDate), 'dd.MM.yyyy') 
        : data.createdAt 
          ? format(data.createdAt.toDate(), 'dd.MM.yyyy') 
          : format(new Date(), 'dd.MM.yyyy');
      const ddn = format(new Date(data.patientDob), 'dd.MM.yyyy');
      const duree1 = format(new Date(data.startDate), 'dd.MM.yyyy');
      const duree2 = format(new Date(data.endDate), 'dd.MM.yyyy');

      if (templateBase64) {
        try {
          const templateData = {
              PRENOM: data.patientFirstName,
              NOM: data.patientLastName,
              DDN: ddn,
              EDS: data.eds,
              DATE_JOUR: dateJour,
              DATE_DU_JOUR: dateJour,
              DUREE1: duree1,
              DUREE2: duree2,
              DOCTEUR: doctorName,
              hof: data.doctorTitle || 'Docteur',
              "i/a": data.doctorRole || 'interne',
              "né": data.patientGender || 'né'
          };

          const fileName = `Certificat_${data.patientLastName}_${format(new Date(), 'yyyyMMdd')}.${formatType}`;
          if (formatType === 'pdf') {
            await generateAndDownloadPDF(templateBase64, templateData, fileName, convertApiKey);
          } else {
            await generateAndDownloadDOCX(templateBase64, templateData, fileName);
          }
          return;
        } catch (error) {
          console.error(`Erreur avec le modèle ${formatType}:`, error);
          toast.error(`Erreur avec le modèle. Génération du PDF par défaut.`);
        }
      }

      // Fallback to jsPDF
      const doc = new jsPDF();

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);

    // Header info
    doc.text(`Concerne : ${data.patientFirstName} ${data.patientLastName}, ${data.patientGender || 'né'} le ${ddn}`, 20, 40);
    doc.text(`N° EDS : ${data.eds}`, 20, 50);
    
    // Date
    doc.text(`Genève, le ${dateJour}`, 140, 60);

    // Body
    doc.text(`Le médecin soussigné certifie que ${data.patientFirstName} ${data.patientLastName}`, 20, 90);
    doc.text(`Ne pourra pas fréquenter l'école du ${duree1} au ${duree2}`, 20, 100);

    // Footer
    doc.text(`${data.doctorTitle || 'Docteur'} ${doctorName}`, 120, 140);
    doc.text(`Médecin ${data.doctorRole || 'interne'}`, 120, 148);
    
    // Save
    doc.save(`Certificat_${data.patientLastName}_${format(new Date(), 'yyyyMMdd')}.pdf`);
    } finally {
      setGeneratingId(null);
      setGeneratingFormat(null);
      setPendingAction(null);
    }
  };

  const handleEdit = (cert: any) => {
    onEdit(cert);
  };

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

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PasswordPrompt 
        isOpen={showPassword} 
        onClose={() => setShowPassword(false)} 
        onSuccess={executeGeneration} 
      />
      <SendEmailModal
        isOpen={showEmailModal}
        onClose={() => {
          setShowEmailModal(false);
          setPendingAction(null);
        }}
        onSend={handleSendEmail}
        patientName={pendingAction?.cert ? `${pendingAction.cert.patientFirstName} ${pendingAction.cert.patientLastName}` : ''}
      />
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight">Historique</h2>
        <p className="text-sm sm:text-base text-gray-500 mt-1 sm:mt-2">Tous vos certificats générés.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : certificates.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/40 border border-gray-100 p-12 text-center max-w-3xl">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">Aucun certificat</h3>
          <p className="text-gray-500 mt-1">Vous n'avez pas encore généré de certificat.</p>
        </div>
      ) : (
        <div className="grid gap-4 max-w-3xl">
          {certificates.map((cert) => (
            <div key={cert.id} className="bg-white rounded-2xl shadow-sm hover:shadow-xl hover:shadow-gray-200/40 border border-gray-100 p-4 sm:p-6 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
                </div>
                <div>
                  <h4 className="text-base sm:text-lg font-medium text-gray-900">
                    {cert.patientFirstName} {cert.patientLastName}
                  </h4>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1 sm:mt-2 text-xs sm:text-sm text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      {cert.createdAt ? format(cert.createdAt.toDate(), 'dd/MM/yyyy', { locale: fr }) : 'Date inconnue'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Né(e) le {format(new Date(cert.patientDob), 'dd/MM/yyyy')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mt-3 sm:mt-0">
                <button
                  onClick={() => handleEdit(cert)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-200 hover:border-blue-600 text-gray-700 hover:text-blue-600 rounded-lg font-medium transition-colors duration-200 text-sm"
                  title="Modifier"
                >
                  <Pencil className="w-4 h-4" />
                  Modifier
                </button>
                <button
                  onClick={() => handleGenerateClick(cert, 'docx')}
                  disabled={generatingId === cert.id}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-200 hover:border-gray-900 text-gray-700 hover:text-gray-900 rounded-lg font-medium transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed text-sm"
                >
                  {generatingId === cert.id && generatingFormat === 'docx' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  Word
                </button>
                <button
                  onClick={() => handleGenerateClick(cert, 'pdf')}
                  disabled={generatingId === cert.id}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-200 hover:border-gray-900 text-gray-700 hover:text-gray-900 rounded-lg font-medium transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed text-sm"
                >
                  {generatingId === cert.id && generatingFormat === 'pdf' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  PDF
                </button>
                <button
                  onClick={() => handleGenerateClick(cert, 'email')}
                  disabled={generatingId === cert.id}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-900 text-gray-700 hover:text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed text-sm"
                >
                  <Mail className="w-4 h-4" />
                  Email
                </button>
                {deleteConfirmId === cert.id ? (
                  <div className="flex items-center gap-2 flex-1 sm:flex-none">
                    <button
                      onClick={() => handleDelete(cert.id)}
                      className="flex-1 sm:flex-none flex items-center justify-center px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200 text-sm"
                    >
                      Confirmer
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="flex-1 sm:flex-none flex items-center justify-center px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200 text-sm"
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirmId(cert.id)}
                    className="flex-1 sm:flex-none flex items-center justify-center p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
