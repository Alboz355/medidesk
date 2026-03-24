import React, { useState, useEffect } from 'react';
import { Upload, FileText, Trash2, CheckCircle2, Loader2, Key } from 'lucide-react';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';

export function Settings({ user }: { user: any }) {
  const [templateName, setTemplateName] = useState<string | null>(null);
  const [templateUid, setTemplateUid] = useState<string | null>(null);
  const [convertApiKey, setConvertApiKey] = useState<string>('');
  const [apiUid, setApiUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingKey, setSavingKey] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'templates', 'default'));
        if (docSnap.exists()) {
          setTemplateName(docSnap.data().name);
          setTemplateUid(docSnap.data().uid);
        }
        
        const apiSnap = await getDoc(doc(db, 'settings', 'api'));
        if (apiSnap.exists()) {
          if (apiSnap.data().convertApiKey) setConvertApiKey(apiSnap.data().convertApiKey);
          if (apiSnap.data().uid) setApiUid(apiSnap.data().uid);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des paramètres:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const saveApiKey = async () => {
    setSavingKey(true);
    try {
      await setDoc(doc(db, 'settings', 'api'), {
        convertApiKey: convertApiKey,
        uid: user.uid,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setApiUid(user.uid);
      toast.success('Clé API sauvegardée avec succès');
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de la clé:", error);
      toast.error('Erreur lors de la sauvegarde de la clé API');
    } finally {
      setSavingKey(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      toast.error('Veuillez uploader un fichier Word (.docx)');
      return;
    }

    // Vérification de la taille (Firestore limite à 1Mo par document)
    // 700 Ko est une limite sûre car le Base64 augmente la taille d'environ 33%
    if (file.size > 700 * 1024) {
      toast.error("Le fichier est trop lourd (max 700 Ko). Veuillez réduire la taille du logo ou des images dans le document Word.");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const base64 = (event.target?.result as string).split(',')[1];
        
        // On crée une promesse qui rejette après 10 secondes pour éviter le chargement infini
        const uploadPromise = setDoc(doc(db, 'templates', 'default'), {
          name: file.name,
          data: base64,
          uid: user.uid,
          updatedAt: serverTimestamp()
        });

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("TIMEOUT")), 10000)
        );

        await Promise.race([uploadPromise, timeoutPromise]);

        setTemplateName(file.name);
        setTemplateUid(user.uid);
        toast.success('Modèle Word enregistré pour tous les utilisateurs !');
      } catch (error: any) {
        console.error("Erreur lors de la sauvegarde du modèle:", error);
        if (error.message === "TIMEOUT" || error.code === 'unavailable') {
          toast.error("Connexion impossible. Vérifiez que la base Firestore est bien créée dans la console Firebase.");
        } else if (error.code === 'permission-denied') {
          toast.error("Permission refusée. Vérifiez les règles de sécurité Firestore.");
        } else {
          toast.error('Erreur lors de la sauvegarde du modèle');
        }
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeTemplate = async () => {
    try {
      await deleteDoc(doc(db, 'templates', 'default'));
      setTemplateName(null);
      setTemplateUid(null);
      toast.success('Modèle supprimé. Le générateur PDF par défaut sera utilisé.');
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast.error('Erreur lors de la suppression du modèle');
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h2 className="text-3xl font-semibold text-gray-900 tracking-tight">Paramètres</h2>
        <p className="text-gray-500 mt-2">Configurez le modèle de certificat Word global pour le cabinet.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/40 border border-gray-100 p-5 sm:p-8 max-w-2xl">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Modèle de Certificat (.docx)</h3>
        
        <div className="bg-gray-50 rounded-xl p-4 sm:p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-4">
            Uploadez le fichier Word de base du cabinet. Ce modèle sera utilisé par <strong>tous les utilisateurs</strong>.<br/>
            Il doit contenir les balises suivantes :<br/>
            <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-800 font-mono text-xs">{'{PRENOM}'}</code>, 
            <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-800 font-mono text-xs ml-1">{'{NOM}'}</code>, 
            <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-800 font-mono text-xs ml-1">{'{DDN}'}</code>, 
            <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-800 font-mono text-xs ml-1">{'{EDS}'}</code>, 
            <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-800 font-mono text-xs ml-1">{'{DATE_JOUR}'}</code> ou <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-800 font-mono text-xs">{'{DATE_DU_JOUR}'}</code>, 
            <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-800 font-mono text-xs ml-1">{'{DUREE1}'}</code>, 
            <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-800 font-mono text-xs ml-1">{'{DUREE2}'}</code>, 
            <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-800 font-mono text-xs ml-1">{'{DOCTEUR}'}</code>
          </p>

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : templateName ? (
            <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-green-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Modèle actif pour le cabinet</p>
                  <p className="text-xs text-gray-500">{templateName}</p>
                </div>
              </div>
              {(templateUid === user?.uid) && (
                <button
                  onClick={removeTemplate}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Supprimer le modèle"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          ) : (
            <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {uploading ? (
                  <Loader2 className="w-8 h-8 text-gray-400 mb-2 animate-spin" />
                ) : (
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                )}
                <p className="text-sm text-gray-500">
                  <span className="font-medium">{uploading ? 'Upload en cours...' : 'Cliquez pour uploader'}</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">Fichier .docx uniquement</p>
              </div>
              <input type="file" className="hidden" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleFileUpload} disabled={uploading} />
            </label>
          )}
        </div>
      </div>
      {(!apiUid || apiUid === user?.uid) && (
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/40 border border-gray-100 p-5 sm:p-8 max-w-2xl mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Conversion PDF Parfaite (Optionnel)</h3>

          <div className="bg-gray-50 rounded-xl p-4 sm:p-6 border border-gray-200">
            <p className="text-sm text-gray-600 mb-4">
              Pour que le PDF généré soit <strong>exactement identique</strong> à votre modèle Word (en gardant les colonnes, logos, et mises en page complexes), vous pouvez utiliser le service gratuit ConvertAPI.
            </p>
            <ol className="list-decimal list-inside text-sm text-gray-600 mb-6 space-y-1">
              <li>Créez un compte gratuit sur <a href="https://www.convertapi.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">ConvertAPI</a></li>
              <li>Allez dans votre tableau de bord et copiez votre <strong>Secret Key</strong></li>
              <li>Collez-la ci-dessous</li>
            </ol>

            <div className="flex gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  value={convertApiKey}
                  onChange={(e) => setConvertApiKey(e.target.value)}
                  placeholder="Votre Secret Key ConvertAPI"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-gray-900 focus:border-gray-900 sm:text-sm"
                />
              </div>
              <button
                onClick={saveApiKey}
                disabled={savingKey}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50"
              >
                {savingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
