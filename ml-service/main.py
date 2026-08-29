"""
ML microservice for the Workflow Hub.

POST /classify  -> tags a document by category (TF-IDF + Logistic Regression)
                    and flags low-confidence / suspicious uploads as anomalies.

Kept as a separate FastAPI service (not baked into the Node backend) so it
can be scaled, retrained, or swapped independently -- the same separation
of concerns a real enterprise copilot / document pipeline would use.
"""
import os
import re
from typing import Optional

import joblib
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Workflow Hub ML Service")

MODEL_PATH = os.path.join(os.path.dirname(__file__), "classifier.joblib")
_model = None

SUSPICIOUS_EXTENSIONS = {".exe", ".bat", ".sh", ".js", ".vbs", ".scr"}
CONFIDENCE_THRESHOLD = 0.35


def get_model():
    global _model
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise RuntimeError(
                "classifier.joblib not found - run `python train_classifier.py` first"
            )
        _model = joblib.load(MODEL_PATH)
    return _model


class ClassifyRequest(BaseModel):
    text: Optional[str] = ""
    filename: str


class ClassifyResponse(BaseModel):
    category: str
    confidence: float
    anomaly: bool
    anomaly_reason: Optional[str] = None


def clean_filename_for_model(filename: str) -> str:
    # Strip extension and timestamp prefixes, turn separators into spaces
    # so "1719999_Aadhar_Card_front.png" -> "aadhar card front"
    name = re.sub(r"\.[a-zA-Z0-9]+$", "", filename)
    name = re.sub(r"^\d+_?", "", name)
    name = re.sub(r"[_\-]+", " ", name)
    return name.lower().strip()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/classify", response_model=ClassifyResponse)
def classify(req: ClassifyRequest):
    model = get_model()

    ext = os.path.splitext(req.filename)[1].lower()
    if ext in SUSPICIOUS_EXTENSIONS:
        return ClassifyResponse(
            category="Unclassified",
            confidence=0.0,
            anomaly=True,
            anomaly_reason=f"Disallowed file extension: {ext}"
        )

    combined_text = f"{clean_filename_for_model(req.filename)} {req.text or ''}".strip()
    if not combined_text:
        return ClassifyResponse(
            category="Unclassified", confidence=0.0, anomaly=True,
            anomaly_reason="No text or filename signal to classify"
        )

    probs = model.predict_proba([combined_text])[0]
    classes = model.classes_
    best_idx = probs.argmax()
    category = classes[best_idx]
    confidence = round(float(probs[best_idx]), 3)

    anomaly = confidence < CONFIDENCE_THRESHOLD
    reason = "Low classification confidence - route to manual review" if anomaly else None

    return ClassifyResponse(
        category=category, confidence=confidence, anomaly=anomaly, anomaly_reason=reason
    )
