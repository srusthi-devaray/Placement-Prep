import { useState } from 'react';
import { Empty, FormModal, Icon, Loading, PageHeader, fmtDate, todayStr, useResource, useToast } from '../ui.jsx';

const fields = [
  { name: 'title', label: 'Goal', required: true, placeholder: 'e.g. Finish 50 DSA problems' },
  { name: 'company', label: 'Company (optional)', placeholder: 'e.g. Infosys' },
  { name: 'targetDate', label: 'Target date', type: 'date' },
  { name: 'done', label: 'Completed', type: 'checkbox' }
];

export default function Goals() {
  const toast = useToast();
  const res = useResource('/goals');
  const [modal, setModal] = useState(null);
  if (!res.items) return <Loading />;

  const done = res.items.filter((g) => g.done).length;
  const pct = res.items.length ? Math.round((done / res.items.length) * 100) : 0;

  return (
    <>
      <PageHeader icon="target" title="Goal Tracker" subtitle="Set company-wise or topic-wise goals with deadlines.">
        <button className="btn primary" onClick={() => setModal({})}><Icon name="plus" size={17} /> Add goal</button>
      </PageHeader>
      <div className="card pad mb">
        <div className="row between small" style={{ marginBottom: 8 }}><b>Overall progress</b><span>{done} of {res.items.length} done ({pct}%)</span></div>
        <div className="progress-bar"><i style={{ width: `${pct}%` }} /></div>
      </div>
      <div className="card pad">
        {res.items.length ? res.items.map((g) => {
          const late = !g.done && g.targetDate && g.targetDate < todayStr();
          return (
            <div key={g._id} className={`list-item ${g.done ? 'done' : ''}`}>
              <input type="checkbox" aria-label="Completed" checked={g.done} style={{ marginTop: 4 }} onChange={async () => { try { await res.update(g._id, { done: !g.done }); } catch (e) { toast(e.message, 'error'); } }} />
              <div className="grow">
                <div className="title">{g.title}</div>
                <div className="row" style={{ gap: 8 }}>
                  {g.company && <span className="badge tone-indigo">{g.company}</span>}
                  {g.targetDate && <span className={`small ${late ? 'overdue' : 'muted'}`}>{late ? 'Overdue · ' : 'Due '}{fmtDate(g.targetDate)}</span>}
                </div>
              </div>
              <button className="btn sm ghost" onClick={() => setModal({ goal: g })}>Edit</button>
              <button className="btn sm danger" aria-label="Delete" onClick={async () => { if (confirm('Delete this goal?')) await res.remove(g._id); }}><Icon name="x" size={15} /></button>
            </div>
          );
        }) : <Empty icon="target" title="No goals yet">Try "Complete DBMS revision by Friday".</Empty>}
      </div>
      {modal && <FormModal title={modal.goal ? 'Edit goal' : 'New goal'} fields={fields} values={modal.goal || {}} onClose={() => setModal(null)}
        onSubmit={async (d) => { if (modal.goal) await res.update(modal.goal._id, d); else await res.create(d); }} />}
    </>
  );
}
