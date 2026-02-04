
import React, { useState, useCallback, useEffect } from 'react';
import { Product, TryOnState } from './types';
import { MOCK_PRODUCTS, AVAILABLE_SIZES } from './constants';
import { performVirtualTryOn, fileToBase64, urlToBase64, estimateSizeFromImage } from './services/geminiService';
import ProductCard from './components/ProductCard';
import StepIndicator from './components/StepIndicator';

const App: React.FC = () => {
  const [state, setState] = useState<TryOnState>({
    userImage: null,
    selectedProduct: null,
    resultImage: null,
    recommendedSize: null,
    isLoading: false,
    error: null,
  });

  const [step, setStep] = useState(1);
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        setHasKey(await window.aistudio.hasSelectedApiKey());
      } else {
        setHasKey(!!process.env.API_KEY);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
    }
  };

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        setState(prev => ({ ...prev, userImage: base64, error: null }));
      } catch (err) {
        setState(prev => ({ ...prev, error: "Fehler beim Lesen der Datei." }));
      }
    }
  }, []);

  const handleTryOn = async () => {
    if (!state.userImage || !state.selectedProduct) return;
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    setStep(3);

    try {
      const productBase64 = await urlToBase64(state.selectedProduct.imageUrl);
      const size = await estimateSizeFromImage(state.userImage, state.selectedProduct.name);
      const image = await performVirtualTryOn(state.userImage, productBase64, state.selectedProduct.name);
      setState(prev => ({ ...prev, resultImage: image, recommendedSize: size, isLoading: false }));
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("400") || err.message === "INVALID_KEY") {
        setHasKey(false);
        setState(prev => ({ ...prev, isLoading: false, error: "Bitte wähle einen API-Key mit aktivierter Abrechnung." }));
      } else {
        setState(prev => ({ ...prev, isLoading: false, error: "KI-Fehler. Bitte versuche ein anderes Foto." }));
      }
    }
  };

  const reset = () => {
    setState({ userImage: null, selectedProduct: null, resultImage: null, recommendedSize: null, isLoading: false, error: null });
    setStep(1);
  };

  const saveLook = () => {
    if (state.resultImage) {
      const link = document.createElement('a');
      link.href = state.resultImage;
      link.download = `my-better-future-look-${state.selectedProduct?.name}.jpg`;
      link.click();
    }
  };

  if (hasKey === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-[40px] p-10 shadow-2xl">
          <h1 className="text-2xl font-black mb-4 uppercase italic">API Key benötigt</h1>
          <p className="text-slate-500 mb-8 text-sm">Für die Bildgenerierung auf Vercel ist ein eigener Gemini Key erforderlich.</p>
          <button onClick={handleSelectKey} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg active:scale-95 uppercase italic">Key auswählen</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-slate-50 font-sans text-slate-900">
      <header className="bg-white border-b border-slate-100 py-4 mb-8 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <span className="font-bold text-xl tracking-tighter uppercase italic text-slate-900">Better Future</span>
          </div>
          <button onClick={reset} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reset</button>
        </div>
      </header>

      <main className="container mx-auto px-4 max-w-5xl">
        <StepIndicator currentStep={step} />

        {step === 1 && (
          <div className="animate-fadeIn">
            <h1 className="text-center text-4xl font-black italic uppercase tracking-tighter mb-10">Wähle deinen Look</h1>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-12">
              {MOCK_PRODUCTS.map(p => (
                <ProductCard key={p.id} product={p} isSelected={state.selectedProduct?.id === p.id} onSelect={(prod) => setState(prev => ({...prev, selectedProduct: prod}))} />
              ))}
            </div>
            <div className="flex justify-center">
              <button disabled={!state.selectedProduct} onClick={() => setStep(2)} className={`px-16 py-4 rounded-full font-black text-xl transition-all shadow-xl ${state.selectedProduct ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}>WEITER</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fadeIn max-w-2xl mx-auto">
            <h1 className="text-center text-3xl font-black uppercase italic mb-8">Foto hochladen</h1>
            <div className="bg-white p-10 rounded-[40px] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center min-h-[400px] shadow-2xl">
              {state.userImage ? (
                <div className="relative">
                  <img src={state.userImage} className="rounded-3xl shadow-xl max-h-[400px] object-cover border-4 border-white" />
                  <button onClick={() => setState(prev => ({ ...prev, userImage: null }))} className="absolute -top-4 -right-4 bg-red-500 text-white p-3 rounded-full shadow-lg">X</button>
                </div>
              ) : (
                <label className="w-full flex flex-col items-center justify-center cursor-pointer py-10">
                  <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4 text-indigo-600">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                  </div>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Bild auswählen</p>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                </label>
              )}
            </div>
            <div className="flex gap-4 mt-10 justify-center">
              <button onClick={() => setStep(1)} className="px-10 py-4 bg-white border border-slate-200 rounded-full font-black text-xs uppercase text-slate-400">Zurück</button>
              <button disabled={!state.userImage} onClick={handleTryOn} className={`px-12 py-4 rounded-full font-black text-lg shadow-xl ${state.userImage ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}>ANPROBE STARTEN ✨</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fadeIn">
            {state.isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 border-4 border-indigo-50 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
                <h2 className="text-2xl font-black text-indigo-600 italic uppercase">KI generiert Look...</h2>
              </div>
            ) : state.error ? (
              <div className="bg-white rounded-[40px] p-10 text-center shadow-xl max-w-lg mx-auto border border-red-50">
                <h2 className="text-xl font-black text-red-600 uppercase italic mb-4">Fehler</h2>
                <p className="text-slate-500 mb-8">{state.error}</p>
                <button onClick={() => setStep(2)} className="px-10 py-4 bg-indigo-600 text-white rounded-full font-black uppercase">Nochmal</button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-10 items-start">
                <div className="space-y-6">
                  <img src={state.resultImage!} className="w-full rounded-[40px] shadow-2xl border-4 border-white" />
                  <div className="flex flex-col gap-4">
                    <button onClick={saveLook} className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black uppercase italic tracking-tighter hover:bg-indigo-700 transition-all shadow-lg active:scale-95">LOOK SPEICHERN</button>
                    <button onClick={reset} className="w-full bg-white border-2 border-slate-200 text-slate-400 py-4 rounded-3xl font-black uppercase italic tracking-tighter hover:border-indigo-600 hover:text-indigo-600 transition-all">Anderen Look probieren</button>
                  </div>
                </div>

                <div className="bg-white p-8 md:p-10 rounded-[50px] shadow-2xl border border-slate-50 space-y-8">
                  <div>
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-4">Größenempfehlung</h2>
                    <div className="bg-emerald-50 rounded-3xl p-6 mb-4 flex items-center space-x-6 border border-emerald-100">
                      <div className="bg-emerald-600 text-white w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-black italic shrink-0 shadow-lg">{state.recommendedSize}</div>
                      <p className="text-emerald-900 font-bold leading-tight">Deine persönliche KI-Größenempfehlung für das <span className="uppercase">{state.selectedProduct?.name}</span>.</p>
                    </div>
                    <p className="text-slate-500 text-sm leading-relaxed italic">
                      Bitte beachte, dass dies natürlich nur eine erste Empfehlung ist. Solltest du dir bei der Größe unsicher sein, schaue dir gerne nochmal unseren Größenberater in der Produktbeschreibung an. :)
                    </p>
                  </div>

                  <div className="bg-indigo-50/50 rounded-[40px] p-8 space-y-6 border border-indigo-100">
                    <div className="text-center">
                      <h3 className="text-xl font-black uppercase italic tracking-tighter text-indigo-900">Wir finden das Set steht dir super! 🎉</h3>
                      <p className="text-indigo-600 font-bold text-sm mt-1 uppercase tracking-widest">Sichere dir deine Größe bei der Pre-Order zum halben Preis.</p>
                    </div>

                    <p className="text-slate-600 text-xs text-center px-4 font-medium italic">
                      Über 100 Frauen haben bereits vorbestellt – und das aus gutem Grund:
                    </p>

                    <ul className="space-y-4 text-sm font-medium">
                      <li className="flex items-start space-x-3">
                        <span className="text-emerald-500">✓</span>
                        <p><span className="font-bold text-slate-900">Nachhaltig von Anfang bis Ende</span> – Recycelte Materialien, faire Löhne in Portugal, klimaneutraler Versand.</p>
                      </li>
                      <li className="flex items-start space-x-3">
                        <span className="text-emerald-500">✓</span>
                        <p><span className="font-bold text-slate-900">Performance trifft Komfort</span> – Squat-proof, atmungsaktiv und blickdicht. Entwickelt für dein intensivstes Workout.</p>
                      </li>
                      <li className="flex items-start space-x-3">
                        <span className="text-emerald-500">✓</span>
                        <p><span className="font-bold text-slate-900">Sichere Zahlung & Kostenlose Retoure</span></p>
                      </li>
                    </ul>

                    <div className="flex flex-col items-center space-y-1">
                      <div className="flex space-x-1 text-yellow-400 text-xl">
                        <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">4.9/5 von Early Testern</p>
                    </div>

                    <div className="bg-white rounded-3xl p-6 border-2 border-indigo-100 text-center relative overflow-hidden">
                       <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest">Einmaliges Angebot</div>
                       <p className="text-indigo-600 font-black text-3xl italic tracking-tighter">-50% OFF</p>
                       <p className="text-slate-400 text-[11px] mt-1">Nach dem Launch kostet das Set 108€. Das heißt du sparst 54€! Bestelle jetzt und gib im Warenkorb einfach den Code ein:</p>
                       
                       <div className="mt-4 bg-slate-50 border-2 border-dashed border-indigo-200 py-3 rounded-2xl font-black text-2xl tracking-[0.3em] text-indigo-600 uppercase select-all cursor-pointer hover:bg-white transition-colors">
                         PRE50
                       </div>
                    </div>
                  </div>

                  <div className="text-center pt-4">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] italic">Better Future Collection • Smart Fitting Engine</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
