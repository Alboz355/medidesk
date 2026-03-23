import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Search, Loader2, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export function MedicalSearch() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<any[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResult('');
    setSources([]);

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `En tant qu'assistant médical, réponds à cette question avec des informations à jour et fiables : ${query}`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      setResult(response.text || 'Aucune réponse trouvée.');
      
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        setSources(chunks.map(chunk => chunk.web).filter(Boolean));
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h2 className="text-3xl font-semibold text-gray-900 tracking-tight">Recherche Médicale</h2>
        <p className="text-gray-500 mt-2">Posez vos questions médicales avec des données à jour via Google Search.</p>
      </div>

      <div className="max-w-4xl">
        <form onSubmit={handleSearch} className="relative mb-8">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="block w-full pl-11 pr-32 py-4 bg-white border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 shadow-xl shadow-gray-200/40 transition-all duration-200"
            placeholder="Ex: Quelles sont les recommandations récentes pour le traitement de l'hypertension ?"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2.5 top-2.5 bottom-2.5 bg-gray-900 text-white px-6 rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors duration-200 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Rechercher'}
          </button>
        </form>

        {result && (
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/40 border border-gray-100 p-8">
            <div className="prose prose-gray max-w-none">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
            
            {sources.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-100">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <BookOpen className="w-4 h-4 text-gray-500" />
                  Sources
                </h4>
                <ul className="space-y-2">
                  {sources.map((source, idx) => (
                    <li key={idx}>
                      <a 
                        href={source.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline truncate block"
                      >
                        {source.title || source.uri}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
