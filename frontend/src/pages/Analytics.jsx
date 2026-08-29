import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../api';

const COLORS = ['#0f172a', '#0f766e', '#2563eb', '#b45309', '#dc2626', '#7c3aed'];

export default function Analytics() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api.get('/documents/analytics/summary').then(({ data }) => setSummary(data));
  }, []);

  if (!summary) return <div className="container">Loading analytics...</div>;

  const statusData = summary.byStatus.map((s) => ({ name: s._id.replace(/_/g, ' '), count: s.count }));
  const categoryData = summary.byCategory.map((c) => ({ name: c._id || 'Unclassified', value: c.count }));

  return (
    <div className="container">
      <div className="card">
        <h3>Approval funnel</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={statusData}>
            <XAxis dataKey="name" fontSize={12} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#0f766e" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h3>Documents by category</h3>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={categoryData} dataKey="value" nameKey="name" outerRadius={100} label>
              {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Legend /><Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h3>Average turnaround</h3>
        <p style={{ fontSize: 28, fontWeight: 700, color: '#0f766e' }}>
          {summary.avgTurnaroundHours.toFixed(1)} hrs
        </p>
        <p style={{ color: '#666', fontSize: 13 }}>Upload → approved/rejected, averaged across all reviewed documents.</p>
      </div>
    </div>
  );
}
