# Workflow Hub — Enterprise Document & Approval Workflow System

A three-service system for uploading, auto-classifying, routing, and approving
business documents, with an optional sync into a live SharePoint document
library via Microsoft Graph.

## Architecture

```
frontend/     React (Vite) — upload UI, approval queue, analytics dashboard
backend/      Node.js + Express + MongoDB — auth, RBAC, workflow state, audit trail
ml-service/   Python + FastAPI + scikit-learn — document classification, anomaly detection
```

The three services are independently deployable and communicate over HTTP —
the backend calls the ML service synchronously on upload, and separately
pushes approved files to SharePoint via the Microsoft Graph API. This
mirrors how a real enterprise document pipeline is composed (app tier,
ML/inference tier, external system integration) rather than one monolith.

## What it does

1. A user uploads a document. The backend hashes it (duplicate detection)
   and calls the ML service, which classifies it (ID Proof, Certificate,
   Invoice, Contract, Payslip, Resume) and flags low-confidence or
   suspicious uploads for manual review.
2. An approver/admin reviews the queue and approves or rejects.
3. On approval, the document can be synced into a real SharePoint document
   library (via Microsoft Graph, app-only OAuth2 client-credentials flow).
4. An analytics view aggregates approval-funnel counts, category
   distribution, and average turnaround time from MongoDB.

## Setup

### 1. ML service
```
cd ml-service
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python3 train_classifier.py       # produces classifier.joblib
uvicorn main:app --port 8000
```

### 2. Backend
```
cd backend
npm install
cp .env.example .env              # fill in MONGO_URI and JWT_SECRET at minimum
npm start                         # or: npm run dev (with nodemon)
node seed.js                      # creates demo employee/approver/admin logins
```
`MONGO_URI` can point at a local `mongodb://localhost:27017/workflow_hub` or
a free MongoDB Atlas cluster — either works with no code changes.

### 3. Frontend
```
cd frontend
npm install
npm run dev                       # http://localhost:5173
```

### 4. (Optional) SharePoint sync
Register a free app at portal.azure.com → Azure Active Directory → App
registrations, grant it `Sites.ReadWrite.All` (application permission,
admin-consented), and fill in the `GRAPH_*` and `SHAREPOINT_*` values in
`backend/.env`. Without this configured, everything else still works —
approved documents just won't sync until it's set up.

## Demo logins (after running `seed.js`)
| Role     | Email             | Password    |
|----------|-------------------|-------------|
| Employee | employee@demo.com | password123 |
| Approver | approver@demo.com | password123 |
| Admin    | admin@demo.com    | password123 |

## Tech stack
React, Vite, Node.js, Express, MongoDB, Mongoose, JWT auth, Python, FastAPI,
scikit-learn, Microsoft Graph API.
<img width="1142" height="648" alt="image" src="<img width="1160" height="656" alt="image" src="https://github.com/user-attachments/assets/e0213a30-3325-4024-bb90-455d301f03c5" />
" />
<img width="1160" height="656" alt="image" src="https://github.com/user-attachments/assets/ea6be073-0e8e-4c2e-bbd3-bcf435649c44" />

