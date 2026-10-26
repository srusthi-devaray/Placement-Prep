import { useMemo, useState } from 'react';
import { Empty, FormModal, Icon, Loading, PageHeader, fmtDate, todayStr, useResource } from '../ui.jsx';

const TONE = { Easy: 'green', Medium: 'amber', Hard: 'rose', Pending: 'indigo', Selected: 'green', Rejected: 'rose' };
const fields = [
  { name: 'company', label: 'Company', required: true },
  { name: 'role', label: 'Role' },
  { name: 'round', label: 'Round', type: 'select', options: ['Online Assessment', 'Technical', 'HR', 'Managerial', 'Group Discussion', 'Mock', 'Other'] },
  { name: 'date', label: 'Date', type: 'date', default: todayStr() },
  { name: 'difficulty', label: 'Difficulty', type: 'select', options: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  { name: 'questions', label: 'Questions asked', type: 'textarea', placeholder: 'One per line' },
  { name: 'experience', label: 'How it went / what to improve', type: 'textarea', rows: 5 },
  { name: 'outcome', label: 'Outcome', type: 'select', options: ['Pending', 'Selected', 'Rejected'] }
];

export default function Experiences() {
  const res = useResource('/experiences');
  const [q, setQ] = useState('');
  const [outcome, setOutcome] = useState('');
  const [modal, setModal] = useState(null);
  const rows = useMemo(() => (res.items || []).filter((x) => (!outcome || x.outcome === outcome) && [x.company, x.role, x.questions, x.experience].join(' ').toLowerCase().includes(q.toLowerCase())), [res.items, q, outcome]);
  if (!res.items) return <Loading />;

  return (
    <>
      <PageHeader icon="users" title="Interview Experiences" subtitle="After every interview, write the questions and what you learned.">
        <button className="btn primary" onClick={() => setModal({})}><Icon name="plus" size={17} /> Add experience</button>
      </PageHeader>
      <div className="toolbar">
        <input placeholder="Search by company, role or question..." aria-label="Search experiences" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)}><option value="">All outcomes</option><option>Pending</option><option>Selected</option><option>Rejected</option></select>
      </div>
      <div className="grid gfill">
        {rows.length ? rows.map((x) => (
          <div className="card pad stack sm" key={x._id}>
            <h3 style={{ fontSize: 18 }}>{x.company}{x.role && <span className="muted" style={{ fontWeight: 400 }}> · {x.role}</span>}</h3>
            <div className="row" style={{ gap: 6 }}>
              <span className="badge tone-violet">{x.round}</span><span className={`badge tone-${TONE[x.difficulty]}`}>{x.difficulty}</span><span className={`badge tone-${TONE[x.outcome]}`}>{x.outcome}</span><span className="muted small">{fmtDate(x.date)}</span>
            </div>
            {x.questions && <div><b className="small">Questions</b><div className="note-body">{x.questions}</div></div>}
            {x.experience && <div><b className="small">Experience</b><div className="note-body">{x.experience}</div></div>}
            <div className="row" style={{ gap: 6, marginTop: 'auto' }}>
              <button className="btn sm ghost" onClick={() => setModal({ item: x })}>Edit</button>
              <button className="btn sm danger" onClick={async () => { if (confirm('Delete this experience?')) await res.remove(x._id); }}>Delete</button>
            </div>
          </div>
        )) : <div style={{ gridColumn: '1/-1' }}><Empty icon="users" title={res.items.length ? 'No matches' : 'No experiences yet'}>Record each interview so you can learn from it.</Empty></div>}
      </div>
      {modal && <FormModal title={modal.item ? 'Edit experience' : 'Add interview experience'} fields={fields} values={modal.item || {}} onClose={() => setModal(null)}
        onSubmit={async (d) => { if (modal.item) await res.update(modal.item._id, d); else await res.create(d); }} />}
    </>
  );
}
