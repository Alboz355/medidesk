import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { collection, addDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';
import { FileText, Loader2, Download } from 'lucide-react';
import { cn } from '../lib/utils';
import { generateAndDownloadPDF, generateAndDownloadDOCX } from '../lib/pdfGenerator';

const schema = z.object({
  doctorName: z.string().min(1, 'Le nom du médecin est requis').max(100),
  patientFirstName: z.string().min(1, 'Le prénom est requis').max(100),
  patientLastName: z.string().min(1, 'Le nom est requis').max(100),
  patientDob: z.string().min(1, 'La date de naissance est requise'),
  eds: z.string().min(1, 'Le N° EDS est requis').max(50),
  startDate: z.string().min(1, 'La date de début est requise'),
  endDate: z.string().min(1, 'La date de fin est requise'),
  certificateDate: z.string().min(1, 'La date du certificat est requise'),
});

type FormData = z.infer<typeof schema>;

export function CertificateForm({ user, initialData, onClearEdit }: { user: any, initialData?: any, onClearEdit?: () => void }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [submitFormat, setSubmitFormat] = useState<'pdf' | 'docx' | null>(null);
  const [templateBase64, setTemplateBase64] = useState<string | null>(null);
  const [convertApiKey, setConvertApiKey] = useState<string | null>(null);

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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      doctorName: user?.displayName || '',
      certificateDate: format(new Date(), 'yyyy-MM-dd'),
    }
  });

  useEffect(() => {
    if (initialData) {
      reset({
        doctorName: initialData.doctorName || user?.displayName || '',
        patientFirstName: initialData.patientFirstName || '',
        patientLastName: initialData.patientLastName || '',
        patientDob: initialData.patientDob || '',
        eds: initialData.eds || '',
        startDate: initialData.startDate || '',
        endDate: initialData.endDate || '',
        certificateDate: initialData.certificateDate || format(new Date(), 'yyyy-MM-dd'),
      });
    }
  }, [initialData, reset, user]);

  const generateDocument = async (data: FormData, formatType: 'pdf' | 'docx') => {
    const dateJour = format(new Date(data.certificateDate), 'dd.MM.yyyy');
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
            DOCTEUR: data.doctorName
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
        toast.error(`Erreur lors de la génération du ${formatType.toUpperCase()}.`);
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
    doc.text(`Docteur ${data.doctorName} Médecin interne`, 120, 140);
    
    // Save
    doc.save(`Certificat_${data.patientLastName}_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  const onSubmit = async (data: FormData, formatType: 'pdf' | 'docx') => {
    setIsGenerating(true);
    setSubmitFormat(formatType);
    try {
      // Save to Firestore
      await addDoc(collection(db, 'certificates'), {
        uid: user.uid,
        doctorName: data.doctorName,
        patientFirstName: data.patientFirstName,
        patientLastName: data.patientLastName,
        patientDob: data.patientDob,
        eds: data.eds,
        startDate: data.startDate,
        endDate: data.endDate,
        certificateDate: data.certificateDate,
        createdAt: serverTimestamp(),
      });

      // Generate Document
      await generateDocument(data, formatType);
      
      toast.success('Certificat généré et sauvegardé avec succès');
      reset({ ...data, patientFirstName: '', patientLastName: '', patientDob: '', eds: '', startDate: '', endDate: '', certificateDate: format(new Date(), 'yyyy-MM-dd') });
      if (onClearEdit) onClearEdit();
    } catch (error) {
      console.error('Error generating certificate:', error);
      toast.error('Erreur lors de la génération du certificat');
    } finally {
      setIsGenerating(false);
      setSubmitFormat(null);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-semibold text-gray-900 tracking-tight">
            {initialData ? 'Modifier le Certificat' : 'Nouveau Certificat'}
          </h2>
          <p className="text-gray-500 mt-2">
            {initialData ? 'Modifiez les informations avant de générer à nouveau le certificat.' : 'Générez un certificat d\'absence scolaire au format PDF ou Word.'}
          </p>
        </div>
        {initialData && (
          <button
            onClick={() => {
              if (onClearEdit) onClearEdit();
              reset({
                doctorName: user?.displayName || '',
                patientFirstName: '',
                patientLastName: '',
                patientDob: '',
                eds: '',
                startDate: '',
                endDate: '',
                certificateDate: format(new Date(), 'yyyy-MM-dd'),
              });
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Annuler
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/40 border border-gray-100 p-5 sm:p-8 max-w-2xl">
        <form className="space-y-6">
          
          <div className="pb-6 border-b border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Médecin signataire</label>
                <input
                  {...register('doctorName')}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl border bg-gray-50/50 focus:bg-white transition-all duration-200 outline-none focus:ring-2 focus:ring-gray-900/10",
                    errors.doctorName ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-gray-900"
                  )}
                  placeholder="Dr. Dupont"
                />
                {errors.doctorName && <p className="text-xs text-red-500">{errors.doctorName.message}</p>}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Date du certificat</label>
                <input
                  type="date"
                  {...register('certificateDate')}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl border bg-gray-50/50 focus:bg-white transition-all duration-200 outline-none focus:ring-2 focus:ring-gray-900/10",
                    errors.certificateDate ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-gray-900"
                  )}
                />
                {errors.certificateDate && <p className="text-xs text-red-500">{errors.certificateDate.message}</p>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Prénom du patient</label>
              <input
                {...register('patientFirstName')}
                className={cn(
                  "w-full px-4 py-3 rounded-xl border bg-gray-50/50 focus:bg-white transition-all duration-200 outline-none focus:ring-2 focus:ring-gray-900/10",
                  errors.patientFirstName ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-gray-900"
                )}
                placeholder="Jean"
              />
              {errors.patientFirstName && <p className="text-xs text-red-500">{errors.patientFirstName.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Nom du patient</label>
              <input
                {...register('patientLastName')}
                className={cn(
                  "w-full px-4 py-3 rounded-xl border bg-gray-50/50 focus:bg-white transition-all duration-200 outline-none focus:ring-2 focus:ring-gray-900/10",
                  errors.patientLastName ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-gray-900"
                )}
                placeholder="Dupont"
              />
              {errors.patientLastName && <p className="text-xs text-red-500">{errors.patientLastName.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Date de naissance</label>
              <input
                type="date"
                {...register('patientDob')}
                className={cn(
                  "w-full px-4 py-3 rounded-xl border bg-gray-50/50 focus:bg-white transition-all duration-200 outline-none focus:ring-2 focus:ring-gray-900/10",
                  errors.patientDob ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-gray-900"
                )}
              />
              {errors.patientDob && <p className="text-xs text-red-500">{errors.patientDob.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">N° EDS</label>
              <input
                {...register('eds')}
                className={cn(
                  "w-full px-4 py-3 rounded-xl border bg-gray-50/50 focus:bg-white transition-all duration-200 outline-none focus:ring-2 focus:ring-gray-900/10",
                  errors.eds ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-gray-900"
                )}
                placeholder="12345678"
              />
              {errors.eds && <p className="text-xs text-red-500">{errors.eds.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Date de début d'absence</label>
              <input
                type="date"
                {...register('startDate')}
                className={cn(
                  "w-full px-4 py-3 rounded-xl border bg-gray-50/50 focus:bg-white transition-all duration-200 outline-none focus:ring-2 focus:ring-gray-900/10",
                  errors.startDate ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-gray-900"
                )}
              />
              {errors.startDate && <p className="text-xs text-red-500">{errors.startDate.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Date de fin d'absence</label>
              <input
                type="date"
                {...register('endDate')}
                className={cn(
                  "w-full px-4 py-3 rounded-xl border bg-gray-50/50 focus:bg-white transition-all duration-200 outline-none focus:ring-2 focus:ring-gray-900/10",
                  errors.endDate ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-gray-900"
                )}
              />
              {errors.endDate && <p className="text-xs text-red-500">{errors.endDate.message}</p>}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={handleSubmit((data) => onSubmit(data, 'docx'))}
              disabled={isGenerating}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-900 hover:text-gray-900 rounded-xl font-medium transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isGenerating && submitFormat === 'docx' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
              Télécharger Word
            </button>
            <button
              type="button"
              onClick={handleSubmit((data) => onSubmit(data, 'pdf'))}
              disabled={isGenerating}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-gray-900 text-white hover:bg-gray-800 rounded-xl font-medium transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-gray-900/20"
            >
              {isGenerating && submitFormat === 'pdf' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              Télécharger PDF
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
