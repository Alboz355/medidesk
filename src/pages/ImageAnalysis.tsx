import React, { useState, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { ScanText, Upload, Loader2, FileText, Image as ImageIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export function ImageAnalysis() {
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('Analysez ce document médical ou cette image et extrayez les informations clés.');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Veuillez sélectionner une image valide.');
        return;
      }
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult('');
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image || !prompt.trim()) return;

    setLoading(true);
    setResult('');

    try {
      const base64data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(image);
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      
      const base64String = base64data.split(',')[1];
      const mimeType = image.type;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64String,
                mimeType: mimeType,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      });

      setResult(response.text || 'Aucune analyse disponible.');
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Erreur lors de l\'analyse de l\'image');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h2 className="text-3xl font-semibold text-gray-900 tracking-tight">Analyse d'Image</h2>
        <p className="text-gray-500 mt-2">Analysez des documents médicaux, des ordonnances ou des schémas avec l'IA.</p>
      </div>

      <div className="max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/40 border border-gray-100 p-8">
          <form onSubmit={handleAnalyze} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Image à analyser</label>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-48 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors duration-200 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group"
              >
                {previewUrl ? (
                  <>
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-contain p-2" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <span className="text-white font-medium flex items-center gap-2">
                        <Upload className="w-4 h-4" /> Changer d'image
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-gray-500">
                    <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-gray-400" />
                    </div>
                    <span className="text-sm font-medium">Cliquez pour sélectionner une image</span>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Instructions pour l'IA</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white transition-all duration-200 outline-none focus:ring-2 focus:ring-gray-900/10 resize-none"
                placeholder="Ex: Extrayez le nom du médicament et la posologie..."
              />
            </div>

            <button
              type="submit"
              disabled={loading || !image || !prompt.trim()}
              className="w-full bg-gray-900 text-white py-3.5 px-4 rounded-xl font-medium hover:bg-gray-800 hover:shadow-lg hover:shadow-gray-900/20 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <ScanText className="w-5 h-5" />
                  Analyser l'image
                </>
              )}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/40 border border-gray-100 p-8 min-h-[400px] flex flex-col">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-6">
            <FileText className="w-5 h-5 text-gray-500" />
            Résultat de l'analyse
          </h3>
          
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="text-sm font-medium">L'IA examine le document...</span>
              </div>
            ) : result ? (
              <div className="prose prose-sm max-w-none text-gray-700">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
                <ScanText className="w-12 h-12 opacity-20" />
                <span className="text-sm font-medium text-center px-8">
                  Le résultat de l'analyse s'affichera ici une fois l'image traitée.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
