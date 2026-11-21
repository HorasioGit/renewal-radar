// Retention-campaign simulator (profit framework of Verbraken et al., 2013).
// Works on aggregated customer groups exported by the notebook: [churners, stayers, mean score, mean bill, mean bill of churners].

export function simulate(grid, a, holdoutChurn, sampleChurn) {
  const pi = a.trueChurn;
  const w1 = pi / holdoutChurn;
  const w0 = (1 - pi) / (1 - holdoutChurn);
  const k = a.margin * a.horizon;
  let W = 0;
  const cells = grid.map(([n1, n0, p, rev, rev1]) => {
    const a1 = (p * pi) / sampleChurn;
    const b0 = ((1 - p) * (1 - pi)) / (1 - sampleChurn);
    const pt = a1 / (a1 + b0);
    const ev = pt * a.success * (rev * k - a.offerCost) - (1 - pt) * a.offerCost - a.contactCost;
    const weight = n1 * w1 + n0 * w0;
    const gain = n1 * w1 * (a.success * (rev1 * k - a.offerCost) - a.contactCost) - n0 * w0 * (a.offerCost + a.contactCost);
    const saved = n1 * w1 * a.success;
    const spend = n1 * w1 * (a.success * a.offerCost + a.contactCost) + n0 * w0 * (a.offerCost + a.contactCost);
    W += weight;
    return { p, ev, weight, gain, saved, spend };
  });
  const scale = a.customers / W;

  const curve = (order) => {
    let share = 0, profit = 0, saved = 0, spend = 0;
    const pts = [{ share: 0, profit: 0, saved: 0, spend: 0 }];
    for (const c of order) {
      share += c.weight / W; profit += c.gain * scale; saved += c.saved * scale; spend += c.spend * scale;
      pts.push({ share, profit, saved, spend });
    }
    return pts;
  };
  const valueOrder = [...cells].sort((x, y) => y.ev - x.ev);
  const riskOrder = [...cells].sort((x, y) => y.p - x.p);
  const value = curve(valueOrder);
  const risk = curve(riskOrder);
  const totalGain = cells.reduce((s, c) => s + c.gain, 0) * scale;

  const nPos = valueOrder.filter((c) => c.ev > 0).length;
  const stop = value[nPos];
  const riskBest = risk.reduce((b, q) => (q.profit > b.profit ? q : b), risk[0]);

  const interp = (pts, x) => {
    let i = pts.findIndex((q) => q.share >= x);
    if (i <= 0) return i === 0 ? pts[0].profit : pts[pts.length - 1].profit;
    const p0 = pts[i - 1], p1 = pts[i];
    const t = (x - p0.share) / (p1.share - p0.share || 1);
    return p0.profit + t * (p1.profit - p0.profit);
  };
  const chart = [];
  for (let s = 0; s <= 0.3001; s += 0.0025) {
    chart.push({ share: +(s * 100).toFixed(2), value: interp(value, s) / 1000, risk: interp(risk, s) / 1000, random: (totalGain * s) / 1000 });
  }
  return {
    chart,
    stop: { share: stop.share, contacted: stop.share * a.customers, annual: stop.profit * 12, savedYear: stop.saved * 12, spendMonth: stop.spend },
    riskBestAnnual: riskBest.profit * 12,
    blanketAnnual: totalGain * 12,
    churnersYear: pi * a.customers * 12,
  };
}
