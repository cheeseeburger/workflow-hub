const mongoose = require('mongoose');

const auditEntrySchema = new mongoose.Schema({
  action: { type: String, required: true }, // uploaded, classified, approved, rejected, synced_to_sharepoint
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  note: String,
  at: { type: Date, default: Date.now }
}, { _id: false });

const documentSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  storedPath: { type: String, required: true },
  fileHash: { type: String, index: true }, // sha256, used for duplicate detection
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  department: String,

  // ML classification results
  predictedCategory: String,
  classificationConfidence: Number,
  isDuplicate: { type: Boolean, default: false },
  duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', default: null },
  anomalyFlag: { type: Boolean, default: false },
  anomalyReason: String,

  // Workflow state
  status: {
    type: String,
    enum: ['pending_classification', 'pending_approval', 'approved', 'rejected'],
    default: 'pending_classification'
  },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewNote: String,

  // SharePoint sync
  syncedToSharePoint: { type: Boolean, default: false },
  sharePointItemId: String,

  auditTrail: [auditEntrySchema]
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);
