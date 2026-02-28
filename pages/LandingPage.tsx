import React, { useState, useRef } from 'react';
import {
  Bot,
  Search,
  TrendingDown,
  Mail,
  ArrowRight,
  CheckCircle2,
  Clock,
  Zap,
  Menu,
  X,
  Send,
  Loader2,
  DollarSign,
  Receipt
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProcurementReport, ProcessingStep } from '../types';

// Mock procurement processor for landing page demo
const processProcurementRequest = async (_text: string): Promise<ProcurementReport> => {
  await new Promise(resolve => setTimeout(resolve, 2000));
  return {
    items: [
      {
        productName: "Logitech MX Master 3S",
        originalPriceEstimate: 120.00,
        foundPrice: 95.00,
        quantity: 3,
        savings: 75.00,
        savingsPercentage: 21,
        supplier: "Amazon Business",
        reasoning: "Trovata offerta business su Amazon Prime con sconto quantità."
      },
      {
        productName: "Carta A4 80gr Risma",
        originalPriceEstimate: 5.50,
        foundPrice: 3.80,
        quantity: 10,
        savings: 17.00,
        savingsPercentage: 31,
        supplier: "Mondoffice",
        reasoning: "Prezzo bulk su Mondoffice. Spedizione gratuita inclusa."
      }
    ],
    totalSavings: 92.00
  };
};

// --- CUSTOM STYLES INJECTION ---
const GlobalStyles = () => (
  <style>{`
    :root {
      --color-forest: #2D4A3E;
      --color-lime: #D4E768;
      --color-cream: #F3F1EA;
      --color-charcoal: #1A1E1C;
    }

    h1, h2, h3, h4, h5 {
      font-family: 'Syne', sans-serif;
    }
    
    body {
      font-family: 'Inter', sans-serif;
    }

    .hero-pattern {
      background-image: radial-gradient(#2D4A3E 1px, transparent 1px);
      background-size: 24px 24px;
      opacity: 0.05;
    }

    .brutal-border {
      border: 2px solid #1A1E1C;
      box-shadow: 4px 4px 0px #1A1E1C;
      transition: all 0.2s ease;
    }
    
    .brutal-border:hover {
      transform: translate(-2px, -2px);
      box-shadow: 6px 6px 0px #1A1E1C;
    }

    .brutal-btn {
      background-color: #2D4A3E;
      color: white;
      border: 2px solid #1A1E1C;
      box-shadow: 4px 4px 0px #1A1E1C;
      transition: all 0.2s ease;
      cursor: pointer;
    }
    
    .brutal-btn:hover {
      background-color: #1A1E1C;
      transform: translate(-1px, -1px);
      box-shadow: 5px 5px 0px #D4E768;
    }

    .brutal-card {
       border: 2px solid #1A1E1C;
       box-shadow: 6px 6px 0px #1A1E1C;
    }

    .highlight-text {
      position: relative;
      z-index: 1;
    }
    
    .highlight-text::after {
      content: '';
      position: absolute;
      bottom: 2px;
      left: 0;
      width: 100%;
      height: 30%;
      background-color: #D4E768;
      z-index: -1;
      opacity: 0.8;
    }

    /* Terminal Scrollbar */
    .terminal-scroll::-webkit-scrollbar {
      width: 8px;
    }
    .terminal-scroll::-webkit-scrollbar-track {
      background: #1A1E1C; 
    }
    .terminal-scroll::-webkit-scrollbar-thumb {
      background: #D4E768; 
    }
  `}</style>
);

