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
import { FileText, Loader2, Download, Pencil, User, Mail } from 'lucide-react';
import { cn } from '../lib/utils';
import { generateAndDownloadPDF, generateAndDownloadDOCX, generatePDFBlob } from '../lib/pdfGenerator';
import { PasswordPrompt } from '../components/PasswordPrompt';
import { SendEmailModal } from '../components/SendEmailModal';

const schema = z.object({
  doctorName: z.string().min(1, 'Le nom du médecin est requis').max(100),
  doctorTitle: z.enum(['Docteur', 'Docteure']),
  doctorRole: z.enum(['interne', 'associé']),
  patientFirstName: z.string().min(1, 'Le prénom est requis').max(100),
  patientLastName: z.string().min(1, 'Le nom est requis').max(100),
  patientGender: z.enum(['né', 'née']),
  patientDob: z.string().min(1, 'La date de naissance est requise'),
  eds: z.string().min(1, 'Le N° EDS est requis').max(50),
  startDate: z.string().min(1, 'La date de début est requise'),
  endDate: z.string().min(1, 'La date de fin est requise'),
  certificateDate: z.string().min(1, 'La date du certificat est requise'),
});

type FormData = z.infer<typeof schema>;

export function CertificateForm({ user, editData, onClearEdit }: { user: any, editData?: any, onClearEdit?: () => void }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [submitFormat, setSubmitFormat] = useState<'pdf' | 'docx' | null>(null);
  const [templateBase64, setTemplateBase64] = useState<string | null>(null);
  const [convertApiKey, setConvertApiKey] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [pendingData, setPendingData] = useState<{data: any, formatType: 'pdf' | 'docx' | 'email'} | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      doctorName: user?.displayName || '',
      doctorTitle: 'Docteur',
      doctorRole: 'interne',
      patientGender: 'né',
      certificateDate: format(new Date(), 'yyyy-MM-dd'),
    }
  });

  useEffect(() => {
    if (editData) {
      reset({
        doctorName: editData.doctorName || '',
        doctorTitle: editData.doctorTitle || 'Docteur',
        doctorRole: editData.doctorRole || 'interne',
        patientFirstName: editData.patientFirstName || '',
        patientLastName: editData.patientLastName || '',
        patientGender: editData.patientGender || 'né',
        patientDob: editData.patientDob || '',
        eds: editData.eds || '',
        startDate: editData.startDate || '',
        endDate: editData.endDate || '',
        certificateDate: editData.certificateDate || format(new Date(), 'yyyy-MM-dd'),
      });
      setIsEditMode(true);
      toast.info("Données du certificat chargées pour modification.");
      if (onClearEdit) onClearEdit();
    }
  }, [editData, reset, onClearEdit]);

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

  const loadDefaultInfo = async () => {
    if (!user?.uid) return;
    try {
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      if (userSnap.exists() && userSnap.data().defaultInfo) {
        const info = userSnap.data().defaultInfo;
        if (info.firstName) setValue('patientFirstName', info.firstName);
        if (info.lastName) setValue('patientLastName', info.lastName);
        if (info.dob) setValue('patientDob', info.dob);
        if (info.eds) setValue('eds', info.eds);
        if (info.gender) setValue('patientGender', info.gender);
        toast.success("Informations personnelles chargées");
      } else {
        toast.error("Aucune information personnelle trouvée. Configurez-les dans les paramètres.");
      }
    } catch (error) {
      console.error("Erreur lors du chargement des infos:", error);
      toast.error("Erreur lors du chargement des informations");
    }
  };

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
            DOCTEUR: data.doctorName,
            hof: data.doctorTitle,
            "i/a": data.doctorRole,
            "né": data.patientGender
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
    doc.text(`Concerne : ${data.patientFirstName} ${data.patientLastName}, ${data.patientGender} le ${ddn}`, 20, 40);
    doc.text(`N° EDS : ${data.eds}`, 20, 50);
    
    // Date
    doc.text(`Genève, le ${dateJour}`, 140, 60);

    // Body
    doc.text(`Le médecin soussigné certifie que ${data.patientFirstName} ${data.patientLastName}`, 20, 90);
    doc.text(`Ne pourra pas fréquenter l'école du ${duree1} au ${duree2}`, 20, 100);

    // Footer
    doc.text(`${data.doctorTitle} ${data.doctorName}`, 120, 140);
    doc.text(`Médecin ${data.doctorRole}`, 120, 148);
    
    // Save
    doc.save(`Certificat_${data.patientLastName}_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  const onSubmit = async (data: FormData, formatType: 'pdf' | 'docx' | 'email') => {
    setPendingData({ data, formatType });
    setShowPassword(true);
  };

  const handleSendEmail = async (email: string) => {
    if (!pendingData || !templateBase64) return;
    const { data } = pendingData;
    
    const dateJour = format(new Date(data.certificateDate), 'dd.MM.yyyy');
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
      DOCTEUR: data.doctorName,
      hof: data.doctorTitle,
      "i/a": data.doctorRole,
      "né": data.patientGender
    };

    const pdfBlob = await generatePDFBlob(templateBase64, templateData, convertApiKey);
    
    // Convert blob to base64 for the API
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
            <p>Cordialement,<br/>${data.doctorTitle} ${data.doctorName}</p>
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
  };

  const executeGeneration = async () => {
    if (!pendingData) return;
    const { data, formatType } = pendingData;
    
    if (formatType === 'email') {
      setShowEmailModal(true);
      return;
    }

    setIsGenerating(true);
    setSubmitFormat(formatType);
    try {
      // Save to Firestore
      await addDoc(collection(db, 'certificates'), {
        uid: user.uid,
        doctorName: data.doctorName,
        doctorTitle: data.doctorTitle,
        doctorRole: data.doctorRole,
        patientFirstName: data.patientFirstName,
        patientLastName: data.patientLastName,
        patientGender: data.patientGender,
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
      setIsEditMode(false);
    } catch (error) {
      console.error('Error generating certificate:', error);
      toast.error('Erreur lors de la génération du certificat');
    } finally {
      setIsGenerating(false);
      setSubmitFormat(null);
      setPendingData(null);
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
          setPendingData(null);
        }}
        onSend={handleSendEmail}
        patientName={pendingData?.data ? `${pendingData.data.patientFirstName} ${pendingData.data.patientLastName}` : ''}
      />
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight">Nouveau Certificat</h2>
          <p className="text-sm sm:text-base text-gray-500 mt-1 sm:mt-2">Générez un certificat d'absence scolaire au format PDF ou Word.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={loadDefaultInfo}
            className="flex-1 sm:flex-none justify-center bg-white text-gray-700 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl flex items-center gap-2 text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <User className="w-4 h-4" />
            Utiliser info perso
          </button>
          {isEditMode && (
            <div className="flex-1 sm:flex-none justify-center bg-blue-50 text-blue-700 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl flex items-center gap-2 text-sm font-medium border border-blue-100">
              <Pencil className="w-4 h-4" />
              Mode Modification
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/40 border border-gray-100 p-4 sm:p-5 md:p-8 max-w-2xl">
        <form className="space-y-5 sm:space-y-6">
          
          <div className="pb-5 sm:pb-6 border-b border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Titre du médecin</label>
                <select
                  {...register('doctorTitle')}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl border bg-gray-50/50 focus:bg-white transition-all duration-200 outline-none focus:ring-2 focus:ring-gray-900/10",
                    errors.doctorTitle ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-gray-900"
                  )}
                >
                  <option value="Docteur">Docteur (Homme)</option>
                  <option value="Docteure">Docteure (Femme)</option>
                </select>
                {errors.doctorTitle && <p className="text-xs text-red-500">{errors.doctorTitle.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Rôle du médecin</label>
                <select
                  {...register('doctorRole')}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl border bg-gray-50/50 focus:bg-white transition-all duration-200 outline-none focus:ring-2 focus:ring-gray-900/10",
                    errors.doctorRole ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-gray-900"
                  )}
                >
                  <option value="interne">Interne</option>
                  <option value="associé">Associé(e)</option>
                </select>
                {errors.doctorRole && <p className="text-xs text-red-500">{errors.doctorRole.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Genre du patient</label>
              <select
                {...register('patientGender')}
                className={cn(
                  "w-full px-4 py-3 rounded-xl border bg-gray-50/50 focus:bg-white transition-all duration-200 outline-none focus:ring-2 focus:ring-gray-900/10",
                  errors.patientGender ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-gray-900"
                )}
              >
                <option value="né">Homme (né le)</option>
                <option value="née">Femme (née le)</option>
              </select>
              {errors.patientGender && <p className="text-xs text-red-500">{errors.patientGender.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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
              Word
            </button>
            <button
              type="button"
              onClick={handleSubmit((data) => onSubmit(data, 'pdf'))}
              disabled={isGenerating}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-900 hover:text-gray-900 rounded-xl font-medium transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isGenerating && submitFormat === 'pdf' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              PDF
            </button>
            <button
              type="button"
              onClick={handleSubmit((data) => onSubmit(data, 'email'))}
              disabled={isGenerating}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-gray-900 text-white hover:bg-gray-800 rounded-xl font-medium transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-gray-900/20"
            >
              <Mail className="w-5 h-5" />
              Email
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
