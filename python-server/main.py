"""
Sohoj Form — Gemma 4 Inference Server
======================================
Runs Gemma 4 locally from Kaggle and exposes REST endpoints that
the Next.js app calls instead of Google AI Studio.

Architecture:
  Next.js (port 3000)  →  FastAPI (port 8000)  →  Gemma 4 (local GPU/CPU)

Endpoints:
  POST /analyze-form        — read form image, detect blank fields
  POST /classify-document   — read doc image, extract field values
  POST /voice-turn          — parse spoken answer into a clean value
  GET  /health              — liveness check

Requirements:
  pip install -r requirements.txt

Usage:
  python main.py

  # First run downloads the model from Kaggle (~12GB) — takes 10-20 min
  # Subsequent runs load from cache instantly
"""

import base64
import io
import json
import os
from contextlib import asynccontextmanager
from typing import Optional

import torch
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoProcessor

# ─── Config ──────────────────────────────────────────────────────────────────

MODEL_ID  = os.getenv("GEMMA_MODEL", "google/gemma-4-12b")  # or gemma-4-27b if you have VRAM
PORT      = int(os.getenv("PORT", "8000"))
DEVICE    = "cuda" if torch.cuda.is_available() else "cpu"
DTYPE     = torch.bfloat16 if torch.cuda.is_available() else torch.float32

# ─── Model singleton ──────────────────────────────────────────────────────────

processor = None
model = None


def load_model():
    global processor, model
    print(f"[gemma] Loading {MODEL_ID} on {DEVICE}...")

    try:
        import kagglehub
        model_path = kagglehub.model_download(f"google/gemma-4/transformers/{MODEL_ID.split('/')[-1]}")
        print(f"[gemma] Kaggle model path: {model_path}")
    except Exception:
        # Fall back to HuggingFace Hub
        model_path = MODEL_ID
        print(f"[gemma] Kaggle download failed, falling back to HuggingFace: {model_path}")

    processor = AutoProcessor.from_pretrained(model_path)
    model = AutoModelForCausalLM.from_pretrained(
        model_path,
        dtype=DTYPE,
        device_map="auto",
        low_cpu_mem_usage=True,
    )
    model.eval()
    print(f"[gemma] Model loaded! Device: {DEVICE}, dtype: {DTYPE}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_model()
    yield
    print("[gemma] Shutting down.")


# ─── App ─────────────────────────────────────────────────────────────────────

app = FastAPI(title="Sohoj Form — Gemma 4 Server", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Helpers ─────────────────────────────────────────────────────────────────

def decode_image(data_url: str) -> Image.Image:
    """Convert a base64 data URL to a PIL Image."""
    if "," in data_url:
        data_url = data_url.split(",")[1]
    raw = base64.b64decode(data_url)
    return Image.open(io.BytesIO(raw)).convert("RGB")


def gemma_generate(
    prompt: str,
    image: Optional[Image.Image] = None,
    max_new_tokens: int = 1024,
    thinking: bool = False,
) -> str:
    """Run one Gemma 4 inference and return the text response."""
    messages = [
        {"role": "system", "content": "You are a helpful AI assistant for Indian government forms. Always respond with valid JSON when asked."},
        {"role": "user", "content": prompt if image is None else [
            {"type": "image", "image": image},
            {"type": "text",  "text": prompt},
        ]},
    ]

    text = processor.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
        enable_thinking=thinking,
    )

    if image:
        inputs = processor(text=text, images=[image], return_tensors="pt").to(DEVICE)
    else:
        inputs = processor(text=text, return_tensors="pt").to(DEVICE)

    input_len = inputs["input_ids"].shape[-1]

    with torch.no_grad():
        outputs = model.generate(**inputs, max_new_tokens=max_new_tokens, do_sample=False)

    decoded = processor.decode(outputs[0][input_len:], skip_special_tokens=True)
    return decoded.strip()


def safe_json(text: str):
    """Parse JSON from model output, stripping code fences."""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1]
        text = text.rsplit("```", 1)[0]
    text = text.strip()
    try:
        return json.loads(text)
    except Exception:
        # Try to extract JSON object
        import re
        m = re.search(r'\{[\s\S]*\}', text)
        if m:
            try:
                return json.loads(m.group())
            except Exception:
                pass
    return None


# ─── Request/Response models ─────────────────────────────────────────────────

class AnalyzeFormRequest(BaseModel):
    images: list[str]          # base64 data URLs
    imageCount: int = 1


class ClassifyDocumentRequest(BaseModel):
    imageBase64: str            # base64 data URL
    expectedType: str           # aadhaar | pan | voter-id | land-certificate | bank-statement


class VoiceTurnRequest(BaseModel):
    currentFieldId: str
    currentFieldName: str
    currentFieldBengali: str
    fieldType: str = "text"
    userSpeech: str
    remainingFields: list = []


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": MODEL_ID,
        "device": DEVICE,
        "model_loaded": model is not None,
    }


