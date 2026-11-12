# Global Economic Research Platform

This project is a standardized frontend engineering project refactored from the original monolithic `综合.html`. It integrates three in-depth empirical research sections: **Global Real Estate Market (1985–2026)**, **Global Comprehensive Taxation System (2000–2026)**, and **Global Economic Development Trajectory (1985–2026)**. The engineering refactor separates the responsibilities of HTML, CSS, JavaScript, and JSON data, laying a solid architectural foundation for subsequent integration of a dynamic data acquisition system, cache management, historical version management, and complex data analysis.

---

## I. Project Directory Structure

```text
Global-Economic-Research/
├── index.html                        # Main page entry (pure HTML5 structure, no large inline CSS/JS)
├── package.json                      # Project dependencies and NPM script configuration
├── vite.config.js                    # Vite dev server and production build configuration
├── public/                           # Static public assets directory
│   └── assets/
│       ├── images/                   # Static images and icon assets
│       └── fonts/                    # Local font extension directory
├── src/                              # Source code directory
│   ├── main.js                       # Main frontend entry (loads CSS and starts core controller)
│   │
│   ├── styles/                       # Modular CSS style system
│   │   ├── variables.css             # Global CSS variables (background, text, accent colors, fonts, radii, shadows, chart theme colors)
│   │   ├── base.css                  # Base reset, global typography, basic form controls, custom scrollbars
│   │   ├── layout.css                # Main page framework, three section banners, grid system, responsive breakpoints
│   │   ├── components.css            # Unified cards, buttons, filter pills, data tables, simulator components, country profile cards, tooltips
│   │   └── charts.css                # Chart canvas container sizes, responsive heights, inline mini bar chart styles in tables
│   │
│   ├── js/                           # Modular JavaScript (ES Modules)
│   │   ├── core/                     # Core coordination layer
│   │   │   ├── app.js                # App startup bootstrap, data validation invocation, cross-section global search linkage
│   │   │   ├── navigation.js         # Section anchor navigation, topic jumps, collapsible table panels, methodology modal control
│   │   │   └── event-manager.js      # Cross-module pub/sub event bus, duplicate-safe DOM listener binding, global Toast notifications
│   │   │
│   │   ├── data/                     # Data management and validation layer
│   │   │   ├── data-manager.js       # Unified data access, region/keyword search filtering, dynamic data source adapter extension interface
│   │   │   └── data-validator.js     # Validation of country/region counts, four independent statistical entities (mainland China/Taiwan/Hong Kong/Macau), and series completeness
│   │   │
│   │   ├── charts/                   # Chart lifecycle management layer
│   │   │   ├── chart-manager.js      # Unified management of 46 Chart.js instances: creation, incremental reuse updates, responsive resizing, safe destruction
│   │   │   └── chart-utils.js        # 15-color warm research palette, continent color mapping, tag generation, global Chart.js defaults
│   │   │
│   │   ├── calculations/             # Independent pure-function indicator calculation engine
│   │   │   └── index-calculator.js   # Time-series interpolation, YoY/QoQ/CAGR, rebasing, real-estate 6-dimension scoring and mortgage simulation, tax 8-step simulation and 5-dimension evaluation, economy 13-dimension weighted scoring
│   │   │
│   │   └── modules/                  # Business logic layer for the three research sections
│   │       ├── real-estate.js        # Section 1: Global real estate market (57 countries/regions, 16 charts, mortgage simulator, bubble history and cases)
│   │       ├── taxation.js           # Section 2: Global comprehensive taxation comparison (55 jurisdictions, 14 charts, 8-step tax burden pass-through simulation, country profile cards)
│   │       └── economy.js            # Section 3: Global economic development trajectory (55 economies, 42-year series, 16 charts, 10 major questions, 9 historical shocks, 15 cases, 13-dimension scoring)
│   │
│   └── data/                         # Independent JSON raw data repository
│       ├── real-estate.json          # Complete real estate dataset (57 countries/regions, 16 bubble events, 14 cases, 10 conclusions)
│       ├── taxation.json             # Complete taxation dataset (55 jurisdictions' tax rates, tax wedges, macro tax burdens, provenance links)
│       └── economy.json              # Complete economic development dataset (55 economies' 1985–2026 annual series, 10 major questions, 9 historical events, 15 cases)
└── README.md                         # Project architecture and engineering documentation
```

---

## II. Technology Stack

| Technology       | Version / Specification                | Purpose                                                      |
| :--------------- | :------------------------------------- | :----------------------------------------------------------- |
| **Vite**         | `^5.4.0`                               | Frontend local development server (HMR), ES Modules module resolution, and production build bundling |
| **HTML5**        | Semantic standard                      | Page skeleton, three research section containers, data tables, and interactive control structure |
| **CSS3**         | Modular CSS + Custom Properties        | Unified warm-toned research visual system, grid and flex layouts, componentized style management |
| **JavaScript**   | ES2020+ ES Modules (`import`/`export`) | Decoupled business logic, data access abstraction, independent indicator calculations, and chart lifecycle management |
| **JSON**         | Standard independent data files        | Stores all countries/regions, time series, indicators, statistical scope notes, and authoritative data source links for the three sections |
| **Chart.js**     | `4.4.3`                                | Fully preserves the original 46 interactive dynamic statistical charts (line, grouped bar, stacked, scatter, radar, doughnut) |
| **Tailwind CSS** | `3.4.17`                               | Retains original utility-class layout support and works with modular CSS to maintain 100% visual consistency |

---

## III. Dependency Installation, Local Startup, and Production Build

### 1. Environment Requirements
- **Node.js**: `>= 18.0.0`
- **npm**: `>= 9.0.0`

