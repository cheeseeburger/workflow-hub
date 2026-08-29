const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const Document = require('../models/Document');
const { requireAuth, requireRole } = require('../middleware/auth');
const { classifyDocument } = require('../services/mlClient');
const { uploadToSharePoint } = require('../services/sharePointClient');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

function sha256File(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// POST /api/documents/upload
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const fileHash = sha256File(req.file.path);
    const duplicate = await Document.findOne({ fileHash });

    const doc = await Document.create({
      filename: req.file.originalname,
      storedPath: req.file.path,
      fileHash,
      uploadedBy: req.user.id,
      department: req.body.department || 'General',
      isDuplicate: !!duplicate,
      duplicateOf: duplicate ? duplicate._id : null,
      status: 'pending_classification',
      auditTrail: [{ action: 'uploaded', actor: req.user.id }]
    });

    // Fire the ML classification synchronously so the client gets a
    // result immediately; a production version would queue this.
    const result = await classifyDocument(req.file.originalname, req.file.originalname);

    doc.predictedCategory = result.category;
    doc.classificationConfidence = result.confidence;
    doc.anomalyFlag = !!result.anomaly;
    doc.anomalyReason = result.anomaly_reason;
    doc.status = 'pending_approval';
    doc.auditTrail.push({ action: 'classified', note: `${result.category} (${result.confidence})` });
    await doc.save();

    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/documents  -- list, filterable by status/department
router.get('/', requireAuth, async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.department) filter.department = req.query.department;
  // employees only see their own uploads; approvers/admins see everything
  if (req.user.role === 'employee') filter.uploadedBy = req.user.id;

  const docs = await Document.find(filter).sort({ createdAt: -1 }).populate('uploadedBy', 'name email');
  res.json(docs);
});

// PATCH /api/documents/:id/review  -- approve or reject
router.patch('/:id/review', requireAuth, requireRole('approver', 'admin'), async (req, res) => {
  try {
    const { decision, note } = req.body; // decision: 'approved' | 'rejected'
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ error: 'decision must be approved or rejected' });
    }

    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    doc.status = decision;
    doc.reviewedBy = req.user.id;
    doc.reviewNote = note || '';
    doc.auditTrail.push({ action: decision, actor: req.user.id, note });
    await doc.save();

    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/documents/:id/sync-sharepoint  -- push approved doc to SharePoint
router.post('/:id/sync-sharepoint', requireAuth, requireRole('approver', 'admin'), async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (doc.status !== 'approved') {
      return res.status(400).json({ error: 'Only approved documents can be synced' });
    }

    const result = await uploadToSharePoint(doc.storedPath, doc.filename, doc.predictedCategory);
    doc.syncedToSharePoint = true;
    doc.sharePointItemId = result.sharePointItemId;
    doc.auditTrail.push({ action: 'synced_to_sharepoint', actor: req.user.id });
    await doc.save();

    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: `SharePoint sync failed: ${err.message}` });
  }
});

// GET /api/documents/analytics  -- approval funnel + turnaround metrics
router.get('/analytics/summary', requireAuth, requireRole('approver', 'admin'), async (req, res) => {
  const [byStatus, byCategory, avgTurnaround] = await Promise.all([
    Document.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Document.aggregate([{ $group: { _id: '$predictedCategory', count: { $sum: 1 } } }]),
    Document.aggregate([
      { $match: { status: { $in: ['approved', 'rejected'] } } },
      {
        $project: {
          hours: {
            $divide: [{ $subtract: ['$updatedAt', '$createdAt'] }, 1000 * 60 * 60]
          }
        }
      },
      { $group: { _id: null, avgHours: { $avg: '$hours' } } }
    ])
  ]);

  res.json({
    byStatus,
    byCategory,
    avgTurnaroundHours: avgTurnaround[0]?.avgHours || 0
  });
});

module.exports = router;
