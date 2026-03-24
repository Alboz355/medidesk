import React, { useState, useEffect } from 'react';
import { Upload, FileText, Trash2, CheckCircle2, Loader2, Key, ShieldAlert } from 'lucide-react';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';

export function Settings({ user }: { user: any }) {
  const isAdmin = user?.email === 'leartshabija@gmail.com';
  const [templateName, setTemplateName] = useState<string | null>(null);
  const [convertApiKey, setConvertApiKey] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  const [defaultInfo, setDefaultInfo] = useState({
    firstName: '',
    lastName: '',
    dob: '',
    eds: '',
    gender: 'né'
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'templates', 'default'));
        if (docSnap.exists()) {
          setTemplateName(docSnap.data().name);
        }
        
        const apiSnap = await getDoc(doc(db, 'settings', 'api'));
        if (apiSnap.exists() && apiSnap.data().convertApiKey) {
          setConvertApiKey(apiSnap.data().convertApiKey);
        }

        if (user?.uid) {
          const userSnap = await getDoc(doc(db, 'users', user.uid));
          if (userSnap.exists() && userSnap.data().defaultInfo) {
            setDefaultInfo(userSnap.data().defaultInfo);
          }
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
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast.success('Clé API sauvegardée avec succès');
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de la clé:", error);
      toast.error('Erreur lors de la sauvegarde de la clé API');
    } finally {
      setSavingKey(false);
    }
  };

  const saveDefaultInfo = async () => {
    if (!user?.uid) return;
    setSavingInfo(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        defaultInfo,
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast.success('Informations personnelles sauvegardées avec succès');
    } catch (error) {
      console.error("Erreur lors de la sauvegarde des infos:", error);
      toast.error('Erreur lors de la sauvegarde des informations');
    } finally {
      setSavingInfo(false);
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
          updatedAt: serverTimestamp()
        });

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("TIMEOUT")), 10000)
        );

        await Promise.race([uploadPromise, timeoutPromise]);

        setTemplateName(file.name);
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
      toast.success('Modèle supprimé. Le générateur PDF par défaut sera utilisé.');
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast.error('Erreur lors de la suppression du modèle');
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight">Paramètres</h2>
        <p className="text-sm sm:text-base text-gray-500 mt-1 sm:mt-2">Configurez le modèle de certificat Word global pour le cabinet.</p>
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
            <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-800 font-mono text-xs ml-1">{'{DOCTEUR}'}</code>,
            <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-800 font-mono text-xs ml-1">{'{hof}'}</code>,
            <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-800 font-mono text-xs ml-1">{'{i/a}'}</code>,
            <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-800 font-mono text-xs ml-1">{'{né}'}</code>
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
              {isAdmin && (
                <button
                  onClick={removeTemplate}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Supprimer le modèle"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          ) : isAdmin ? (
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
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
              <ShieldAlert className="w-8 h-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">Aucun modèle configuré par l'administrateur.</p>
            </div>
          )}
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/40 border border-gray-100 p-5 sm:p-8 max-w-2xl mt-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Informations personnelles par défaut</h3>
        
        <div className="bg-gray-50 rounded-xl p-4 sm:p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-6">
            Ces informations pourront être pré-remplies automatiquement lors de la création d'un nouveau certificat.
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                <input
                  type="text"
                  value={defaultInfo.firstName}
                  onChange={(e) => setDefaultInfo({ ...defaultInfo, firstName: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-gray-900 focus:border-gray-900 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input
                  type="text"
                  value={defaultInfo.lastName}
                  onChange={(e) => setDefaultInfo({ ...defaultInfo, lastName: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-gray-900 focus:border-gray-900 sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de naissance</label>
                <input
                  type="date"
                  value={defaultInfo.dob}
                  onChange={(e) => setDefaultInfo({ ...defaultInfo, dob: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-gray-900 focus:border-gray-900 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Genre</label>
                <select
                  value={defaultInfo.gender}
                  onChange={(e) => setDefaultInfo({ ...defaultInfo, gender: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-gray-900 focus:border-gray-900 sm:text-sm"
                >
                  <option value="né">Homme (né le)</option>
                  <option value="née">Femme (née le)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">N° EDS</label>
              <input
                type="text"
                value={defaultInfo.eds}
                onChange={(e) => setDefaultInfo({ ...defaultInfo, eds: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-gray-900 focus:border-gray-900 sm:text-sm"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={saveDefaultInfo}
                disabled={savingInfo}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50"
              >
                {savingInfo ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Enregistrer les infos
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/40 border border-gray-100 p-5 sm:p-8 max-w-2xl mt-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Conversion PDF Parfaite (Global)</h3>
        
        <div className="bg-gray-50 rounded-xl p-4 sm:p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-4">
            {isAdmin 
              ? "Configurez la clé API ConvertAPI pour permettre une conversion PDF parfaite pour tous les utilisateurs du cabinet."
              : "La conversion PDF haute fidélité est gérée par l'administrateur pour l'ensemble du cabinet."}
          </p>
          
          {isAdmin ? (
            <>
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
            </>
          ) : (
            <div className="flex items-center gap-3 bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Conversion PDF active</p>
                <p className="text-xs text-gray-500">Géré par l'administrateur ({convertApiKey ? 'Clé configurée' : 'Clé non configurée'})</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
