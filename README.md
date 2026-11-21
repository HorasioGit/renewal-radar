# Renewal Radar dashboard

Interactive companion to the GCI World 2026 final assignment (Horasio Immanuel): a value-aware churn prevention proof of concept for Company A.

The page shows the main EDA findings, the model results (LightGBM 5-seed bag, holdout ROC-AUC 0.706) and an interactive simulator of the retention campaign economics. All numbers come from `HorasioImmanuel.ipynb`; `src/data.json` holds only aggregated results (about 2,000 grouped customer cells, no individual records).

## Run locally
```
npm install
npm run dev
```

## Deploy on Vercel
1. Push this folder to a GitHub repository.
2. In Vercel, choose **Add New → Project**, import the repository.
3. Framework preset: **Vite** (detected automatically). Build command `npm run build`, output directory `dist`.
4. Click **Deploy**.
