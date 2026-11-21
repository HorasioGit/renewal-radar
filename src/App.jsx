import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, ComposedChart, LineChart, BarChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  ReferenceArea, ReferenceLine, Cell, LabelList,
} from 'recharts';
import data from './data.json';
import { simulate } from './sim.js';

/* ------------------------------------------------------------------ helpers */
const R = data.results;
const COLOR = {
  ink: '#1F2933', text: '#52606D', mute: '#9AA5B1', line: '#E4E7EB',
  churn: '#E4572E', stay: '#1B998B', amber: '#E8962A', navy: '#3D5A80', plum: '#8E6C8A', green: '#4E8A5E',
};
const pct = (v, d = 0) => `${(v * 100).toFixed(d)}%`;
const usd = (v) => {
  const a = Math.abs(v);
  const s = a >= 1e6 ? `$${(a / 1e6).toFixed(1)}M` : a >= 1e3 ? `$${Math.round(a / 1e3)}k` : `$${Math.round(a)}`;
  return v < 0 ? `−${s}` : s;
};
const num = (v) => Math.round(v).toLocaleString('en-US');

function useNarrow(q = '(max-width: 760px)') {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q); const f = () => setM(mq.matches);
    mq.addEventListener('change', f); return () => mq.removeEventListener('change', f);
  }, [q]);
  return m;
}

const LABELS = {
  chg_mou_pct: 'Minutes vs. own recent average', eqpdays: 'Handset age', months: 'Months in service', mou_3vlife: 'Recent vs. lifetime minutes',
  hnd_price: 'Handset price', crclscod: 'Credit class', area: 'Region', lor: 'Length of residence', totmrc_Mean: 'Monthly recurring charge',
  mrc_share: 'Recurring charge share of bill', change_mou: 'Change in minutes', eq_to_tenure: 'Handset age vs. tenure',
  chg_rev_pct: 'Change in revenue', inactive_subs: 'Inactive lines in household', uniqsubs: 'Lines in household',
  prizm_social_one: 'Social group', asl_flag: 'Spending limit', renewal_window: 'In months 10–13', drop_rate: 'Dropped-call rate',
  rev_per_min: 'Revenue per minute', adj_rev_per_month: 'Lifetime revenue per month', avgqty: 'Calls per month', avg3qty: 'Calls, last 3 months',
  mou_3v6: 'Minutes, 3 vs. 6 months', avgmou: 'Minutes per month', avg6mou: 'Minutes, last 6 months', rev_3vlife: 'Revenue, recent vs. lifetime',
  avgrev: 'Lifetime average bill', n_missing: 'Missing profile fields', roam_Mean: 'Roaming charges', mou_Mean: 'Minutes per month', rev_Mean: 'Monthly bill',
  adjmou: 'Lifetime minutes', totcalls: 'Lifetime calls', totrev: 'Lifetime revenue', avg6qty: 'Calls, last 6 months', adjqty: 'Lifetime calls',
};
const FAMILY = {
  Handset: ['eqpdays', 'eq_to_tenure', 'original_handset', 'hnd_price', 'hnd_webcap', 'refurb_new', 'models', 'phones', 'dualband', 'new_cell'],
  'Contract timing': ['months', 'renewal_window'],
  'Usage decline': ['chg_mou_pct', 'change_mou', 'mou_3vlife', 'mou_3v6', 'chg_rev_pct', 'change_rev', 'rev_3vlife', 'avg3mou', 'avg3qty', 'avg3rev', 'avg6mou', 'avg6qty', 'avg6rev'],
  'Plan & price fit': ['totmrc_Mean', 'mrc_share', 'overage_share', 'ovrmou_Mean', 'ovrrev_Mean', 'vceovr_Mean', 'datovr_Mean', 'rev_per_min', 'rev_Mean', 'adj_rev_per_month', 'avgrev', 'adjrev', 'totrev'],
  'Network quality': ['drop_rate', 'fail_rate', 'unans_rate', 'complete_rate', 'drop_vce_Mean', 'drop_dat_Mean', 'blck_vce_Mean', 'blck_dat_Mean', 'drop_blk_Mean', 'unan_vce_Mean', 'unan_dat_Mean'],
  Household: ['inactive_subs', 'uniqsubs', 'actvsubs'],
};
const FAM_COLOR = { Handset: COLOR.churn, 'Contract timing': COLOR.amber, 'Usage decline': COLOR.navy, 'Plan & price fit': COLOR.stay, 'Network quality': COLOR.plum, Household: COLOR.green, 'Profile (not a lever)': COLOR.mute };
const familyOf = (f) => Object.keys(FAMILY).find((k) => FAMILY[k].includes(f)) || 'Profile (not a lever)';

