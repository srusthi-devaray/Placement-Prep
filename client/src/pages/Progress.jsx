import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { BarChart, Empty, FormModal, Icon, Loading, PageHeader, StatCard, fmtDate, todayStr, useResource, useToast } from '../ui.jsx';

const CATS = ['General', 'DSA', 'DBMS', 'Web', 'CS Core', 'Backend', 'HR', 'Aptitude', 'Projects', 'Mock'];
const fields = [
  { name: 'date', label: 'Date', type: 'date', required: true, default: todayStr() },
  { name: 'topic', label: 'What did you study?', required: true, placeholder: 'e.g. Binary trees, SQL joins, HR answers' },
  { name: 'category', label: 'Category', type: 'select', options: CATS },
  { name: 'hours', label: 'Hours spent', type: 'number', default: 1 },
  { name: 'notes', label: 'Notes', type: 'textarea', rows: 3 },
  { name: 'done', label: 'Topic completed', type: 'checkbox' }
];

export default function Progress() {
  const toast = useToast();
  const res = useResource('/progress');
  const [stats, setStats] = useState(null);
  const [modal, setModal] = useState(null); // null | { entry? }
  const loadStats = () => api.get(`/stats?today=${todayStr()}&tz=${new Date().getTimezoneOffset()}`).then(setStats).catch(() => {});
  useEffect(() => { loadStats(); }, []);

  if (!res.items || !stats) return <Loading />;
  const byDay = res.items.reduce((m, p) => { (m[p.date] = m[p.date] || []).push(p); return m; }, {});

  const save = (entry) => async (d) => {
    const body = { ...d, hours: Number(d.hours) || 0 };
    if (entry) await res.update(entry._id, body); else await res.create(body);
    loadStats();
  };
  const toggle = async (p) => { try { await res.update(p._id, { done: !p.done }); loadStats(); } catch (e) { toast(e.message, 'error'); } };
  const remove = async (p) => { if (confirm('Delete this entry?')) { await res.remove(p._id); loadStats(); } };

  return (
    <>
      <PageHeader icon="calendar" title="Daily Progress" subtitle="Log what you study every day to build a streak.">
        <button className="btn primary" onClick={() => setModal({})}><Icon name="plus" size={17} /> Log study session</button>
      </PageHeader>
      <div className="grid g3 mb">
        <StatCard icon="flame" tone="amber" label="Current streak" value={`${stats.streak} day${stats.streak === 1 ? '' : 's'}`} />
        <StatCard icon="clock" tone="indigo" label="Total hours" value={+stats.totalHours.toFixed(1)} />
        <StatCard icon="check" tone="green" label="Topics completed" value={stats.topicsDone} />
      </div>
      <div className="card pad mb">
        <div className="card-title">This week</div>
        <BarChart unit="h" data={stats.week.map((d) => ({ label: new Date(`${d.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' }), value: d.hours }))} />
      </div>
      <div className="card pad">
        {res.items.length ? Object.entries(byDay).map(([day, ps]) => (
          <div key={day}>
            <div className="day-head">{fmtDate(day)} · {+ps.reduce((a, p) => a + p.hours, 0).toFixed(1)} h</div>
            {ps.map((p) => (
              <div key={p._id} className={`list-item ${p.done ? 'done' : ''}`}>
                <input type="checkbox" aria-label="Completed" checked={p.done} onChange={() => toggle(p)} style={{ marginTop: 4 }} />
                <div className="grow">
                  <div className="title">{p.topic}</div>
                  <div className="row" style={{ gap: 8 }}><span className="badge tone-violet">{p.category}</span><span className="muted small">{p.hours} h</span></div>
                  {p.notes && <div className="note-body mt-s">{p.notes}</div>}
                </div>
                <button className="btn sm ghost" onClick={() => setModal({ entry: p })}>Edit</button>
                <button className="btn sm danger" aria-label="Delete" onClick={() => remove(p)}><Icon name="x" size={15} /></button>
              </div>
            ))}
          </div>
        )) : <Empty icon="calendar" title="Nothing logged yet">Add what you studied today to start your streak.</Empty>}
      </div>
      {modal && <FormModal title={modal.entry ? 'Edit entry' : 'Log study session'} fields={fields} values={modal.entry || {}} onClose={() => setModal(null)} onSubmit={save(modal.entry)} />}
    </>
  );
}
