import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Image as ImageIcon, Loader2, Download, Layout } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

declare global {
  interface Window {
    aistudio?: any;
  }
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const aspectRatios = [
  { label: '1:1', value: '1:1' },
  { label: '4:3', value: '4:3' },
  { label: '16:9', value: '16:9' },
  { label: '9:16', value: '9:16' },
  { label: '3:4', value: '3:4' },
];

export function ImageGeneration() {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setImageUrl(null);

    try {
      // Check for API key selection if needed, but since we use free tier models or standard models, 
      // we might need to use gemini-3.1-flash-image-preview which requires user API key if it's pro, but flash is free.
      // Wait, the instructions say: "When using gemini-3-pro-image-preview or gemini-3.1-flash-image-preview, users MUST select their own API key."
      // Let's check if we have the key selected.
      if (window.aistudio && !await window.aistudio.hasSelectedApiKey()) {
        await window.aistudio.openSelectKey();
      }

      // Re-initialize AI with the potentially new key
      const currentAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const response = await currentAi.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any,
            imageSize: '1K',
          },
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          setImageUrl(`data:image/png;base64,${base64EncodeString}`);
          break;
        }
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      if (error.message?.includes('Requested entity was not found')) {
        toast.error('Veuillez sélectionner une clé API valide.');
        if (window.aistudio) {
          await window.aistudio.openSelectKey();
        }
      } else {
        toast.error('Erreur lors de la génération de l\'image');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h2 className="text-3xl font-semibold text-gray-900 tracking-tight">Génération d'Images</h2>
        <p className="text-gray-500 mt-2">Créez des schémas ou illustrations médicales avec l'IA.</p>
      </div>

      <div className="max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/40 border border-gray-100 p-8">
          <form onSubmit={handleGenerate} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Description de l'image</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white transition-all duration-200 outline-none focus:ring-2 focus:ring-gray-900/10 resize-none"
                placeholder="Ex: Un schéma anatomique détaillé du cœur humain, style médical, fond blanc..."
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Layout className="w-4 h-4 text-gray-500" />
                Format (Ratio)
              </label>
              <div className="flex flex-wrap gap-2">
                {aspectRatios.map((ratio) => (
                  <button
                    key={ratio.value}
                    type="button"
                    onClick={() => setAspectRatio(ratio.value)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border",
                      aspectRatio === ratio.value
                        ? "bg-gray-900 text-white border-gray-900 shadow-md shadow-gray-900/10"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    )}
                  >
                    {ratio.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="w-full bg-gray-900 text-white py-3.5 px-4 rounded-xl font-medium hover:bg-gray-800 hover:shadow-lg hover:shadow-gray-900/20 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <ImageIcon className="w-5 h-5" />
                  Générer l'image
                </>
              )}
            </button>
          </form>
        </div>

        <div className="bg-gray-50 rounded-2xl border border-gray-200/60 overflow-hidden flex items-center justify-center min-h-[400px] relative">
          {loading ? (
            <div className="flex flex-col items-center gap-4 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-sm font-medium">Création de l'image...</span>
            </div>
          ) : imageUrl ? (
            <div className="relative w-full h-full group">
              <img
                src={imageUrl}
                alt="Generated"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                <a
                  href={imageUrl}
                  download="medical_image.png"
                  className="bg-white text-gray-900 px-6 py-3 rounded-xl font-medium flex items-center gap-2 hover:scale-105 transition-transform duration-200"
                >
                  <Download className="w-5 h-5" />
                  Télécharger
                </a>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-gray-400">
              <ImageIcon className="w-12 h-12 opacity-20" />
              <span className="text-sm font-medium">L'image générée apparaîtra ici</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