const BASE = {
  trueChurn: R.assumptions.true_churn, offerCost: R.assumptions.offer_cost, success: R.assumptions.success,
  horizon: R.assumptions.horizon, margin: R.assumptions.margin, contactCost: R.assumptions.contact_cost, customers: R.assumptions.customers,
};

const TABS = [
  { id: 'overview', label: 'Overview', accent: 'coral', icon: 'M3 12h4l3-8 4 16 3-8h4' },
  { id: 'drivers', label: 'Churn drivers', accent: 'amber', icon: 'M4 20V10M10 20V4M16 20v-7M22 20H2' },
  { id: 'model', label: 'Model', accent: 'navy', icon: 'M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5M12 12l7-7' },
  { id: 'simulator', label: 'Business simulator', accent: 'teal', icon: 'M4 6h16M4 12h16M4 18h16M8 4v4M15 10v4M11 16v4' },
  { id: 'offers', label: 'Offers & action', accent: 'green', icon: 'M20 12v8H4v-8M2 7h20v5H2zM12 20V7M12 7S10 2 7 3s0 4 5 4zm0 0s2-5 5-4 0 4-5 4z' },
  { id: 'method', label: 'Method & sources', accent: 'plum', icon: 'M4 4h12l4 4v12H4zM8 12h8M8 16h8M8 8h4' },
];