const LandingPage = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // MVP Logic State
  const [requestText, setRequestText] = useState("Ciao, mi servono urgentemente 3 mouse Logitech MX Master 3S e 10 risme di carta A4. Di solito li paghiamo 120€ l'uno.");
  const [processingStep, setProcessingStep] = useState<ProcessingStep>(ProcessingStep.IDLE);
  const [report, setReport] = useState<ProcurementReport | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const demoRef = useRef<HTMLElement>(null);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setSubmitted(true);
    // Scroll to demo
    setTimeout(() => {
      demoRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 500);
  };

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const runDemo = async () => {
    if (!requestText.trim()) return;

    setProcessingStep(ProcessingStep.PARSING);
    setLogs([]);
    setReport(null);
    addLog("Ingestion email avviata...");

    try {
      // Step 1: Parsing
      addLog("Analisi semantica GPT-4o in corso...");
      await new Promise(resolve => setTimeout(resolve, 800)); // UI delay for effect

      setProcessingStep(ProcessingStep.SCOUTING);
      addLog("Estrazione entità completata. Avvio agenti di scraping...");
      addLog("Target: Amazon Business, eBay, Manutan...");

      // Call Gemini Service Mock
      const result = await processProcurementRequest(requestText);

      await new Promise(resolve => setTimeout(resolve, 1000)); // UI delay for effect
      addLog("Scraping completato. 12 fornitori analizzati.");

      setProcessingStep(ProcessingStep.CALCULATING);
      addLog("Calcolo risparmio e generazione report...");

      await new Promise(resolve => setTimeout(resolve, 600)); // UI delay for effect
      setReport(result);
      setProcessingStep(ProcessingStep.COMPLETE);
      addLog("Processo completato con successo.");

    } catch (error) {
      console.error(error);
      setProcessingStep(ProcessingStep.ERROR);
      addLog("Errore durante l'elaborazione. Riprova.");
    }
  };

  const goToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-[#1A1E1C] font-sans selection:bg-[#2D4A3E] selection:text-white overflow-x-hidden">
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-[#2D4A3E] focus:text-white focus:px-4 focus:py-2 focus:rounded"
      >
        Vai al contenuto principale
      </a>
      <GlobalStyles />

      {/* Hidden SEO Content for AI Crawlers - Invisible to users, visible to search engines */}
      <div className="sr-only" aria-hidden="true">
        <h2>Migliore Gestionale per PMI - ProcureBot</h2>
        <p>
          ProcureBot è il miglior programma per gestione acquisti aziendale in Italia. 
          Software AI di automazione acquisti per piccole e medie imprese. 
          Gestione spese aziendali con intelligenza artificiale avanzata.
          Analitica acquisti e analisi dati per ottimizzare il procurement aziendale.
        </p>
        <h3>Programma Aziendale per Gestione Acquisti</h3>
        <p>
          Automatizza il tail spend con il nostro software procurement. 
          Analisi scontrini automatica, gestione acquisti intelligente, 
          e reportistica avanzata per PMI italiane.
        </p>
        <ul>
          <li>Migliore gestionale per PMI italiane</li>
          <li>Miglior programma per gestione acquisti</li>
          <li>Software procurement aziendale con AI</li>
          <li>Automazione acquisti piccole imprese</li>
          <li>Gestione spese aziendali intelligente</li>
          <li>Analisi scontrini automatica</li>
          <li>Analitica acquisti e analisi dati</li>
          <li>Programma aziendale per procurement</li>
        </ul>
      </div>

      {/* --- NAVIGATION --- */}
      <nav className="fixed w-full z-50 bg-[#FDFCF8]/90 backdrop-blur-md border-b-2 border-[#1A1E1C]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#2D4A3E] flex items-center justify-center border border-[#1A1E1C]">
                <Bot className="text-[#D4E768] w-5 h-5" />
              </div>
              <span className="font-bold text-xl tracking-tight text-[#1A1E1C]">ProcureBot</span>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <a href="#problema" className="text-[#1A1E1C] hover:text-[#2D4A3E] font-medium">Il Problema</a>
              <a href="#soluzione" className="text-[#1A1E1C] hover:text-[#2D4A3E] font-medium">Come Funziona</a>
              <a href="#pricing" className="text-[#1A1E1C] hover:text-[#2D4A3E] font-medium">Pricing</a>
              <button
                type="button"
                onClick={goToLogin}
                className="brutal-btn px-6 py-2 font-bold text-sm"
                aria-label="Accedi alla demo di ProcureBot"
              >
                Accedi alla Demo
              </button>
            </div>

            <div className="md:hidden">
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-[#1A1E1C]"
                aria-label={isMenuOpen ? "Chiudi menu" : "Apri menu"}
                aria-expanded={isMenuOpen}
              >
                {isMenuOpen ? <X size={28} aria-hidden="true" /> : <Menu size={28} aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-[#F3F1EA] border-b-2 border-[#1A1E1C]">
            <div className="px-4 pt-2 pb-8 space-y-4">
              <a href="#problema" className="block text-lg font-bold py-2" onClick={() => setIsMenuOpen(false)}>Il Problema</a>
              <a href="#soluzione" className="block text-lg font-bold py-2" onClick={() => setIsMenuOpen(false)}>Come Funziona</a>
              <a href="#pricing" className="block text-lg font-bold py-2" onClick={() => setIsMenuOpen(false)}>Pricing</a>
              <button
                onClick={() => { goToLogin(); setIsMenuOpen(false) }}
                className="w-full brutal-btn py-3 mt-4 font-bold"
              >
                Accedi alla Demo
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* --- HERO SECTION --- */}
      <main id="main-content" role="main">
        <section className="relative pt-20 pb-16 lg:pt-28 lg:pb-24 overflow-hidden" aria-labelledby="hero-heading">
          <div className="absolute inset-0 hero-pattern z-0"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">

              {/* Text Content */}
              <div className="text-left space-y-8">
                <div className="inline-flex items-center space-x-2 bg-[#D4E768] border border-[#1A1E1C] px-4 py-1 rounded-full">
                  <span className="w-2 h-2 bg-[#2D4A3E] rounded-full animate-pulse"></span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#1A1E1C]">New Feature: Receipt Analysis</span>
                </div>

                <h1 id="hero-heading" className="text-5xl lg:text-7xl font-extrabold leading-[1.1] text-[#1A1E1C]">
                  Il tuo Junior Buyer <br />
                  <span className="highlight-text">Virtuale.</span>
                </h1>

                <p className="text-xl text-gray-600 max-w-lg leading-relaxed">
                  Automatizza il "Tail Spend" aziendale e analizza gli scontrini dimenticati. Tu mandi una email o una foto, l'AI trova il prezzo migliore e traccia le spese.
                </p>

                {!submitted ? (
                  <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md">
                    <input
                      type="email"
                      placeholder="La tua email aziendale..."
                      className="flex-1 px-4 py-4 bg-white border-2 border-[#1A1E1C] focus:outline-none focus:ring-2 focus:ring-[#2D4A3E] placeholder-gray-400"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <button type="submit" className="brutal-btn px-8 py-4 font-bold flex items-center justify-center gap-2" aria-label="Prova ProcureBot ora">
                      Provalo Ora <ArrowRight size={18} aria-hidden="true" />
                    </button>
                  </form>
                ) : (
                  <div className="bg-[#D4E768] border-2 border-[#1A1E1C] p-4 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
                    <CheckCircle2 className="text-[#2D4A3E]" />
                    <span className="font-bold text-[#1A1E1C]">Email registrata. Scorri giù per la demo.</span>
                  </div>
                )}

                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                  Nessuna carta di credito richiesta • Setup in 2 minuti
                </p>
              </div>

              {/* Visual Abstract Representation */}
              <div className="relative hidden lg:block mt-4">
                {/* Card 1: The Request */}
                <div className="absolute -top-32 right-20 w-72 bg-white border-2 border-[#1A1E1C] p-6 shadow-[8px_8px_0px_#1A1E1C] z-10 rotate-[-2deg]">
                  <div className="flex items-center gap-3 mb-4 border-b border-gray-100 pb-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="font-bold text-xs">M</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400">Mario (Magazzino)</p>
                      <p className="text-[10px] text-gray-400">a: richieste@azienda.com</p>
                    </div>
                  </div>
                  <p className="font-serif italic text-lg leading-snug text-[#1A1E1C]">
                    "Ciao, servono urgentemente 3 mouse Logitech MX Master e controlla questo scontrino..."
                  </p>
                </div>

                {/* Card 2: The Logic (AI) */}
                <div className="absolute -top-4 right-0 w-80 bg-[#2D4A3E] border-2 border-[#1A1E1C] p-6 shadow-[8px_8px_0px_#D4E768] z-20">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[#D4E768] font-mono text-xs uppercase">AI Parsing...</span>
                    <Zap className="text-[#D4E768] w-4 h-4" />
                  </div>
                  <div className="space-y-2 font-mono text-xs text-white">
                    <div className="flex justify-between border-b border-white/20 pb-1">
                      <span>Item: Logitech MX</span>
                      <span className="text-[#D4E768]">Qty: 3</span>
                    </div>
                    <div className="flex justify-between border-b border-white/20 pb-1">
                      <span>Receipt: Pranzi</span>
                      <span className="text-[#D4E768]">Extracted: 45€</span>
                    </div>
                    <div className="flex justify-between border-b border-white/20 pb-1">
                      <span>Target: 120€</span>
                      <span className="text-[#D4E768]">Found: 98€</span>
                    </div>
                  </div>
                </div>

                {/* Card 3: The Result */}
                <div className="absolute top-28 right-32 w-72 bg-[#D4E768] border-2 border-[#1A1E1C] p-6 shadow-[8px_8px_0px_#1A1E1C] z-30 rotate-[2deg]">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-[#2D4A3E]" />
                    <span className="font-bold text-[#2D4A3E] uppercase text-xs">Risparmio Trovato</span>
                  </div>
                  <h3 className="text-4xl font-extrabold text-[#1A1E1C]">-22%</h3>
                  <p className="text-sm font-medium mt-1">Risparmio totale: 75€</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- LIVE DEMO SECTION (MVP) --- */}
        <section ref={demoRef} className="py-24 bg-[#1A1E1C] text-[#F3F1EA] border-t-2 border-b-2 border-[#D4E768] scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4 mb-12">
              <div className="w-12 h-12 bg-[#D4E768] border-2 border-white flex items-center justify-center">
                <Zap className="text-[#1A1E1C] w-6 h-6" />
              </div>
              <div>
                <h2 className="text-4xl font-bold text-white">Live Demo</h2>
                <p className="text-gray-400">Prova il motore AI in tempo reale. Nessun login richiesto.</p>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* INPUT TERMINAL */}
              <div className="flex flex-col gap-6">
                <div className="bg-[#2D4A3E] border-2 border-[#D4E768] p-1 shadow-[8px_8px_0px_#F3F1EA]">
                  <div className="bg-[#1A1E1C] p-4 h-full flex flex-col">
                    <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                      <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      </div>
                      <span className="text-xs font-mono text-gray-500">procurebot_v1.0.exe</span>
                    </div>

                    <div className="flex-1 font-mono text-sm space-y-4 mb-4 min-h-[200px] overflow-y-auto terminal-scroll">
                      <div className="text-[#D4E768]">
                        <span className="mr-2">$</span>
                        <span>Ingest email body:</span>
                      </div>
                      <textarea
                        value={requestText}
                        onChange={(e) => setRequestText(e.target.value)}
                        className="w-full h-32 bg-transparent text-white border-none focus:ring-0 p-0 resize-none placeholder-gray-600"
                        placeholder="Scrivi qui la tua richiesta di acquisto come se fosse una email..."
                      />
                      {logs.map((log, i) => (
                        <div key={i} className="text-gray-400 border-l-2 border-gray-700 pl-2">
                          {log}
                        </div>
                      ))}
                      {processingStep !== ProcessingStep.IDLE && processingStep !== ProcessingStep.COMPLETE && processingStep !== ProcessingStep.ERROR && (
                        <div className="flex items-center gap-2 text-[#D4E768]">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Processing...</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={runDemo}
                      disabled={processingStep !== ProcessingStep.IDLE && processingStep !== ProcessingStep.COMPLETE && processingStep !== ProcessingStep.ERROR}
                      className="w-full bg-[#D4E768] text-[#1A1E1C] font-bold py-3 hover:bg-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Avvia la demo di ProcureBot"
                      aria-busy={processingStep !== ProcessingStep.IDLE && processingStep !== ProcessingStep.COMPLETE && processingStep !== ProcessingStep.ERROR}
                    >
                      <Send size={18} aria-hidden="true" />
                      Lancia ProcureBot
                    </button>
                  </div>
                </div>
              </div>

              {/* OUTPUT REPORT */}
              <div className="relative">
                {processingStep === ProcessingStep.IDLE && (
                  <div className="h-full border-2 border-dashed border-gray-700 rounded-lg flex flex-col items-center justify-center text-gray-500 p-12 text-center">
                    <Bot size={48} className="mb-4 opacity-20" />
                    <p>In attesa di input...</p>
                    <p className="text-sm opacity-60">Scrivi una richiesta a sinistra e premi Lancia.</p>
                  </div>
                )}

                {report && (
                  <div className="bg-[#F3F1EA] border-2 border-[#1A1E1C] p-6 text-[#1A1E1C] h-full shadow-[8px_8px_0px_#2D4A3E] animate-in fade-in slide-in-from-right-4">
                    <div className="flex justify-between items-start mb-6 border-b-2 border-[#1A1E1C] pb-4">
                      <div>
                        <h3 className="text-2xl font-bold">Analisi Acquisto</h3>
                        <p className="text-sm text-gray-500">ID: #REQ-{Math.floor(Math.random() * 9000) + 1000}</p>
                      </div>
                      <div className="bg-[#2D4A3E] text-white px-3 py-1 text-sm font-bold">
                        COMPLETED
                      </div>
                    </div>

                    <div className="space-y-4 mb-6">
                      {report.items.map((item, idx) => (
                        <div key={idx} className="bg-white border border-[#1A1E1C] p-4 relative group hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-lg">{item.productName}</h4>
                              <p className="text-xs text-gray-500 mb-2">{item.supplier}</p>
                              <div className="flex gap-2 text-sm">
                                <span className="line-through text-gray-400">€{item.originalPriceEstimate}</span>
                                <span className="font-bold text-[#2D4A3E]">€{item.foundPrice}</span>
                                <span className="text-xs bg-[#D4E768] px-1 py-0.5 border border-black rounded-sm">-{item.savingsPercentage}%</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="block font-mono text-2xl font-black">€{item.savings.toFixed(2)}</span>
                              <span className="text-xs text-gray-500">risparmio (x{item.quantity})</span>
                            </div>
                          </div>
                          <div className="mt-2 text-xs bg-gray-50 p-2 border-t border-gray-100 italic text-gray-600">
                            "{item.reasoning}"
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-[#1A1E1C] text-white p-4 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <DollarSign className="text-[#D4E768]" />
                        <span className="font-bold">Risparmio Totale</span>
                      </div>
                      <span className="text-3xl font-black text-[#D4E768]">€{report.totalSavings.toFixed(2)}</span>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button type="button" className="flex-1 bg-white border-2 border-[#1A1E1C] py-2 font-bold text-sm hover:bg-gray-100" aria-label="Scarica il report in formato PDF">
                        Scarica PDF
                      </button>
                      <button
                        type="button"
                        onClick={goToLogin}
                        className="flex-1 bg-[#2D4A3E] text-white border-2 border-[#1A1E1C] py-2 font-bold text-sm hover:bg-[#1A1E1C] text-center"
                        aria-label="Approva l'ordine e procedi"
                      >
                        Approva Ordine
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* --- THE PROBLEM (80/20) --- */}
        <section id="problema" className="py-24 bg-[#1A1E1C] text-[#F3F1EA]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-4xl font-bold mb-6 text-white">
                  La trappola del <span className="text-[#D4E768] underline decoration-4 decoration-[#2D4A3E]">Tail Spend</span>.
                </h2>
                <p className="text-lg text-gray-400 leading-relaxed mb-8">
                  L'80% delle tue transazioni rappresenta solo il 20% della spesa, ma consuma l'80% del tempo del tuo team amministrativo.
                  Ora l'AI gestisce anche gli scontrini fisici che finiscono persi in fondo alle tasche.
                </p>

                <ul className="space-y-6">
                  <li className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-none border border-[#D4E768] bg-transparent flex items-center justify-center shrink-0">
                      <Clock className="text-[#D4E768]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-lg">Tempo Sprecatio</h4>
                      <p className="text-sm text-gray-400">Un buyer umano spreca 30 minuti per risparmiare 5€ su una sedia.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-none border border-[#D4E768] bg-transparent flex items-center justify-center shrink-0">
                      <TrendingDown className="text-[#D4E768]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-lg">Over-Paying</h4>
                      <p className="text-sm text-gray-400">Per fretta, si compra dal primo link disponibile, spesso a prezzo pieno.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-none border border-[#D4E768] bg-transparent flex items-center justify-center shrink-0">
                      <Receipt className="text-[#D4E768]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-lg">Lost Receipts</h4>
                      <p className="text-sm text-gray-400">Scontrini persi e spese non tracciate diventano un buco nero nei conti.</p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="relative border-2 border-[#D4E768] p-6 bg-[#2D4A3E]/10 flex flex-col items-center justify-center gap-6">
                <div className="absolute -top-4 bg-[#D4E768] text-[#1A1E1C] px-3 py-1 text-xs font-bold border border-[#1A1E1C]">
                  AUTOMAZIONE SCONTRINI
                </div>

                {/* Transformation Visual */}
                <div className="flex items-center gap-4 w-full">
                  {/* Scontrino */}
                  <div className="w-1/2 bg-white p-4 text-[10px] text-[#1A1E1C] font-mono leading-tight shadow-md rotate-[-2deg] border border-gray-200">
                    <div className="text-center font-bold border-b border-dashed border-gray-300 pb-2 mb-2">
                      Ristorante Da Mario<br />
                      12/05/2026
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between"><span>2x Pasta</span><span>24.00</span></div>
                      <div className="flex justify-between"><span>1x Acqua</span><span>2.50</span></div>
                      <div className="flex justify-between"><span>2x Caffè</span><span>3.00</span></div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-dashed border-gray-300 font-bold flex justify-between">
                      <span>TOTALE</span><span>29.50</span>
                    </div>
                  </div>

                  <ArrowRight className="text-[#D4E768] w-6 h-6 shrink-0" />

                  {/* Table */}
                  <div className="w-1/2 bg-[#1A1E1C] text-[#F3F1EA] p-2 rounded text-[10px] shadow-[4px_4px_0px_#D4E768] border border-[#D4E768] overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-[#D4E768] border-b border-gray-700 text-[8px] uppercase">
                          <th className="pb-1 pl-1">Data</th>
                          <th className="pb-1">Vendor</th>
                          <th className="pb-1">Item</th>
                          <th className="pb-1 text-center">Qty</th>
                          <th className="pb-1 text-right pr-1">€</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono text-[9px]">
                        <tr className="border-b border-gray-800/50"><td className="py-1 pl-1 text-gray-500">12/05</td><td className="text-gray-400">Da Mario</td><td>Pasta</td><td className="text-center">2</td><td className="text-right pr-1">24.0</td></tr>
                        <tr className="border-b border-gray-800/50"><td className="py-1 pl-1 text-gray-500">12/05</td><td className="text-gray-400">Da Mario</td><td>Acqua</td><td className="text-center">1</td><td className="text-right pr-1">2.5</td></tr>
                        <tr><td className="py-1 pl-1 text-gray-500">12/05</td><td className="text-gray-400">Da Mario</td><td>Caffè</td><td className="text-center">2</td><td className="text-right pr-1">3.0</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <p className="text-xs text-[#D4E768] text-center font-bold">
                  Dalla carta al dato strutturato. Automaticamente.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* --- HOW IT WORKS (Process) --- */}
        <section id="soluzione" className="py-24 bg-[#F3F1EA]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-[#1A1E1C]">Dall'Email all'Ordine. <br />In 30 secondi.</h2>
            </div>

            <div className="grid md:grid-cols-5 gap-6">
              {[
                {
                  step: "01",
                  title: "Ingestion",
                  desc: "Il dipendente invia una mail 'Mi servono 3 mouse' o carica una foto scontrino.",
                  icon: <Mail className="w-6 h-6" />
                },
                {
                  step: "02",
                  title: "AI Parsing",
                  desc: "GPT-4o estrae dati strutturati da testo e immagini.",
                  icon: <Zap className="w-6 h-6" />
                },
                {
                  step: "03",
                  title: "Scraping",
                  desc: "Il bot cerca su Amazon, eBay e fornitori B2B in tempo reale.",
                  icon: <Search className="w-6 h-6" />
                },
                {
                  step: "04",
                  title: "Analysis",
                  desc: "Analisi automatica delle spese e categorizzazione scontrini.",
                  icon: <Receipt className="w-6 h-6" />
                },
                {
                  step: "05",
                  title: "Reporting",
                  desc: "Ricevi una mail con il link al prezzo migliore o report spese.",
                  icon: <CheckCircle2 className="w-6 h-6" />
                }
              ].map((item, idx) => (
                <div key={idx} className="bg-white p-6 border-2 border-[#1A1E1C] hover:shadow-[6px_6px_0px_#2D4A3E] transition-all duration-200 cursor-default group">
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-4xl font-black text-[#1A1E1C] stroke-black text-stroke-2 group-hover:text-[#D4E768] transition-colors">
                      {item.step}
                    </span>
                    <div className="w-10 h-10 bg-[#2D4A3E] text-white flex items-center justify-center rounded-none">
                      {item.icon}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-[#1A1E1C]">{item.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- PRICING (Gain Share) --- */}
        <section id="pricing" className="py-24 bg-[#FDFCF8] relative overflow-hidden">
          {/* Decorative Circle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-[#2D4A3E]/10 rounded-full z-0"></div>

          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <h2 className="text-4xl font-bold text-[#1A1E1C] mb-6">Abbonamento Semplice</h2>
            <p className="text-xl text-gray-600 mb-12">
              Tutto incluso, nessun costo nascosto. <br />Il tuo ufficio acquisti digitale.
            </p>

            <div className="bg-[#1A1E1C] text-white p-12 brutal-border mx-auto max-w-2xl relative">
              <div className="absolute -top-4 -right-4 bg-[#D4E768] text-[#1A1E1C] px-4 py-2 font-bold border-2 border-[#1A1E1C] rotate-3">
                OFFERTA LANCIO
              </div>

              <div className="flex flex-col items-center justify-center space-y-6">
                <span className="text-6xl font-black text-[#D4E768]">49€</span>
                <p className="text-xl font-medium">/mese</p>

                <div className="w-full h-px bg-gray-700 my-8"></div>

                <ul className="text-left space-y-4 w-full max-w-xs mx-auto">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="text-[#D4E768] w-5 h-5" />
                    <span>Richieste illimitate</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="text-[#D4E768] w-5 h-5" />
                    <span>Analisi Scontrini illimitata</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="text-[#D4E768] w-5 h-5" />
                    <span>Report Export PDF/Excel</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="text-[#D4E768] w-5 h-5" />
                    <span>Assistenza prioritaria</span>
                  </li>
                </ul>

                <button
                  type="button"
                  onClick={goToLogin}
                  className="w-full bg-[#D4E768] text-[#1A1E1C] font-bold py-4 mt-8 hover:bg-white transition-colors border-2 border-transparent hover:border-[#D4E768]"
                  aria-label="Inizia a usare ProcureBot"
                >
                  Inizia ora
                </button>
              </div>
            </div>

            <p className="mt-8 text-sm text-gray-500">
              * Disdici quando vuoi. Nessun vincolo.
            </p>
          </div>
        </section>
      </main>

      {/* --- FOOTER --- */}
      <footer className="bg-[#1A1E1C] text-white border-t border-gray-800" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-6 h-6 bg-[#D4E768]"></div>
                <span className="font-bold text-xl">ProcureBot</span>
              </div>
              <p className="text-gray-400 text-sm max-w-xs">
                L'intelligenza artificiale che ottimizza il procurement delle PMI Italiane.
                Sede Legale: Milano, Italia.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-[#D4E768]">Prodotto</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Funzionalità</a></li>
                <li><a href="#" className="hover:text-white">Integrazioni</a></li>
                <li><a href="#" className="hover:text-white">Sicurezza</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-[#D4E768]">Legale</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Termini di Servizio</a></li>
                <li><a href="#" className="hover:text-white">Cookie</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex justify-between items-center text-xs text-gray-500">
            <p>© 2025 ProcureBot. Tutti i diritti riservati.</p>
            <div className="flex items-center gap-4">
              <span>Made with Python & Coffee</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