@app.post("/analyze-form")
async def analyze_form(req: AnalyzeFormRequest):
    """Read a form image and detect all blank fields."""
    if not req.images:
        raise HTTPException(status_code=400, detail="No images provided")

    image = decode_image(req.images[0])

    prompt = """Analyze this Indian government application form image.
Identify ALL blank fields that the applicant needs to fill in.

Return ONLY a JSON object in this exact format (no explanation):
{
  "fields": [
    {
      "id": "unique_snake_case_id",
      "fieldName": "English label from the form",
      "bengaliName": "Bengali translation of the label",
      "currentValue": "",
      "fieldType": "text|date|number|checkbox",
      "required": true,
      "category": "personal|land|financial|other"
    }
  ]
}

Include EVERY blank field. Translate all labels to Bengali accurately.
Categories: personal (name/DOB/address/Aadhaar), land (plot/area), financial (bank/income), other."""

    try:
        response = gemma_generate(prompt, image=image)
        parsed = safe_json(response)

        if not parsed or "fields" not in parsed:
            raise ValueError("Could not parse response")

        return {
            "success": True,
            "fields": parsed["fields"],
            "fieldCount": len(parsed["fields"]),
            "model": MODEL_ID,
        }
    except Exception as e:
        print(f"[analyze-form] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/classify-document")
async def classify_document(req: ClassifyDocumentRequest):
    """Read a document image, verify its type, and extract fields."""
    image = decode_image(req.imageBase64)

    prompt = f"""Analyze this Indian identity/financial document image.

Expected document type: {req.expectedType}

Tasks:
1. Identify what type of document this actually is
2. Check if it matches the expected type "{req.expectedType}"
3. Extract ALL visible field values

Return ONLY a JSON object (no explanation):
{{
  "detectedType": "aadhaar|pan|voter-id|land-certificate|bank-statement|unknown",
  "isCorrect": true,
  "confidence": 0.95,
  "extractedData": [
    {{
      "id": "unique_id",
      "fieldName": "Field Name in English",
      "bengaliName": "Bengali translation",
      "value": "extracted value",
      "confidence": 0.9,
      "category": "personal|land|financial|other",
      "needsReview": false,
      "source": "document",
      "documentType": "{req.expectedType}"
    }}
  ]
}}

For Aadhaar: extract number, name, DOB, address, gender.
For PAN: extract PAN number, name, DOB, father's name.
For Voter ID: extract voter ID number, name, father's name, address.
For land certificate: extract area, type, khasra number, village.
For bank statement: extract account number (mask middle digits), IFSC, bank name, holder name.
Set needsReview=true if value is unclear or confidence < 0.8."""

    try:
        response = gemma_generate(prompt, image=image)
        parsed = safe_json(response)

        if not parsed:
            raise ValueError("Could not parse response")

        return {
            "success": True,
            "isCorrect": parsed.get("isCorrect", True),
            "detectedType": parsed.get("detectedType", req.expectedType),
            "confidence": parsed.get("confidence", 0.8),
            "extractedData": parsed.get("extractedData", []),
            "model": MODEL_ID,
        }
    except Exception as e:
        print(f"[classify-document] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/voice-turn")
async def voice_turn(req: VoiceTurnRequest):
    """Parse a spoken answer and extract a clean field value."""
    prompt = f"""You are helping fill an Indian government form.

Field: "{req.currentFieldName}" ({req.currentFieldBengali})
Field type: {req.fieldType}
What the applicant said: "{req.userSpeech}"

Extract a clean, properly formatted value for this field.
- Numbers/amounts: digits only (e.g. "seventy two thousand" → "72000")  
- Dates: DD/MM/YYYY format
- Names: Title Case
- IDs: exact number/code only
- Income: "₹X,XXX" format

Return ONLY JSON (no explanation):
{{
  "extractedValue": "the clean value",
  "needsClarification": false,
  "clarificationQuestion": null
}}"""

    try:
        response = gemma_generate(prompt, thinking=False)
        parsed = safe_json(response)

        extracted = parsed.get("extractedValue", req.userSpeech) if parsed else req.userSpeech

        # Find next field
        fields = req.remainingFields or []
        current_idx = next((i for i, f in enumerate(fields) if f.get("id") == req.currentFieldId), -1)
        next_field = fields[current_idx + 1] if current_idx >= 0 and current_idx + 1 < len(fields) else None

        return {
            "success": True,
            "fieldId": req.currentFieldId,
            "extractedValue": extracted,
            "needsClarification": parsed.get("needsClarification", False) if parsed else False,
            "nextQuestion": {
                "en": next_field.get("questionEn", ""),
                "bn": next_field.get("questionBn", ""),
                "fieldId": next_field.get("id"),
            } if next_field else None,
            "isComplete": next_field is None,
            "model": MODEL_ID,
        }
    except Exception as e:
        print(f"[voice-turn] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Entry point ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")
