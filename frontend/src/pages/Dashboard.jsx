import { useEffect, useState } from 'react';
import api from '../api';

function StatusBadge({ status }) {
  const map = {
    approved: 'badge-approved',
    rejected: 'badge-rejected',
    pending_approval: 'badge-pending',
    pending_classification: 'badge-pending'
  };
  return <span className={`badge ${map[status] || ''}`}>{status.replace(/_/g, ' ')}</span>;
}

export default function Dashboard() {
  const [docs, setDocs] = useState([]);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const canReview = user.role === 'approver' || user.role === 'admin';

  async function loadDocs() {
    const { data } = await api.get('/documents');
    setDocs(data);
  }

  useEffect(() => { loadDocs(); }, []);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    form.append('department', user.department || 'General');
    try {
      await api.post('/documents/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setFile(null);
      await loadDocs();
    } finally {
      setUploading(false);
    }
  }

  async function review(id, decision) {
    await api.patch(`/documents/${id}/review`, { decision });
    await loadDocs();
  }

  async function syncToSharePoint(id) {
    try {
      await api.post(`/documents/${id}/sync-sharepoint`);
      await loadDocs();
    } catch (err) {
      alert(err.response?.data?.error || 'Sync failed');
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h3>Upload a document</h3>
        <form onSubmit={handleUpload}>
          <input type="file" onChange={(e) => setFile(e.target.files[0])} />
          <button type="submit" disabled={!file || uploading}>{uploading ? 'Uploading...' : 'Upload'}</button>
        </form>
      </div>

      <div className="card">
        <h3>{canReview ? 'All documents' : 'Your documents'}</h3>
        <table>
          <thead>
            <tr>
              <th>File</th><th>Category</th><th>Confidence</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d._id}>
                <td>{d.filename}</td>
                <td>
                  {d.predictedCategory}
                  {d.anomalyFlag && <span className="badge badge-anomaly">anomaly</span>}
                  {d.isDuplicate && <span className="badge badge-anomaly">duplicate</span>}
                </td>
                <td>{d.classificationConfidence != null ? (d.classificationConfidence * 100).toFixed(0) + '%' : '-'}</td>
                <td><StatusBadge status={d.status} /></td>
                <td>
                  {canReview && d.status === 'pending_approval' && (
                    <>
                      <button onClick={() => review(d._id, 'approved')} style={{ marginRight: 6 }}>Approve</button>
                      <button onClick={() => review(d._id, 'rejected')} style={{ background: '#dc2626' }}>Reject</button>
                    </>
                  )}
                  {canReview && d.status === 'approved' && !d.syncedToSharePoint && (
                    <button onClick={() => syncToSharePoint(d._id)}>Sync to document store</button>
                  )}
                  {d.syncedToSharePoint && <span style={{ fontSize: 12, color: '#059669' }}>Synced ✓</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
