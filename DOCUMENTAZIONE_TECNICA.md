# Documentazione Tecnica - ProcureBot

Questa documentazione descrive l'architettura, i flussi di dati e i meccanismi interni dell'applicazione ProcureBot, per facilitarne la manutenzione e lo sviluppo futuro.

---

## Indice

1. [Architettura di Sistema](#1-architettura-di-sistema)
2. [Modello Dati (Database Supabase)](#2-modello-dati-database-supabase)
3. [Componenti Principali (Frontend)](#3-componenti-principali-frontend)
4. [Flussi di Lavoro Principali (Workflows)](#4-flussi-di-lavoro-principali-workflows)
5. [Integrazioni Esterne (API)](#5-integrazioni-esterne-api)
6. [Sicurezza e Gestione Errori](#6-sicurezza-e-gestione-errori)

---

## 1. Architettura di Sistema

ProcureBot è una Single Page Application (SPA) basata su **React** e **TypeScript**, costruita con il bundler **Vite**.
Il backend è serverless (BaaS - Backend as a Service) fornito da **Supabase**, che gestisce l'Autenticazione (Auth), il Database (PostgreSQL) e lo Storage (immagini).

Lo stack tecnologico è il seguente:

- **Frontend:** React 18, React Router DOM (navigazione), TailwindCSS (styling), Lucide React (icone).
- **Backend:** Supabase (PostgreSQL, Row-Level Security, Storage, Auth).
- **Intelligenza Artificiale / Ricerca:** OpenAI API (riconoscimento ottico scontrini tramite Vision), Serper API (motore di ricerca prodotti per gli acquisti).

---

## 2. Modello Dati (Database Supabase)

Tutte le tabelle sono protette con **Row-Level Security (RLS)**, garantendo che ogni utente (`user_id`) possa leggere, aggiornare o cancellare solamente i propri dati.

### Tabelle Principali

- **`requests`** (Richieste di Acquisto)
  - Memorizza ciò che gli utenti desiderano acquistare.
  - _Campi chiave:_ `id`, `user_id`, `product_name`, `quantity`, `target_price`, `status` (pending, action_required, approved, rejected), `assigned_to` (foreign key verso `team_members`).

- **`sourcing_options`** (Opzioni di Sourcing)
  - Memorizza i risultati proposti dall'agente di ricerca (Serper) per ogni specifica `request`.
  - _Campi chiave:_ `id`, `request_id`, `vendor`, `product_title`, `price`, `url`, `image_url`, `is_selected`.

- **`receipts`** (Scontrini/Ricevute)
  - Memorizza i dati globali degli scontrini importati/analizzati dall'utente.
  - _Campi chiave:_ `id`, `user_id`, `merchant_name`, `total_amount`, `currency`, `receipt_date`, `status` (processing, analyzed, completed, failed), `image_url`, `raw_data` (JSON con i dati crudi estratti da OpenAI).

- **`receipt_items`** (Singoli elementi negli Scontrini)
  - Riga per ogni prodotto acquistato in uno scontrino.
  - _Campi chiave:_ `id`, `receipt_id`, `description`, `quantity`, `price`, `category`.

- **`team_members`** (Membri del Team)
  - Anagrafica e budget dei dipendenti/collaboratori.
  - _Campi chiave:_ `id`, `user_id`, `name`, `email`, `phone`, `identifier`, `budget`.

---

## 3. Componenti Principali (Frontend)

L'interfaccia si sviluppa integralmente a partire dal componente **`Dashboard.tsx`**, che agisce da state manager centrale per le diverse viste (Dashboard, History, Persone, Statistiche).

### Views (Pagine)

- **`DashboardTable.tsx`**: Tabella centrale delle richieste attive e recenti.
- **`TeamMembersView.tsx`**: Tabella CRUD per visualizzare e gestire l'anagrafica e il budget del team.
- **`StatisticsView.tsx`**: Pagina che incrocia le spese delle richieste approvate con quelle degli scontrini, fornendo un report del "Budget Team" e una vista unificata della spesa aziendale aggregata per categoria.
- **`ReceiptsView.tsx`**: Vista a griglia degli scontrini confermati, con esportazione dati in CSV e funzionalità di ricerca.

### Modali (Form & Interazione)

- **`RequestForm.tsx`**: Interfaccia per inserire una nuova richiesta di spesa. Contiene la logica per chiamare la ricerca asincrona su Google Shopping via Serper API.
- **`OptionSelectionModal.tsx`**: Quando la ricerca Serper trova prodotti, questa modale mostra le opzioni all'utente, permettendogli di scegliere il miglior preventivo.
- **`ReceiptUploadModal.tsx` / `ReceiptReviewModal.tsx`**: Flusso in due step per il caricamento dell'immagine dello scontrino (con preview), elaborazione via OpenAI, e infine revisione e correzione manuale (form con gli elementi JSON parserizzati) prima del salvataggio.
- **`TeamMemberFormModal.tsx`**: Form protetto da controlli base per la gestione dei membri aziendali (budget incluso).

---

## 4. Flussi di Lavoro Principali (Workflows)

### Flusso 1: Creazione Richiesta (Smart Sourcing Agent)

1. L'utente apre il `RequestForm` e inserisce il prodotto, il prezzo obiettivo, la quantità e optionally l'assegnatario.
2. Alla pressione di "Launch Sourcing Agent", viene subita emessa una insert nella tabella `requests` su Supabase.
3. Il form viene immediatamente chiuso e la UI si aggiorna ("PENDING").
4. In background (via `.then`), l'app chiama la funzione `searchGoogleShopping` (in `lib/serper.ts`) passandogli il nome del prodotto.
5. I risultati ricevuti vengono sanificati, i prezzi estratti dalle stringhe e salvati in batch nella tabella `sourcing_options`. Il record originale `request` viene marcato come `"ACTION_REQUIRED"`.
6. L'utente clicca su "Review Options" nella Dashboard e apre `OptionSelectionModal`, dal quale può approvare la via economica migliore; questo segnerà l'opzione come vincitrice ed eliminerà le altre, ponendo la `request` come `"APPROVED"`.

### Flusso 2: Importazione Scontrini (AI OCR)

1. L'utente apre `ReceiptUploadModal` e sceglie una foto/immagine.
2. Il sistema riduce/comprime l'immagine localmente tramite Canvas HTML (trasformazione in toni di grigio, max dimensionamento per risparmiare risorse e limiti API). L'immagine generata in base64 è caricata su Supabase Storage.
3. Viene creata la riga su `receipts` in stato `processing`.
4. Viene chiamata la funzione `analyzeReceipt` (`lib/receipt_analyzer.ts`): una richiesta OpenAI Chat vision ("gpt-4o-mini") con un prompt per estrazione JSON strutturata in categorie e totali.
5. Alla conclusione, l'applizione aggiorna lo scontrino nel DB con lo status `"analyzed"`, integrando i dati crudi (`raw_data`).
6. L'utente dalla Dashboard, vedendo la sezione "Verifica dati" (`PendingReceiptsList`), apre il `ReceiptReviewModal`, può variare dati eventualmente fraintesi e approva. Il sistema salva i dati su `receipts` portandolo su `"completed"`, e cicla su `receipt_items` immettendo tutte le merci scontrinate.

---

## 5. Integrazioni Esterne (API)

Tutti i servizi API sono localizzati nella cartella `lib/`.

- **`lib/supabase.ts`**: Inizializza il client di Supabase usando le credenziali in `.env.local` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- **`lib/serper.ts`**: Crea richieste fetch alla document-standard route in JSON passandogli come Header `X-API-KEY`.
- **`lib/receipt_analyzer.ts`**: Integra la libreria NPM ufficale `openai`.

---

## 6. Sicurezza e Gestione Errori

### Resilience

Il sistema è progettato per continuare a funzionare anche se porzioni di flusso asincrono presentano problematiche.

- In `Dashboard.tsx` i fetch iniziali usano un pattern `Promise.allSettled` per mitigare fallimenti indipendenti: se le ricevute non caricano, l'utente può ugualmente operare sulle richieste normali.
- Tutti i trigger esterni (chiamata OpenAI per scontrino, o chiamata Serper) sono avvolti da `try...catch` che, in caso di errore (timeout / limite API o chiavi assenti - le eccezioni non bloccano il thread principale), fall-backano cambiando lo stato in DB (es. `"failed"`) visualizzabile dall'utente sotto forma di modale/toast visuale ("Errore! Chiave OpenAI mancante").

### Sicurezza (Credenziali)

Tutte le chiavi sensibili (`VITE_SERPER_API_KEY`, `VITE_OPENAI_API_KEY`) sono purificate via file `.env.local` isolato e tracciato fuori base via `.gitignore`.
Nessuna password in chiaro è visualizzata nei logs (anche eliminati eventuali print accidentali).
Le API Supabase beneficiano del servizio RLS in DB, la qual cosa implica che un attaccante, perfino avendo l'ANON KEY, non potrebbe eseguire il fetch neppure delle proprie tabelle in difetto di un token JWT d'utente loggato autorizzato.