### 2. Install Project Dependencies
Run in the project root directory:
```bash
npm install
```

### 3. Start Local Development Server
```bash
npm run dev
```
After startup, it listens on `http://localhost:5173` by default and supports hot module replacement (HMR) and ES Module on-demand loading.

### 4. Build for Production
```bash
npm run build
```
The build output will be placed in the `dist/` directory (including minified and bundled `index.html`, `assets/*.css`, and `assets/*.js`).

### 5. Preview Production Build
```bash
npm run preview
```

---

## IV. Responsibilities of Each Module

1. **Entry and Core Coordination Layer (`src/main.js`, `src/js/core/`)**
   - `main.js`: Imports `variables.css`, `base.css`, `layout.css`, `components.css`, and `charts.css`, and calls `initApp()` when the DOM is ready.
   - `app.js`: Performs startup data integrity validation, configures global chart parameters, initializes the three research sections, and handles the top global search box (`handleMasterPlatformSearch`) for cross-section synchronization.
   - `navigation.js`: Manages smooth scrolling section positioning, collapsible table panel toggling (`toggleTablePanel`), methodology modal (`#methodologyModal`), and responsive chart redraw on window resize.
   - `event-manager.js`: Provides a cross-module publish/subscribe event bus (Pub/Sub), duplicate-safe DOM event registration, and global floating toast notifications (`showToast`).

2. **Data Management and Validation Layer (`src/js/data/`)**
   - `data-manager.js`: Wraps reading `src/data/*.json`, filtering/querying by region/keyword, and entity dictionary caching; also reserves the `registerDataSourceAdapter(moduleKey, adapterFn)` and `fetchModuleSnapshot(moduleKey, params)` async interfaces for seamless future integration with backend APIs, IndexedDB cache, or historical version management.
   - `data-validator.js`: Validates the counts for real estate (57 countries), comprehensive taxation (55 jurisdictions), and economic trajectory (55 economies × 42 years), missing value markers (`null`/`"NA"`), and the completeness of the four independent statistical entities: mainland China, Taiwan, Hong Kong, and Macau.

3. **Chart Management Layer (`src/js/charts/`)**
   - `chart-manager.js`: Centrally manages all 46 Chart.js instances by namespace (`re:*`, `tax:*`, `econ:*`). When updating data, if the canvas and chart type are unchanged, it prioritizes reusing existing instances for animation-free incremental updates (`existing.update('none')`); if reconstruction is needed, it safely calls `.destroy()`, completely eliminating duplicate initialization and memory leaks.
   - `chart-utils.js`: Centrally maintains the 15-color warm research palette (`WARM_PALETTE`), continent color mapping function (`getContinentColor`), and continent badge generator (`getContinentTag`).

4. **Independent Indicator Calculation Layer (`src/js/calculations/index-calculator.js`)**
   - Pure-function implementation with zero DOM and chart coupling, covering: time-series linear interpolation (`getSeriesValue`), year-over-year/quarter-over-quarter growth (`computeYoYGrowth`/`computeQoQGrowth`), structural share (`computeSharePct`), rebasing (`rebaseIndexSeries`), real estate period growth and compound annual growth rate (`computePeriodGrowth`/`computeCAGR`), real estate 6-dimension health scoring (`computeMultiDimensionalScores`), mortgage burden simulation (`calculateMortgageSimulation`), tax 8-step income pass-through model (`calculate8StepSim`), tax 5-dimension evaluation and clustering (`computeTaxEvalScores`), and economic trajectory 13-dimension weighted scoring (`computeEconomyWeightedScore`).

5. **Business Modules for the Three Research Sections (`src/js/modules/`)**
   - `real-estate.js`: Manages the 6 topic views, 16 charts, mortgage simulator, 16 historical bubble events, 14 country cases, and CSV export in the real estate section.
   - `taxation.js`: Manages the KPI overview, 14 charts, 8-step tax burden simulator, country tax profile comparison cards, social security detail tables, 5-dimension weighted evaluation, and CSV export in the comprehensive taxation section.
   - `economy.js`: Manages primary/benchmark economy dual comparison, 16 charts, 10 core empirical questions, 9 historical shocks, 15 in-depth country cases, 13-dimension weighted slider score ranking, and CSV export in the economic development trajectory section.

---

## V. How to Add a New Research Section (Extension Guide)

When adding a fourth research section (for example, "Global Monetary Policy and Inflation Cycles" `monetary-policy`), simply follow these 5 standard steps without modifying the code of the existing three sections:

1. **Add an independent data file**: Create `monetary-policy.json` under `src/data/`, following the same `{ meta, entities/series, ... }` structure to store raw data and provenance links.
2. **Register data access and validation methods**: Add `validateMonetaryData()` in `src/js/data/data-validator.js`, and import the JSON in `src/js/data/data-manager.js` and expose a `getMonetaryData()` query interface.
3. **Extend pure calculation functions**: If there are domain-specific formulas (e.g., Taylor rule interest rate gap, real interest rate calculation), export pure calculation functions in `src/js/calculations/index-calculator.js`.
4. **Create a business module**: Create `monetary-policy.js` under `src/js/modules/`, obtain data via `dataManager`, call `index-calculator` to compute indicators, use `chartManager.createOrUpdate('monetary', key, canvasId, config)` to render charts, and export `initMonetaryModule()`.
5. **Mount at the entry**: Add the corresponding `<section id="section-monetary-policy">` container and top navigation link in `index.html`, call `initMonetaryModule()` in `initApp()` of `src/js/core/app.js`, and subscribe to global search events in `handleMasterPlatformSearch()`.