import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { jsPDF } from 'jspdf';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FileText, Download, Calendar, User, Loader2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { generateAndDownloadPDF, generateAndDownloadDOCX } from '../lib/pdfGenerator';
import { motion } from 'motion/react';

export function History({ user, onEditCertificate }: { user: any, onEditCertificate: (cert: any) => void }) {
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateBase64, setTemplateBase64] = useState<string | null>(null);
  const [convertApiKey, setConvertApiKey] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generatingFormat, setGeneratingFormat] = useState<'pdf' | 'docx' | null>(null);

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
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const certs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCertificates(certs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching history:", error);
      toast.error("Erreur lors du chargement de l'historique");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const generateDocument = async (data: any, formatType: 'pdf' | 'docx') => {
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
              DOCTEUR: doctorName
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
    doc.text(`${data.patientFirstName} ${data.patientLastName}, né le ${ddn}`, 20, 40);
    doc.text(`N° EDS : ${data.eds}`, 20, 50);
    
    // Date
    doc.text(`Genève, le ${dateJour}`, 140, 60);

    // Body
    doc.text(`Le médecin soussigné certifie que ${data.patientFirstName} ${data.patientLastName}`, 20, 90);
    doc.text(`Ne pourra pas fréquenter l'école du ${duree1} au ${duree2}`, 20, 100);

    // Footer
    doc.text(`Docteur ${doctorName} Médecin interne`, 120, 140);
    
    // Save
    doc.save(`Certificat_${data.patientLastName}_${format(new Date(), 'yyyyMMdd')}.pdf`);
    } finally {
      setGeneratingId(null);
      setGeneratingFormat(null);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h2 className="text-3xl font-semibold text-gray-900 tracking-tight">Historique</h2>
        <p className="text-gray-500 mt-2">Vos 5 derniers certificats générés.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : certificates.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl shadow-gray-200/40 border border-gray-100 p-12 text-center max-w-3xl"
        >
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">Aucun certificat</h3>
          <p className="text-gray-500 mt-1">Vous n'avez pas encore généré de certificat.</p>
        </motion.div>
      ) : (
        <div className="grid gap-4 max-w-3xl">
          {certificates.map((cert, index) => (
            <motion.div
              key={cert.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl shadow-sm hover:shadow-xl hover:shadow-gray-200/40 border border-gray-100 p-4 sm:p-6 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
            >
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
                  onClick={() => onEditCertificate(cert)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-200 hover:border-gray-900 text-gray-700 hover:text-gray-900 rounded-lg font-medium transition-colors duration-200 text-sm"
                  title="Modifier"
                >
                  <Edit2 className="w-4 h-4" />
                  <span className="sm:hidden">Modifier</span>
                </button>
                <button
                  onClick={() => generateDocument(cert, 'docx')}
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
                  onClick={() => generateDocument(cert, 'pdf')}
                  disabled={generatingId === cert.id}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-900 text-gray-700 hover:text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed text-sm"
                >
                  {generatingId === cert.id && generatingFormat === 'pdf' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  PDF
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
