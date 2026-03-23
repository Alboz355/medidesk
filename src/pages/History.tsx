import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { jsPDF } from 'jspdf';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FileText, Download, Calendar, User } from 'lucide-react';
import { toast } from 'sonner';

export function History({ user }: { user: any }) {
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateBase64, setTemplateBase64] = useState<string | null>(null);

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'templates', 'default'));
        if (docSnap.exists()) {
          setTemplateBase64(docSnap.data().data);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération du modèle:", error);
      }
    };
    fetchTemplate();
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

  const generateDocument = (data: any) => {
    const doctorName = data.doctorName || user?.displayName || 'Docteur';
    const dateJour = data.createdAt ? format(data.createdAt.toDate(), 'dd.MM.yy') : format(new Date(), 'dd.MM.yy');
    const ddn = format(new Date(data.patientDob), 'dd.MM.yy');
    const duree1 = format(new Date(data.startDate), 'dd.MM.yy');
    const duree2 = format(new Date(data.endDate), 'dd.MM.yy');

    if (templateBase64) {
      try {
        const binaryString = window.atob(templateBase64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        const zip = new PizZip(bytes.buffer);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });

        doc.render({
            PRENOM: data.patientFirstName,
            NOM: data.patientLastName,
            DDN: ddn,
            EDS: data.eds,
            DATE_JOUR: dateJour,
            DUREE1: duree1,
            DUREE2: duree2,
            DOCTEUR: doctorName
        });

        const out = doc.getZip().generate({
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
        saveAs(out, `Certificat_${data.patientLastName}_${format(new Date(), 'yyyyMMdd')}.docx`);
        return;
      } catch (error) {
        console.error("Erreur avec le modèle Word:", error);
        toast.error("Erreur avec le modèle Word. Génération du PDF par défaut.");
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
            <div key={cert.id} className="bg-white rounded-2xl shadow-sm hover:shadow-xl hover:shadow-gray-200/40 border border-gray-100 p-6 transition-all duration-200 flex items-center justify-between group">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <h4 className="text-lg font-medium text-gray-900">
                    {cert.patientFirstName} {cert.patientLastName}
                  </h4>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {cert.createdAt ? format(cert.createdAt.toDate(), 'dd/MM/yyyy', { locale: fr }) : 'Date inconnue'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <User className="w-4 h-4" />
                      Né(e) le {format(new Date(cert.patientDob), 'dd/MM/yyyy')}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => generateDocument(cert)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-900 text-gray-700 hover:text-white rounded-lg font-medium transition-colors duration-200"
              >
                <Download className="w-4 h-4" />
                Ouvrir
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