/* --------------------------------------------------------------- building blocks */
function Icon({ d, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function Card({ title, sub, children, className = '', tone }) {
  return (
    <figure className={`card ${tone ? `tone-${tone}` : ''} ${className}`}>
      {title && <h3>{title}</h3>}
      {children}
      {sub && <figcaption>{sub}</figcaption>}
    </figure>
  );
}

function Kpi({ label, value, note, tone }) {
  return (
    <div className={`kpi tone-${tone}`}>
      <span className="kpi-label">{label}</span>
      <strong className="kpi-value">{value}</strong>
      <span className="kpi-note">{note}</span>
    </div>
  );
}

function ChartTip({ active, payload, label, fmt, labelFmt }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="tip">
      <div className="tip-label">{labelFmt ? labelFmt(label) : label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="tip-row"><span className="swatch" style={{ background: p.color || p.payload?.fill }} />{p.name}: <b>{fmt ? fmt(p.value, p.dataKey) : p.value}</b></div>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- tabs */
function TenureChart({ height = 300 }) {
  const t = data.tenure.map((r) => ({ month: r.months === 36 ? '36+' : String(r.months), churn: +(r.churn_rate * 100).toFixed(1), customers: r.customers }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={t} margin={{ top: 12, right: 6, bottom: 4, left: 0 }}>
        <CartesianGrid vertical={false} stroke={COLOR.line} />
        <ReferenceArea yAxisId="c" x1="11" x2="13" fill={COLOR.churn} fillOpacity={0.12} ifOverflow="extendDomain" />
        <XAxis dataKey="month" tick={{ fill: COLOR.text, fontSize: 12 }} interval={2} tickLine={false} axisLine={{ stroke: COLOR.mute }} />
        <YAxis yAxisId="c" domain={[20, 70]} tickFormatter={(v) => `${v}%`} tick={{ fill: COLOR.text, fontSize: 12 }} axisLine={false} tickLine={false} width={42} />
        <YAxis yAxisId="n" orientation="right" hide domain={[0, 24000]} />
        <Tooltip content={<ChartTip labelFmt={(l) => `Month ${l}`} fmt={(v, k) => (k === 'churn' ? `${v}%` : num(v))} />} />
        <Bar isAnimationActive={false} yAxisId="n" dataKey="customers" name="Customers" fill="#DCE3EA" radius={[2, 2, 0, 0]} />
        <Line isAnimationActive={false} yAxisId="c" dataKey="churn" name="Churn rate" stroke={COLOR.churn} strokeWidth={2.6} dot={{ r: 2.5, fill: COLOR.churn }} activeDot={{ r: 5 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function Overview({ go }) {
  const insights = [
    ['coral', '12-month cliff', `Churn rises from ${pct(R.churn_m9)} in month 9 to ${pct(R.churn_m11)} in month 11, when the first-year commitment ends.`],
    ['amber', 'Ageing handsets', `After month 13, customers with a handset older than 14 months churn ${pct(R.churn_after13_old)} vs. ${pct(R.churn_after13_fresh)} with a new one.`],
    ['navy', 'Falling usage', `Customers whose minutes drop sharply against their own average churn ${pct(R.churn_bigdrop)}.`],
    ['plum', 'Silent leavers', `Customers who never call care churn more (${pct(R.churn_care0)}) than frequent callers (${pct(R.churn_care3)}).`],
  ];
  return (
    <>
      <div className="kpis">
        <Kpi tone="coral" label="Customers lost per year" value={num(R.churners_per_year)} note="per 100,000 at 2% monthly churn" />
        <Kpi tone="amber" label="Annual billing walking out" value={usd(R.annual_billing_walking_out)} note={`average bill $${R.avg_monthly_revenue.toFixed(0)} a month`} />
        <Kpi tone="navy" label="Model ROC-AUC (holdout)" value={R.holdout.final_auc.toFixed(3)} note="LightGBM 5-seed bag, 20,000 unseen customers" />
        <Kpi tone="teal" label="Net profit, base case" value={`+${usd(R.base_case.value_aware_annual_profit)}`} note="per year, after all offer costs" />
      </div>
      <div className="grid g-2-1">
        <Card title="Churn more than doubles when the first year ends" sub="Churn rate by month in service (line) and number of customers (bars). Shaded: months 11–13. Sample is churn-enriched; the shape is the finding.">
          <TenureChart />
        </Card>
        <Card title="What the data says" className="insights">
          <ul>
            {insights.map(([tone, h, b]) => (
              <li key={h} className={`tone-${tone}`}><strong>{h}</strong><p>{b}</p></li>
            ))}
          </ul>
        </Card>
      </div>
      <div className="banner">
        <div>
          <strong>Recommendation</strong>
          <p>Score every customer monthly, contact only those whose expected saved margin beats the offer cost, give each the offer that matches their main driver, and act in months 9–10. Prove it first with a randomized pilot.</p>
        </div>
        <button type="button" onClick={() => go('simulator')}>Open the business simulator</button>
      </div>
    </>
  );
}

function Heatmap() {
  const cols = ['<6m', '6-10m', '10-14m', '14-20m', '20m+'];
  const colLabels = ['< 6 mo', '6–10 mo', '10–14 mo', '14–20 mo', '20+ mo'];
  const color = (v) => {
    if (v == null) return '#EEF1F4';
    const t = Math.max(0, Math.min(1, (v - 0.3) / 0.35));
    const a = [27, 153, 139], b = [242, 165, 65], c = [228, 87, 46];
    const mix = (x, y, s) => x.map((xi, i) => Math.round(xi + (y[i] - xi) * s));
    return `rgb(${(t < 0.5 ? mix(a, b, t * 2) : mix(b, c, (t - 0.5) * 2)).join(',')})`;
  };
  return (
    <div className="heat" role="table" aria-label="Churn rate by months in service and handset age">
      <div role="row" className="heat-row heat-head"><span role="columnheader">Months in service</span>{colLabels.map((c) => <span role="columnheader" key={c}>{c}</span>)}</div>
      {data.heatmap.map((r) => (
        <div role="row" className="heat-row" key={r.months}>
          <span role="rowheader">{r.months}</span>
          {cols.map((c) => (
            <span role="cell" key={c} className="heat-cell" style={{ background: color(r[c]), color: r[c] == null ? COLOR.mute : '#fff' }}>{r[c] == null ? '—' : pct(r[c])}</span>
          ))}
        </div>
      ))}
    </div>
  );
}

function Drivers() {
  const narrow = useNarrow();
  const rows = data.shap_top.slice(0, 10).map((d) => ({ name: LABELS[d.feature] || d.feature, value: d.value, fam: familyOf(d.feature) }));
  const fams = [...new Set(rows.map((r) => r.fam))];
  const fs = Object.entries(R.family_share).map(([k, v]) => ({ fam: k === 'Usage level & profile' ? 'Profile (not a lever)' : k, v })).sort((a, b) => b.v - a.v);
  const sig = [
    { label: 'Minutes dropped sharply vs. own average', a: R.churn_bigdrop, b: R.churn_bigrise, bl: 'minutes rose sharply' },
    { label: 'Never called customer care', a: R.churn_care0, b: R.churn_care3, bl: 'more than 3 care calls a month' },
    { label: 'Two or more inactive household lines', a: R.churn_inactive2, b: R.churn_inactive0, bl: 'no inactive lines' },
  ];
  return (
    <>
      <div className="grid g-1-1">
        <Card title="Old handsets raise churn at every stage" sub="Churn rate by tenure (rows) and age of the current handset (columns). Dashes: fewer than 300 customers.">
          <Heatmap />
        </Card>
        <Card title="The warning signs are quiet" sub="Grey bar: the comparison group. Complaints are not an early warning.">
          <ul className="signals">
            {sig.map((r) => (
              <li key={r.label}>
                <div className="sig-label">{r.label}</div>
                <div className="sig-bars">
                  <div className="sig-bar" style={{ width: `${r.a * 100}%`, background: COLOR.churn }}><span>{pct(r.a)}</span></div>
                  <div className="sig-bar" style={{ width: `${r.b * 100}%`, background: COLOR.mute }}><span>{pct(r.b)}</span></div>
                </div>
                <div className="sig-note">vs. customers with {r.bl}</div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <div className="grid g-2-1">
        <Card title="What the model looks at" sub="Average impact of each input on predicted churn risk (mean |SHAP|), holdout customers.">
          <ResponsiveContainer width="100%" height={330}>
            <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 30, left: 4, bottom: 4 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={narrow ? 140 : 220} tick={{ fill: COLOR.ink, fontSize: narrow ? 11 : 13 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip fmt={(v) => v.toFixed(3)} />} cursor={{ fill: '#F3F5F7' }} />
              <Bar isAnimationActive={false} dataKey="value" name="Mean |SHAP|" radius={[0, 4, 4, 0]}>{rows.map((r) => <Cell key={r.name} fill={FAM_COLOR[r.fam]} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
          <ul className="legend">{fams.map((f) => <li key={f}><span className="swatch" style={{ background: FAM_COLOR[f] }} />{f}</li>)}</ul>
        </Card>
        <Card title="Two thirds of the signal is actionable" sub="Share of the model's total attention by driver family. Coloured families map to an offer.">
          <ul className="famshare">
            {fs.map(({ fam, v }) => (
              <li key={fam}>
                <span className="fam-name">{fam}</span>
                <span className="fam-track"><span style={{ width: `${(v / fs[0].v) * 100}%`, background: FAM_COLOR[fam] }} /></span>
                <span className="fam-val">{pct(v)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

function ModelTab() {
  const narrow = useNarrow();
  const order = ['LightGBM 5-seed bag (final)', 'Stacking', 'LightGBM (single)', 'XGBoost', 'CatBoost', 'AdaBoost', 'MLP neural network'];
  const rows = order.map((m) => data.models.find((r) => r.model === m)).filter(Boolean).map((r) => ({
    model: r.model.replace(' (final)', ''), holdout: r['holdout AUC'], cv: r['5-fold CV (development)'], final: r.model.includes('final'),
  }));
  const lr = data.cv_models.find((r) => r.model === 'Logistic Regression');
  const rf = data.cv_models.find((r) => r.model === 'Random Forest');
  const H = R.holdout;
  const lift = R.decile_lift.map((v, i) => ({ decile: String(i + 1), lift: v }));
  const cls = Object.entries(R.classification);
  const gap = [
    ['Final model (60 leaves)', 0.821, 0.705, 0.705, true],
    ['Medium (15 leaves)', 0.778, 0.705, 0.703],
    ['Very simple (4 leaves)', 0.744, 0.701, 0.701],
    ['Simplest (2 leaves)', 0.697, 0.685, 0.686],
  ];
  return (
    <>
      <div className="grid g-1-2">
        <div className="spec">
          <span className="spec-tag">Final model</span>
          <dl>
            <div><dt>Model</dt><dd>LightGBM, five seeds averaged</dd></div>
            <div><dt>Metric</dt><dd>ROC-AUC on a locked 20% holdout</dd></div>
            <div className="score"><dt>Score</dt><dd>{H.final_auc.toFixed(3)}</dd></div>
            <div><dt>95% interval</dt><dd>{H.ci[0].toFixed(3)} to {H.ci[1].toFixed(3)}</dd></div>
            <div><dt>Accuracy</dt><dd>{pct(H.final_accuracy, 1)} (50% by chance)</dd></div>
            <div><dt>Cross-validation</dt><dd>{R.cv_final.lgb_bag.toFixed(3)} on 80,000 customers</dd></div>
          </dl>
          <p>Pick one leaver and one stayer at random: the model ranks the leaver as riskier {pct(H.final_auc)} of the time. Every method tried converges near 0.70, the limit of the signal in this data.</p>
        </div>
        <Card title="Seven model families, scored once on unseen customers" sub={`Also tested in cross-validation only: Random Forest ${rf.cv_auc.toFixed(3)}, Logistic Regression ${lr.cv_auc.toFixed(3)}. Stacking adds ${(rows[1].holdout - rows[0].holdout).toFixed(3)} but needs five models in production.`}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 44, left: 4, bottom: 4 }}>
              <XAxis type="number" domain={[0.64, 0.715]} hide />
              <YAxis type="category" dataKey="model" width={narrow ? 128 : 170} tick={{ fill: COLOR.ink, fontSize: narrow ? 11 : 13 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip fmt={(v) => v.toFixed(4)} />} cursor={{ fill: '#F3F5F7' }} />
              <Bar isAnimationActive={false} dataKey="holdout" name="Holdout AUC" radius={[0, 4, 4, 0]}>
                {rows.map((r) => <Cell key={r.model} fill={r.final ? COLOR.navy : r.model.includes('Ada') || r.model.includes('MLP') ? '#C9D2DC' : '#8DA2BD'} />)}
                <LabelList dataKey="holdout" position="right" formatter={(v) => v.toFixed(3)} style={{ fill: COLOR.ink, fontSize: 12, fontWeight: 650 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <div className="grid g-1-1">
        <Card title="The riskiest 10% churn three times the average" sub="Holdout customers in ten equal groups by predicted risk, re-weighted to 2% monthly churn.">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={lift} margin={{ top: 22, right: 6, left: 0, bottom: 18 }}>
              <CartesianGrid vertical={false} stroke={COLOR.line} />
              <XAxis dataKey="decile" tick={{ fill: COLOR.text, fontSize: 12 }} tickLine={false} axisLine={{ stroke: COLOR.mute }} label={{ value: 'Risk group (1 = highest)', position: 'insideBottom', offset: -10, fill: COLOR.text, fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `${v}×`} tick={{ fill: COLOR.text, fontSize: 12 }} axisLine={false} tickLine={false} width={34} />
              <ReferenceLine y={1} stroke={COLOR.ink} strokeDasharray="4 4" />
              <Tooltip content={<ChartTip labelFmt={(l) => `Risk group ${l}`} fmt={(v) => `${v.toFixed(2)}× average churn`} />} cursor={{ fill: '#F3F5F7' }} />
              <Bar isAnimationActive={false} dataKey="lift" name="Churn vs. average" radius={[4, 4, 0, 0]}>
                {lift.map((r, i) => <Cell key={r.decile} fill={i === 0 ? COLOR.navy : i < 3 ? '#8DA2BD' : '#C9D2DC'} />)}
                <LabelList dataKey="lift" position="top" formatter={(v) => `${v.toFixed(1)}×`} style={{ fill: COLOR.ink, fontSize: 11 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Not overfitting: simpler models do worse" sub="A training score above validation is normal for boosted trees. Shrinking the gap with simpler trees lowers the holdout score, and CV matches holdout for the final model.">
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>LightGBM setting</th><th>Train</th><th>CV</th><th>Holdout</th></tr></thead>
            <tbody>
              {gap.map(([n, t, c, h, f]) => (
                <tr key={n} className={f ? 'hl' : ''}><td>{n}</td><td>{t.toFixed(3)}</td><td>{c.toFixed(3)}</td><td><b>{h.toFixed(3)}</b></td></tr>
              ))}
            </tbody>
          </table></div>
        </Card>
      </div>
      <Card title="Precision, recall and F1 on the holdout" sub="Accuracy and F1 depend on the threshold and on the balanced sample. In the real-world view a model that predicts nobody churns would score 98% accuracy, so the campaign is decided by expected profit instead.">
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>View</th><th>Precision</th><th>Recall</th><th>F1</th><th>Accuracy</th></tr></thead>
          <tbody>
            {cls.map(([k, v]) => (
              <tr key={k}><td>{k.replace(/^[ABC]\. /, '')}</td><td>{pct(v.precision, 1)}</td><td>{pct(v.recall, 1)}</td><td>{v.f1.toFixed(3)}</td><td>{pct(v.accuracy, 1)}</td></tr>
            ))}
          </tbody>
        </table></div>
      </Card>
    </>
  );
}

function Slider({ id, label, value, min, max, step, fmt, onChange, hint }) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div className="slider">
      <div className="slider-top"><label htmlFor={id}>{label}</label><output htmlFor={id}>{fmt(value)}</output></div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} style={{ '--fill': `${fill}%` }} onChange={(e) => onChange(+e.target.value)} />
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

function Simulator() {
  const [a, setA] = useState(BASE);
  const set = (k) => (v) => setA((s) => ({ ...s, [k]: v }));
  const out = useMemo(() => simulate(data.grid, a, data.holdout_churn, data.sample_churn), [a]);
  const isBase = Object.keys(BASE).every((k) => a[k] === BASE[k]);
  const ratio = out.riskBestAnnual > 0 ? out.stop.annual / out.riskBestAnnual : null;
  return (
    <div className="sim">
      <form className="sim-controls" onSubmit={(e) => e.preventDefault()} aria-label="Campaign assumptions">
        <h3>Assumptions</h3>
        <Slider id="churn" label="True monthly churn" value={a.trueChurn} min={0.005} max={0.04} step={0.0025} fmt={(v) => pct(v, 1)} onChange={set('trueChurn')} hint="Big-3 U.S. carriers: about 0.9% a month" />
        <Slider id="cost" label="Offer cost per acceptance" value={a.offerCost} min={2} max={40} step={1} fmt={(v) => `$${v}`} onChange={set('offerCost')} hint="Paid by everyone who accepts, including customers who would have stayed" />
        <Slider id="save" label="Save rate of contacted churners" value={a.success} min={0.05} max={0.4} step={0.01} fmt={(v) => pct(v)} onChange={set('success')} hint="Oliver Wyman: 20% in a proactive telecom campaign" />
        <Slider id="horizon" label="Months of revenue kept per save" value={a.horizon} min={6} max={36} step={1} fmt={(v) => `${v} mo`} onChange={set('horizon')} />
        <Slider id="margin" label="Contribution margin" value={a.margin} min={0.3} max={0.7} step={0.01} fmt={(v) => pct(v)} onChange={set('margin')} hint="AT&T Mobility EBITDA is about 57% of service revenue" />
        <button type="button" className="reset" onClick={() => setA(BASE)} disabled={isBase}>Reset to base case</button>
      </form>
      <div className="sim-out">
        <div className="kpis kpis-sim" aria-live="polite">
          <Kpi tone={out.stop.annual >= 0 ? 'teal' : 'coral'} label="Net profit per year" value={usd(out.stop.annual)} note="value-aware targeting" />
          <Kpi tone="navy" label="Contacted each month" value={num(out.stop.contacted)} note={`${pct(out.stop.share, 1)} of 100,000 customers`} />
          <Kpi tone="amber" label="Customers saved per year" value={num(out.stop.savedYear)} note={`of ${num(out.churnersYear)} who would leave`} />
          <Kpi tone="plum" label="Risk ranking only" value={usd(out.riskBestAnnual)} note={ratio && ratio > 1 ? `value-aware earns ${ratio.toFixed(1)}× more` : 'best stopping point, per year'} />
        </div>
        <Card title="Monthly campaign profit by targeting rule" sub={`Dashed line: where the proposed rule stops contacting. Offering everyone would ${out.blanketAnnual < 0 ? `lose ${usd(-out.blanketAnnual)}` : `make ${usd(out.blanketAnnual)}`} a year. Computed from about 2,000 aggregated customer groups, so no individual records are published; within about 2% of the notebook (base case ${usd(R.base_case.value_aware_annual_profit)}).`}>
          <ResponsiveContainer width="100%" height={310}>
            <LineChart data={out.chart} margin={{ top: 8, right: 12, left: 0, bottom: 18 }}>
              <CartesianGrid vertical={false} stroke={COLOR.line} />
              <XAxis dataKey="share" type="number" domain={[0, 30]} ticks={[0, 5, 10, 15, 20, 25, 30]} tickFormatter={(v) => `${v}%`} tick={{ fill: COLOR.text, fontSize: 12 }} tickLine={false} axisLine={{ stroke: COLOR.mute }} label={{ value: 'Share of customers contacted per month', position: 'insideBottom', offset: -10, fill: COLOR.text, fontSize: 12 }} />
              <YAxis domain={[-80, 'auto']} allowDataOverflow tickFormatter={(v) => (v < 0 ? `−$${-v}k` : `$${v}k`)} tick={{ fill: COLOR.text, fontSize: 12 }} axisLine={false} tickLine={false} width={56} />
              <ReferenceLine y={0} stroke={COLOR.ink} />
              <ReferenceLine x={+(out.stop.share * 100).toFixed(2)} stroke={COLOR.stay} strokeDasharray="4 4" />
              <Tooltip content={<ChartTip labelFmt={(v) => `${v}% contacted`} fmt={(v) => `${v >= 0 ? '' : '−'}$${Math.abs(v).toFixed(1)}k / month`} />} />
              <Line dataKey="value" name="Value-aware (proposed)" stroke={COLOR.stay} strokeWidth={3} dot={false} isAnimationActive={false} />
              <Line dataKey="risk" name="Risk ranking" stroke={COLOR.navy} strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line dataKey="random" name="No model" stroke={COLOR.churn} strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
          <ul className="legend">
            <li><span className="swatch" style={{ background: COLOR.stay }} />Value-aware ranking (proposed)</li>
            <li><span className="swatch" style={{ background: COLOR.navy }} />Risk ranking</li>
            <li><span className="swatch" style={{ background: COLOR.churn }} />No model</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Offers() {
  const narrow = useNarrow();
  const OFFER_COLOR = { 'Check-in & plan re-fit': COLOR.navy, 'Plan right-sizing': COLOR.stay, 'Early-renewal credit': COLOR.amber, 'Handset upgrade + renewal': COLOR.churn, 'Family plan consolidation': COLOR.green, 'Network care': COLOR.plum };
  const mix = Object.entries(R.offer_mix).map(([k, v]) => ({ offer: k, share: +(v * 100).toFixed(1) }));
  const ex = R.example_customer;
  const P = R.pilot;
  return (
    <>
      <div className="grid g-3-2">
        <Card title="Offers for the customers selected this month" sub={`Selected customers bill $${R.selected_profile.avg_revenue_selected.toFixed(0)} a month on average (all customers: $${R.selected_profile.avg_revenue_all.toFixed(0)}). Low-bill, handset-driven customers need cheaper levers than a cash incentive.`}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={mix} layout="vertical" margin={{ top: 4, right: 46, left: 4, bottom: 4 }}>
              <XAxis type="number" hide domain={[0, 60]} />
              <YAxis type="category" dataKey="offer" width={narrow ? 140 : 200} tick={{ fill: COLOR.ink, fontSize: narrow ? 11 : 13 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip fmt={(v) => `${v}% of selected customers`} />} cursor={{ fill: '#F3F5F7' }} />
              <Bar isAnimationActive={false} dataKey="share" name="Share" radius={[0, 4, 4, 0]}>
                {mix.map((m) => <Cell key={m.offer} fill={OFFER_COLOR[m.offer] || COLOR.mute} />)}
                <LabelList dataKey="share" position="right" formatter={(v) => `${v}%`} style={{ fill: COLOR.ink, fontSize: 12, fontWeight: 650 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <article className="customer" aria-label="Example customer">
          <h3>One customer, from data to action</h3>
          <div className="cust-risk">
            <div className="ring" style={{ '--v': Math.min(ex.churn_prob_true_scale / 0.2, 1) }}><span>{pct(ex.churn_prob_true_scale, 1)}</span></div>
            <p>chance of leaving next month, <b>{(ex.churn_prob_true_scale / ex.base_rate).toFixed(0)}× the {pct(ex.base_rate)} average</b></p>
          </div>
          <dl className="cust-facts">
            <div><dt>Months in service</dt><dd>{ex.months_in_service}</dd></div>
            <div><dt>Handset age</dt><dd>{ex.handset_age_days} days</dd></div>
            <div><dt>Monthly bill</dt><dd>${ex.monthly_bill.toFixed(0)}</dd></div>
            <div><dt>Minutes vs. own average</dt><dd className="c-churn">{ex.minutes_change_pct}%</dd></div>
          </dl>
          <p className="why">Main reasons: {ex.top_reasons.map((r) => r.replace(' (days)', '').toLowerCase()).join(', ')}.</p>
          <div className="action"><span>Suggested action</span><strong>{ex.offer}</strong><em>expected profit +${ex.expected_profit.toFixed(1)} after offer costs</em></div>
        </article>
      </div>
      <div className="grid g-1-1">
        <Card title="Act before month 11" tone="amber">
          <div className="duo">
            <div><strong>{num(R.pre_cliff_customers_per_100k)}</strong><span>customers per 100,000 are in months 9–10 right now</span></div>
            <div><strong>{usd(R.pre_cliff_monthly_billing)}</strong><span>of monthly billing they carry</span></div>
          </div>
          <p className="body">In the sample their churn rises from {pct(R.cliff_churn_vs_pre[0])} to {pct(R.cliff_churn_vs_pre[1])} two months later. Renewal offers go out when a customer enters month 9.</p>
        </Card>
        <Card title="Prove it with a randomized pilot" tone="teal">
          <div className="duo">
            <div><strong>{num(P.n_per_group)}</strong><span>customers per group, offer vs. no contact</span></div>
            <div><strong>~{Math.ceil(P.months_to_fill)} months</strong><span>to enrol both groups at the base-case volume</span></div>
          </div>
          <p className="body">Detects a 20% drop in churn with 80% power. Measures the real save rate, offer cost and churn level before scaling up.</p>
        </Card>
      </div>
    </>
  );
}

function Method() {
  const steps = [
    ['Join and check the data', `${num(R.n_customers)} customers, two tables joined on customer ID. The sample is balanced on purpose (${pct(R.sample_churn_rate, 1)} churn), so money figures are re-weighted to a realistic 2%.`],
    ['Lock a holdout', `${num(R.n_holdout)} customers set aside before any modelling and scored only once at the end.`],
    ['Compare and tune', `Seven model families, Optuna tuning, feature selection (${R.n_selected} features kept) and three ensemble methods, all with 5-fold cross-validation.`],
    ['Explain', 'SHAP values show why each customer is at risk. Ethnicity is excluded from the model for fairness.'],
    ['Price the decision', 'Expected profit per customer (Verbraken et al., 2013) decides whom to contact and when to stop.'],
    ['Prove it', `A randomized pilot with about ${num(R.pilot.n_per_group)} customers per group measures the real effect before scale-up.`],
  ];
  const tones = ['coral', 'amber', 'navy', 'plum', 'teal', 'green'];
  return (
    <>
      <ol className="steps">{steps.map(([h, b], i) => <li key={h} className={`tone-${tones[i]}`}><h3>{h}</h3><p>{b}</p></li>)}</ol>
      <Card title="Sources">
        <ul className="sources">
          <li>CTIA (2025), Annual Survey; T-Mobile, AT&amp;T and Verizon Q3 2025 earnings releases</li>
          <li>Oliver Wyman (2014), Churn Value Management; Jain &amp; Surana, McKinsey (2017), Reducing churn in telecom through advanced analytics</li>
          <li>Verbraken, Verbeke &amp; Baesens (2013), IEEE TKDE 25(5); Saerens, Latinne &amp; Decaestecker (2002), Neural Computation 14(1)</li>
          <li>Ke et al. (2017), LightGBM; Lundberg et al. (2020), TreeSHAP; Akiba et al. (2019), Optuna</li>
        </ul>
        <p className="fine">Built from aggregated results of the analysis notebook (HorasioImmanuel.ipynb). No individual customer records are published.</p>
      </Card>
    </>
  );
}

const HEADS = {
  overview: ['Customers leave when their first year ends', 'Renewal Radar predicts who is about to leave, decides who is worth an offer, and acts before the cliff.'],
  drivers: ['Why customers leave', 'Three patterns in Company A’s data point to concrete levers: handset age, falling usage and timing.'],
  model: ['A model that ranks customers by risk', 'Seven model families and three ensemble methods compared on 80,000 customers, confirmed once on 20,000 the model had never seen.'],
  simulator: ['Test the business case', 'Contact only customers whose expected saved margin beats the offer cost. Move the assumptions and watch the profit change.'],
  offers: ['The right offer, at the right moment', 'Each customer’s explanation points to a concrete offer, and timing targets the months before the cliff.'],
  method: ['How it was built', 'From raw data to a decision rule, in six steps.'],
};

/* --------------------------------------------------------------- app shell */
export default function App() {
  const valid = TABS.map((t) => t.id);
  const fromHash = () => { const h = window.location.hash.replace('#', ''); return valid.includes(h) ? h : 'overview'; };
  const [tab, setTab] = useState(fromHash);
  useEffect(() => {
    const f = () => setTab(fromHash()); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f);
  }, []);
  const go = (id) => { if (window.location.hash !== `#${id}`) window.location.hash = id; setTab(id); window.scrollTo({ top: 0 }); };
  useEffect(() => {
    const el = document.querySelector('.nav-item.active');
    if (el && window.matchMedia('(max-width: 860px)').matches) el.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [tab]);
  const cur = TABS.find((t) => t.id === tab);
  const [h, lead] = HEADS[tab];
  return (
    <div className={`shell accent-${cur.accent}`}>
      <aside className="side">
        <div className="brand">
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="2" /><circle cx="16" cy="16" r="8" fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth="2" /><circle cx="22" cy="10" r="3.6" fill={COLOR.churn} /></svg>
          <div><strong>Renewal Radar</strong><span>Churn PoC for Company A</span></div>
        </div>
        <nav aria-label="Dashboard sections">
          {TABS.map((t) => (
            <button key={t.id} type="button" className={`nav-item accent-${t.accent} ${tab === t.id ? 'active' : ''}`} aria-current={tab === t.id ? 'page' : undefined} onClick={() => go(t.id)}>
              <Icon d={t.icon} /><span>{t.label}</span>
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <span>Holdout ROC-AUC</span><strong>{R.holdout.final_auc.toFixed(3)}</strong>
          <span>Base-case profit</span><strong>+{usd(R.base_case.value_aware_annual_profit)}/yr</strong>
          <p>Horasio Immanuel, GCI World 2026</p>
        </div>
      </aside>
      <main className="main" id="main">
        <header className="page-head">
          <h1>{h}</h1>
          <p>{lead}</p>
        </header>
        <div className="page" key={tab}>
          {tab === 'overview' && <Overview go={go} />}
          {tab === 'drivers' && <Drivers />}
          {tab === 'model' && <ModelTab />}
          {tab === 'simulator' && <Simulator />}
          {tab === 'offers' && <Offers />}
          {tab === 'method' && <Method />}
        </div>
      </main>
    </div>
  );
}
