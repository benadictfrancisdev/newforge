## Plan: Add Organization Mode, Reorder Cognitive Lens, Update Colors, Fix Sidebar Font Size

### 1. Add "Organization" as 4th Cognitive Mode

**File: `src/components/data-agent/CognitiveModeSelector.tsx**`

- Update `CognitiveMode` type: `"analyst" | "scientist" | "founder" | "organization"`
- Reorder modes array to: Analyst → Scientist → Founder → Organization
- Update colors per mode (dark/light aware via `useTheme`):
  - **Analyst**: dark = cyan-blue (`#00c8ff`), light = `#ACB9CC`
  - **Scientist**: dark = neon green (`#39ff14`), light = `#008000`
  - **Founder**: dark = neon red (`#ff073a`), light = `#cc0000`
  - **Organization**: dark = yellow (`#ffe600`), light = `#be29ec`
- Import `useTheme` hook and compute colors dynamically based on current theme
- Update labels: Founder stays "Founder", Organization gets label "Organization" with `Building2` icon  
  
  
SQL forge should be work properly it should generate correct anser and provide report and add the option to download the report   
the report forge function should work properly without any error 

### 2. Add Organization Mode Nav Groups

**File: `src/pages/DataAgent.tsx**`

- Add `"organization"` to CognitiveMode type import
- Add `getNavGroups("organization")` case — copy structure from Analyst + Founder combined:
  - **Data**: Upload, Connect, Preview
  - **Analysis**: NLP Engine, Statistics, Hypothesis, Predict, ML Workbench, Causal Model
  - **Business Intelligence**: Biz KPIs, Risk Engine, Actions, Simulate, Investor Report
  - **Visualize**: Dashboard, Charts, Auto Dashboard, Live Stream
  - **AI Engine**: Insight Engine, Narratives, Trust Layer
  - **Tools**: SQL Forge
  - **Export**: Stakeholder, Full Report, Chat

### 3. Cognitive Lens as Landing Page (No Data Yet)

**File: `src/pages/DataAgent.tsx**`

- When `activeTab === "upload"` and no dataset loaded, show the Cognitive Lens selector prominently (full-page centered card with the 4 options)
- After selecting a mode, show the upload panel below it
- The cognitive lens remains visible above upload as it currently is

### 4. Sidebar Group Label Font Size

**File: `src/components/layout/ResponsiveSidebar.tsx**`

- Find where group labels ("DATA", "ANALYSIS", etc.) are rendered — reduce font size to `text-[10px]` and ensure uppercase styling is maintained

### Files Changed


| File                                                  | Action                                                |
| ----------------------------------------------------- | ----------------------------------------------------- |
| `src/components/data-agent/CognitiveModeSelector.tsx` | Add organization mode, reorder, theme-aware colors    |
| `src/pages/DataAgent.tsx`                             | Add organization nav group, cognitive lens landing UX |
| `src/components/layout/ResponsiveSidebar.tsx`         | Reduce group label font size                          |
