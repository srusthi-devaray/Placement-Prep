import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { Empty, Icon, Loading, PageHeader, Ring, scoreColor, useToast } from '../ui.jsx';

const LEVEL_TONE = { Beginner: 'green', Intermediate: 'amber', Advanced: 'rose' };
const STATUS_ICON = { solved: ['check', 'green', 'Solved'], attempted: ['alert', 'amber', 'Attempted'], untouched: ['play', 'slate', 'Not started'] };

export default function Code() {
  const toast = useToast();
  const [tab, setTab] = useState('problems');
  const [meta, setMeta] = useState(null);
  const [list, setList] = useState(null);
  const [progress, setProgress] = useState(null);
  const [runner, setRunner] = useState(null);
  const [f, setF] = useState({ topic: new URLSearchParams(window.location.search).get('topic') || '', level: '', collection: '', status: '', q: '' });

  useEffect(() => {
    api.get('/code/meta').then(setMeta).catch((e) => toast(e.message, 'error'));
    api.get('/code/status').then(setRunner).catch(() => {});
    api.get('/code/progress').then(setProgress).catch(() => {});
  }, [toast]);

  useEffect(() => {
    const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();
    const t = setTimeout(() => api.get(`/code/problems${qs ? `?${qs}` : ''}`).then(setList).catch((e) => toast(e.message, 'error')), f.q ? 250 : 0);
    return () => clearTimeout(t);
  }, [f, toast]);

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const activeCollection = useMemo(() => meta && meta.collections.find((c) => c.id === f.collection), [meta, f.collection]);

  if (!meta) return <Loading />;
  return (
    <>
      <PageHeader icon="code" title="Coding Practice" subtitle={`${meta.total} Python problems across ${meta.topics.length} topics. Run against examples, submit against hidden tests.`} />
      {runner && !runner.enabled && (
        <div className="card pad mb" style={{ borderColor: 'var(--warn, #f59e0b)' }}>
          <b>Code running is not set up on this server yet.</b>
          <p className="muted small" style={{ margin: '6px 0 0' }}>{runner.note} You can still read problems, hints and solutions. See the README section "Coding practice runner" for the 2-minute setup.</p>
        </div>
      )}
      {runner && runner.enabled && runner.mode === 'local' && (
        <div className="card pad mb"><span className="badge tone-amber">Dev mode</span> <span className="muted small">Code runs in a plain Python process on this machine, not in a sandbox. Do not deploy this setting.</span></div>
      )}

      <div className="tabs" style={{ maxWidth: 560 }}>
        {[['problems', 'Problems'], ['progress', 'My Progress'], ['revision', `Revision${progress && progress.revision.length ? ` (${progress.revision.length})` : ''}`], ['saved', 'Bookmarks']].map(([k, label]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === 'problems' && (
        <>
          <div className="chips mb">
            <button className={`chip btn-chip ${!f.collection ? 'hit' : ''}`} onClick={() => set('collection', '')}>All problems</button>
            {meta.collections.map((c) => <button key={c.id} className={`chip btn-chip ${f.collection === c.id ? 'hit' : ''}`} onClick={() => set('collection', c.id)}>{c.title} ({c.count})</button>)}
          </div>
          {activeCollection && <p className="muted small" style={{ marginTop: -6 }}>{activeCollection.description}</p>}
          <div className="toolbar">
            <input placeholder="Search problems..." aria-label="Search problems" value={f.q} onChange={(e) => set('q', e.target.value)} />
            <select aria-label="Topic" value={f.topic} onChange={(e) => set('topic', e.target.value)}><option value="">All topics</option>{meta.topics.map((t) => <option key={t.name} value={t.name}>{t.name} ({t.count})</option>)}</select>
            <select aria-label="Level" value={f.level} onChange={(e) => set('level', e.target.value)}><option value="">All levels</option>{meta.levels.map((l) => <option key={l.name} value={l.name}>{l.name} ({l.count})</option>)}</select>
            <select aria-label="Status" value={f.status} onChange={(e) => set('status', e.target.value)}><option value="">Any status</option><option value="untouched">Not started</option><option value="attempted">Attempted</option><option value="solved">Solved</option><option value="revise">To revise</option><option value="bookmarked">Bookmarked</option></select>
          </div>
          <div className="card">
            {!list ? <Loading /> : list.length ? (
              <div className="table-wrap"><table>
                <thead><tr><th style={{ width: 46 }}></th><th>Title</th><th>Topic</th><th>Level</th><th style={{ width: 70 }}></th></tr></thead>
                <tbody>{list.map((p) => {
                  const [icon, tone, label] = STATUS_ICON[p.status];
                  return (
                    <tr key={p.id}>
                      <td><span className={`badge tone-${tone}`} title={label}><Icon name={icon} size={13} /></span></td>
                      <td><Link to={`/app/code/${p.id}`} style={{ fontWeight: 600, color: 'var(--text)' }}>{p.title}</Link></td>
                      <td className="muted">{p.topic}</td>
                      <td><span className={`badge tone-${LEVEL_TONE[p.level]}`}>{p.level}</span></td>
                      <td>{p.bookmarked && <Icon name="bookmark" size={15} />}{p.revise && <span className="badge tone-rose" title="In your revision queue">R</span>}</td>
                    </tr>
                  );
                })}</tbody>
              </table></div>
            ) : <Empty icon="code" title="No problems match">Try clearing a filter.</Empty>}
          </div>
          <p className="muted small mt">Problem statements are original, written for this app. Collections group problems by the style of test they resemble. They are not copies of any company's real questions.</p>
        </>
      )}

      {tab === 'progress' && (!progress ? <Loading /> : (
        <div className="stack">
          <div className="grid g4">
            <div className="card pad center"><Ring value={progress.total ? Math.round((progress.solved / progress.total) * 100) : 0} size={92} label={`${progress.solved}/${progress.total}`} /><div className="muted small mt-s">Solved</div></div>
            <div className="card pad center"><div className="big-score" style={{ fontSize: 40, color: scoreColor(progress.accuracy) }}>{progress.accuracy}%</div><div className="muted small">Submission accuracy ({progress.accepted}/{progress.submissions})</div></div>
            <div className="card pad center"><div className="big-score" style={{ fontSize: 40 }}>{progress.attempted}</div><div className="muted small">Problems attempted</div></div>
            <div className="card pad center"><div className="big-score" style={{ fontSize: 40 }}>{progress.revision.length}</div><div className="muted small">In revision queue</div></div>
          </div>
          <div className="grid g2">
            <div className="card pad"><div className="card-title">By level</div>
              {progress.byLevel.map((l) => <Bar key={l.name} label={l.name} solved={l.solved} total={l.total} />)}</div>
            <div className="card pad"><div className="card-title">Recent submissions</div>
              {progress.recent.length ? progress.recent.map((s, i) => <div key={i} className="row between small" style={{ padding: '5px 0' }}><Link to={`/app/code/${s.id}`}>{s.title}</Link><span className={`badge tone-${s.verdict === 'AC' ? 'green' : 'rose'}`}>{s.verdict}</span></div>) : <p className="muted small">Nothing submitted yet.</p>}</div>
          </div>
          <div className="card pad"><div className="card-title">By topic</div>
            {progress.byTopic.map((t) => <Bar key={t.name} label={t.name} solved={t.solved} total={t.total} />)}</div>
        </div>
      ))}

      {tab === 'revision' && (!progress ? <Loading /> : (
        <div className="card pad">
          <p className="muted small">Problems you submitted but have not solved yet. Revisit the hints, try again, and they leave this list once accepted.</p>
          {progress.revision.length ? progress.revision.map((p) => (
            <div key={p.id} className="list-item"><div className="grow"><div className="title"><Link to={`/app/code/${p.id}`}>{p.title}</Link></div><div className="muted small">{p.topic} · {p.wrongAttempts} wrong attempt{p.wrongAttempts === 1 ? '' : 's'}</div></div><span className={`badge tone-${LEVEL_TONE[p.level]}`}>{p.level}</span></div>
          )) : <Empty icon="check" title="Nothing to revise">Wrong submissions will show up here.</Empty>}
        </div>
      ))}

      {tab === 'saved' && (!progress ? <Loading /> : (
        <div className="card pad">
          {progress.bookmarks.length ? progress.bookmarks.map((p) => (
            <div key={p.id} className="list-item"><div className="grow"><div className="title"><Link to={`/app/code/${p.id}`}>{p.title}</Link></div><div className="muted small">{p.topic} · {p.status}</div></div><span className={`badge tone-${LEVEL_TONE[p.level]}`}>{p.level}</span></div>
          )) : <Empty icon="bookmark" title="No bookmarks">Use the bookmark button on a problem to save it here.</Empty>}
        </div>
      ))}
    </>
  );
}

function Bar({ label, solved, total }) {
  const pct = total ? Math.round((solved / total) * 100) : 0;
  return (
    <div className="metric"><span style={{ width: 170, whiteSpace: 'nowrap' }}>{label}</span><div className="track"><i style={{ width: `${pct}%`, background: 'var(--grad)' }} /></div><b>{solved}/{total}</b></div>
  );
}
