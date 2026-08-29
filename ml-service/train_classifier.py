"""
Trains a lightweight TF-IDF + Logistic Regression classifier that tags
uploaded documents by category, based on filename and any extracted text.

Run once to produce classifier.joblib, which main.py loads at request time.
In a real deployment this would train on actual historical filenames/OCR
text from the document store instead of the synthetic set below.
"""
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

TRAINING_DATA = [
    # ID Proof
    ("aadhar card front back", "ID Proof"),
    ("passport scan copy", "ID Proof"),
    ("pan card number", "ID Proof"),
    ("driving license id", "ID Proof"),
    ("voter id card", "ID Proof"),
    ("national identity card", "ID Proof"),

    # Certificate
    ("degree certificate convocation", "Certificate"),
    ("course completion certificate", "Certificate"),
    ("internship completion letter", "Certificate"),
    ("marksheet transcript semester", "Certificate"),
    ("training certification badge", "Certificate"),
    ("diploma certificate award", "Certificate"),

    # Invoice
    ("invoice payment due amount", "Invoice"),
    ("purchase order billing", "Invoice"),
    ("vendor invoice tax gst", "Invoice"),
    ("receipt transaction paid", "Invoice"),
    ("fee receipt tuition", "Invoice"),

    # Contract
    ("employment contract agreement", "Contract"),
    ("offer letter terms conditions", "Contract"),
    ("nda non disclosure agreement", "Contract"),
    ("vendor service agreement", "Contract"),
    ("lease rental agreement", "Contract"),

    # Payslip
    ("payslip salary slip month", "Payslip"),
    ("salary statement net pay", "Payslip"),
    ("compensation breakup form16", "Payslip"),

    # Resume
    ("resume cv curriculum vitae", "Resume"),
    ("candidate profile experience", "Resume"),
]


def main():
    texts = [t for t, _ in TRAINING_DATA]
    labels = [l for _, l in TRAINING_DATA]

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1)),
        ("clf", LogisticRegression(max_iter=1000))
    ])
    pipeline.fit(texts, labels)

    joblib.dump(pipeline, "classifier.joblib")
    print(f"Trained on {len(texts)} examples across {len(set(labels))} categories.")
    print("Saved classifier.joblib")


if __name__ == "__main__":
    main()
