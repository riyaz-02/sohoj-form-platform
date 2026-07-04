<div align="center">
  <img src="public/logo.png" alt="Sohoj Form" width="100" />
  
  # Sohoj Form — সহজ ফর্ম
  
  **AI-powered government form filling for low-literacy rural citizens**  
  Built for: Build with Gemma: Kolkata 2026 · Track: Local Language & Inclusion

  ![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
  ![Gemma](https://img.shields.io/badge/Gemma_3-4B_Local-blue?logo=google)
  ![Ollama](https://img.shields.io/badge/Ollama-Local_Inference-orange)
</div>

---

## Problem

Millions of rural Indians are entitled to government welfare but can't access it because application forms are written in English, require literacy, and demand precise knowledge of which documents to attach. Most citizens pay local agents ₹200–500 to fill forms — agents who frequently make errors or exploit them.

## Solution

Sohoj Form lets a citizen fill any government form by:
1. Photographing the form
2. Photographing their ID documents (Aadhaar, PAN, Voter ID, bank passbook)
3. Speaking answers to remaining questions in Bengali or Hindi

**Gemma 3 4B** (running locally via Ollama) handles all three steps — no cloud, no data leaves the device, works offline.

---

## Architecture

```
User (phone camera + voice)
         |
Next.js 16 App (mobile-first, Bengali/Hindi/English)
         |
    ┌────┴────────────────────────────┐
    │  /api/analyze-form              │  ← Gemma vision: reads form image,
    │  /api/classify-document         │    extracts document fields
    │  /api/voice-turn                │  ← Gemma text: parses spoken answers
    └────┬────────────────────────────┘
         |
  Gemma 3 4B via Ollama (localhost:11434)
         |
  Filled PDF → Downloaded by user
```

## How Gemma 4 Is Used

| Step | Gemma Task | Input | Output |
|------|-----------|-------|--------|
| Form scan | Vision + OCR | Form photo | List of fields with Bengali labels |
| Document scan | Vision + extraction | Aadhaar/PAN photo | Extracted field values |
| Voice fill | Text parsing | Bengali/Hindi speech | Clean structured value |

---

## Running the Project

### Prerequisites
- Node.js 18+
- [Ollama](https://ollama.com/download) installed on your machine

### Step 1 — Clone and install
```bash
git clone https://github.com/your-username/sohoj-form-platform
cd sohoj-form-platform
npm install
```

### Step 2 — Download Gemma 3 4B (one-time, ~3.3 GB)
```bash
ollama pull gemma3:4b
```

### Step 3 — Configure environment
Create `.env.local` in the project root:
```env
# Ollama (required for AI features)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=gemma3:4b

# Firebase (required for phone OTP login)
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Database
DATABASE_URL=your_neon_postgres_url
BETTER_AUTH_SECRET=your_secret
```

> **Note:** If you skip Firebase config, the app runs in demo mode — OTP is shown on screen, AI still works fully.

### Step 4 — Start

Open two terminals:
```bash
# Terminal 1 — keep open
ollama serve

# Terminal 2
npm run dev
```

> **GPU error?** If you see a CUDA error, run Ollama in CPU-only mode instead:
> ```powershell
> # Windows PowerShell
> $env:OLLAMA_NUM_GPU="0"; ollama serve
> ```
> ```bash
> # macOS / Linux
> OLLAMA_NUM_GPU=0 ollama serve
> ```
> CPU inference takes 30–90 seconds per request — acceptable for demo purposes.

Open **http://localhost:3000**

### Step 5 — Test AI extraction
1. Login with any 10-digit number (demo mode shows OTP on screen)
2. Select a form (e.g. Krishak Bandhu)
3. Upload a clear photo of any government form
4. Upload a photo of an Aadhaar or PAN card
5. Speak answers to the remaining questions in Bengali or English
6. Download the filled form

> The first Gemma inference takes 30–90 seconds on CPU. Subsequent calls are faster.

---

## Supported Forms
- Annapurna Bhandar (PDS registration)
- Ayushman Bharat (health insurance)
- Ration Card
- Jan Dhan Bank Account
- Krishak Bandhu (farmer welfare, West Bengal)

## Tech Stack
- **Frontend:** Next.js 16, TypeScript, CSS
- **AI:** Gemma 3 4B via Ollama (local inference)
- **Auth:** Firebase Phone OTP
- **Database:** Neon PostgreSQL + Better Auth
- **Output:** jsPDF (client-side PDF generation)

## Project Structure
```
app/
  page.tsx                  # Landing page
  login/page.tsx            # Phone OTP login
  dashboard/page.tsx        # Form selection
  forms/[formId]/page.tsx   # Multi-step form
  api/
    analyze-form/route.ts   # Gemma: form image OCR
    classify-document/      # Gemma: document extraction
    voice-turn/             # Gemma: voice field parsing
    generate-output/        # PDF generation
    tts/                    # Text-to-speech
components/
  step-1-upload.tsx         # Upload form photo
  step-2-documents.tsx      # Upload ID documents
  step-3-voice.tsx          # Voice Q&A
  step-4-review.tsx         # Review & edit
  step-5-done.tsx           # Download filled form
lib/
  gemma.ts                  # Ollama + Gemini client (with fallback)
```

---

## License
MIT © 2026 Sohoj Form
