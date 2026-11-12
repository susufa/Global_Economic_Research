/**
 * real-estate.js — 板块一：全球房地产市场深度研究模块 (1985–2026)
 * --------------------------------------------------------------------------
 * 负责房地产板块的状态管理、16个动态图表配置、按揭模拟器交互、6维健康度评分及CSV导出。
 * 数据源自 data-manager.js，纯计算逻辑源自 index-calculator.js，图表生命周期由 chart-manager.js 托管。
 */

import { dataManager } from '../data/data-manager.js';
import { chartManager } from '../charts/chart-manager.js';
import { WARM_PALETTE } from '../charts/chart-utils.js';
import { toggleTablePanel } from '../core/navigation.js';
import {
  getSeriesValue,
  getSubmarketMultiplier,
  computePeriodGrowth,
  computeCAGR,
  computeMultiDimensionalScores as calcMultiDimensionalScores,
  calculateMortgageSimulation
} from '../calculations/index-calculator.js';

const reDataset = dataManager.getRealEstateData();
const COUNTRIES = reDataset.countries;
const BUBBLE_EVENTS = reDataset.bubbleEvents;
const CASE_STUDIES = reDataset.caseStudies;
const TEN_CONCLUSIONS = reDataset.tenConclusions;
const YEARS_AXIS = reDataset.yearsAxis;

let appState = {
  activeTab: 'tab-overview',
  regionFilter: 'ALL',
  priceMode: 'real',       // 'real' | 'nominal'
  periodWindow: '1985_2026',
  searchQuery: '',
  selectedLineCodes: ['US', 'JP', 'CN', 'HK', 'TW', 'DE', 'GB', 'SG'],
  chart1Submarket: 'all',
  chart1LogScale: false,
  chart2BaseYear: '2010',
  chart3Window: '1985_2026',
  chart4Period: 'long',
  absPriceSort: 'capitalSqmUsd',
  chart5Mode: 'gap',
  chart6Scope: 'standard',
  chart7Sort: 'prr_desc',
  chart8Metric: 'all',
  chart9Sort: 'own_desc',
  chart10Metric: 'both',
  chart13View: 'inv_gdp',
  chart14Country: 'US',
  chart15Filter: 'top25',
  timelineEra: 'ALL',
  activeCaseCode: 'JP',
  weights: { w1: 25, w2: 15, w3: 20, w4: 20, w5: 10, w6: 10 }
};

const charts = chartManager.getNamespaceProxy('re');

function getFilteredCountries() {
  return dataManager.filterRealEstateCountries(appState.regionFilter, appState.searchQuery);
}

function computeMultiDimensionalScores() {
  return calcMultiDimensionalScores(COUNTRIES, appState.weights);
}

function renderCountrySelectorChips() {
  const container = document.getElementById('countryChipSelector');
  const countSpan = document.getElementById('selectedLineCount');
  if (!container) return;
  countSpan.textContent = appState.selectedLineCodes.length;
  const filtered = getFilteredCountries();
  container.innerHTML = filtered.map(c => {
    const active = appState.selectedLineCodes.includes(c.code);
    return `<button type="button" data-code="${c.code}" class="country-chip px-2.5 py-1 rounded-full text-xs border transition-all ${
      active
        ? 'bg-[#C86D51] text-white border-[#C86D51] font-semibold shadow-sm'
        : 'bg-[#FFFDF9] text-[#5C554E] border-[#E3DDD1] hover:border-[#C86D51]'
    }">${c.name} (${c.code})</button>`;
  }).join('');

  container.querySelectorAll('.country-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.getAttribute('data-code');
      const idx = appState.selectedLineCodes.indexOf(code);
      if (idx >= 0) {
        if (appState.selectedLineCodes.length > 1) {
          appState.selectedLineCodes.splice(idx, 1);
        }
      } else {
        appState.selectedLineCodes.push(code);
      }
      renderCountrySelectorChips();
      updateCharts1And2();
    });
  });
}

function createOrUpdateChart(key, canvasId, config) {
  return chartManager.createOrUpdate('re', key, canvasId, config);
}

// ---------- CHART 1 & 2: Long-term Nominal and Real Trends ----------
function updateCharts1And2() {
  const selectedCountries = COUNTRIES.filter(c => appState.selectedLineCodes.includes(c.code));
  const submarket = appState.chart1Submarket;
  const baseYear = parseInt(appState.chart2BaseYear, 10);

  // Chart 1: Nominal Series
  const datasets1 = selectedCountries.map((c, i) => {
    const color = WARM_PALETTE[i % WARM_PALETTE.length];
    const data = YEARS_AXIS.map(yr => {
      const baseVal = getSeriesValue(c.nomSeries, yr);
      const mult = getSubmarketMultiplier(c.code, submarket, yr);
      return +(baseVal * mult).toFixed(1);
    });
    return {
      label: `${c.name}`,
      data,
      borderColor: color,
      backgroundColor: color + '22',
      borderWidth: 2.2,
      pointRadius: 2.5,
      tension: 0.25
    };
  });

  createOrUpdateChart('chart1', 'chart1NominalTrend', {
    type: 'line',
    data: { labels: YEARS_AXIS, datasets: datasets1 },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y} (2010=100)` } }
      },
      scales: {
        y: {
          type: appState.chart1LogScale ? 'logarithmic' : 'linear',
          title: { display: true, text: '名义住宅价格指数 (2010=100)', font: { size: 11 } },
          grid: { color: '#EFECE4' }
        },
        x: { grid: { color: '#F6F3EC' } }
      }
    }
  });

  // Render Table 1
  const tbl1 = document.getElementById('tablePanelChart1');
  if (tbl1) {
    tbl1.innerHTML = `<table class="w-full text-left data-table">
      <thead><tr><th>国家/地区</th><th>1985</th><th>1990</th><th>2000</th><th>2010</th><th>2015</th><th>2020</th><th>2022</th><th>2024</th><th>2026</th><th>2026数据状态</th><th>来源</th></tr></thead>
      <tbody>${selectedCountries.map(c => `<tr>
        <td class="font-semibold">${c.name}</td>
        <td>${getSeriesValue(c.nomSeries, 1985)}</td>
        <td>${getSeriesValue(c.nomSeries, 1990)}</td>
        <td>${getSeriesValue(c.nomSeries, 2000)}</td>
        <td>100.0</td>
        <td>${getSeriesValue(c.nomSeries, 2015)}</td>
        <td>${getSeriesValue(c.nomSeries, 2020)}</td>
        <td>${getSeriesValue(c.nomSeries, 2022)}</td>
        <td>${getSeriesValue(c.nomSeries, 2024)}</td>
        <td class="font-bold text-[#C86D51]">${c.nominal2026}</td>
        <td>${c.statusLabel}</td>
        <td><a href="${c.sourceUrl}" target="_blank" rel="noopener" class="underline text-[#5B7C99]">${c.sourceName}</a></td>
      </tr>`).join('')}</tbody>
    </table>`;
  }

  // Chart 2: Real Series (Rebased to baseYear)
  const datasets2 = selectedCountries.map((c, i) => {
    const color = WARM_PALETTE[i % WARM_PALETTE.length];
    const baseRef = getSeriesValue(c.realSeries, baseYear) || 100;
    const data = YEARS_AXIS.map(yr => {
      const val = getSeriesValue(c.realSeries, yr);
      return +((val / baseRef) * 100).toFixed(1);
    });
    return {
      label: `${c.name}`,
      data,
      borderColor: color,
      backgroundColor: color + '22',
      borderWidth: 2.2,
      pointRadius: 2.5,
      tension: 0.25
    };
  });

  createOrUpdateChart('chart2', 'chart2RealTrend', {
    type: 'line',
    data: { labels: YEARS_AXIS, datasets: datasets2 },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y} (${baseYear}=100)` } }
      },
      scales: {
        y: {
          title: { display: true, text: `实际住宅价格指数 (${baseYear}=100)`, font: { size: 11 } },
          grid: { color: '#EFECE4' }
        },
        x: { grid: { color: '#F6F3EC' } }
      }
    }
  });

  // Render Table 2
  const tbl2 = document.getElementById('tablePanelChart2');
  if (tbl2) {
    tbl2.innerHTML = `<table class="w-full text-left data-table">
      <thead><tr><th>国家/地区</th><th>1985</th><th>1990</th><th>2000</th><th>2008</th><th>2010</th><th>2018</th><th>2021</th><th>2024</th><th>2026</th><th>统计范围说明</th></tr></thead>
      <tbody>${selectedCountries.map(c => `<tr>
        <td class="font-semibold">${c.name}</td>
        <td>${getSeriesValue(c.realSeries, 1985)}</td>
        <td>${getSeriesValue(c.realSeries, 1990)}</td>
        <td>${getSeriesValue(c.realSeries, 2000)}</td>
        <td>${getSeriesValue(c.realSeries, 2008)}</td>
        <td>100.0</td>
        <td>${getSeriesValue(c.realSeries, 2018)}</td>
        <td>${getSeriesValue(c.realSeries, 2021)}</td>
        <td>${getSeriesValue(c.realSeries, 2024)}</td>
        <td class="font-bold text-[#6B8E78]">${c.real2026}</td>
        <td class="text-xs text-[#5C554E]">${c.coverageNote}</td>
      </tr>`).join('')}</tbody>
    </table>`;
  }
}

// ---------- CHART 3 & 4: Cumulative Growth & CAGR ----------
function updateCharts3And4() {
  const filtered = getFilteredCountries();
  const winKey = appState.chart3Window;

  const sortedForChart3 = [...filtered]
    .map(c => ({
      ...c,
      realCum: computePeriodGrowth(c, winKey, 'real'),
      nomCum: computePeriodGrowth(c, winKey, 'nominal')
    }))
    .sort((a, b) => b.realCum - a.realCum)
    .slice(0, 22);

  createOrUpdateChart('chart3', 'chart3CumulativeGrowth', {
    type: 'bar',
    data: {
      labels: sortedForChart3.map(c => c.name),
      datasets: [
        {
          label: '剔除通胀实际累计涨幅 (%)',
          data: sortedForChart3.map(c => c.realCum),
          backgroundColor: '#C86D51',
          borderRadius: 4
        },
        {
          label: '本币名义累计涨幅 (%, 上限截断展示)',
          data: sortedForChart3.map(c => Math.min(c.nomCum, 600)),
          backgroundColor: '#5B7C9988',
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const item = sortedForChart3[ctx.dataIndex];
              if (ctx.datasetIndex === 0) return `实际累计涨幅: ${item.realCum}%`;
              return `名义累计涨幅: ${item.nomCum}%`;
            }
          }
        }
      },
      scales: {
        y: { title: { display: true, text: '累计涨幅 (%)', font: { size: 11 } }, grid: { color: '#EFECE4' } },
        x: { ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 30 } }
      }
    }
  });

  const tbl3 = document.getElementById('tablePanelChart3');
  if (tbl3) {
    tbl3.innerHTML = `<table class="w-full text-left data-table">
      <thead><tr><th>国家/地区</th><th>1985–2026实际</th><th>1990–2026实际</th><th>2000–2026实际</th><th>2010–2026实际</th><th>近10年实际</th><th>近5年实际</th><th>2010–2026名义</th><th>来源</th></tr></thead>
      <tbody>${filtered.map(c => `<tr>
        <td class="font-semibold">${c.name}</td>
        <td>${computePeriodGrowth(c, '1985_2026', 'real')}%</td>
        <td>${computePeriodGrowth(c, '1990_2026', 'real')}%</td>
        <td>${computePeriodGrowth(c, '2000_2026', 'real')}%</td>
        <td class="font-semibold text-[#C86D51]">${computePeriodGrowth(c, '2010_2026', 'real')}%</td>
        <td>${computePeriodGrowth(c, '2016_2026', 'real')}%</td>
        <td>${computePeriodGrowth(c, '2021_2026', 'real')}%</td>
        <td>${computePeriodGrowth(c, '2010_2026', 'nominal')}%</td>
        <td><a href="${c.sourceUrl}" target="_blank" rel="noopener" class="underline text-[#5B7C99]">${c.sourceName}</a></td>
      </tr>`).join('')}</tbody>
    </table>`;
  }

  // Chart 4: CAGR Comparison
  const pType = appState.chart4Period;
  const sortedForChart4 = [...filtered]
    .map(c => ({
      ...c,
      realCagr: computeCAGR(c, pType, 'real'),
      nomCagr: computeCAGR(c, pType, 'nominal')
    }))
    .sort((a, b) => b.realCagr - a.realCagr)
    .slice(0, 22);

  createOrUpdateChart('chart4', 'chart4CagrComparison', {
    type: 'bar',
    data: {
      labels: sortedForChart4.map(c => c.name),
      datasets: [
        {
          label: '实际年均复合增长率 Real CAGR (%/年)',
          data: sortedForChart4.map(c => c.realCagr),
          backgroundColor: '#6B8E78',
          borderRadius: 4
        },
        {
          label: '名义年均复合增长率 Nominal CAGR (%/年, 截断25%)',
          data: sortedForChart4.map(c => Math.min(c.nomCagr, 25)),
          backgroundColor: '#D49A4599',
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const item = sortedForChart4[ctx.dataIndex];
              return ctx.datasetIndex === 0
                ? `实际 CAGR: ${item.realCagr}% / 年`
                : `名义 CAGR: ${item.nomCagr}% / 年`;
            }
          }
        }
      },
      scales: {
        y: { title: { display: true, text: '年均复合增长率 (% / 年)', font: { size: 11 } }, grid: { color: '#EFECE4' } },
        x: { ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 30 } }
      }
    }
  });

  const tbl4 = document.getElementById('tablePanelChart4');
  if (tbl4) {
    tbl4.innerHTML = `<table class="w-full text-left data-table">
      <thead><tr><th>国家/地区</th><th>1985–2026 实际CAGR</th><th>1985–2026 名义CAGR</th><th>2010–2026 实际CAGR</th><th>2010–2026 名义CAGR</th><th>近10年 实际CAGR</th><th>数据起始年与说明</th></tr></thead>
      <tbody>${filtered.map(c => `<tr>
        <td class="font-semibold">${c.name}</td>
        <td class="font-semibold text-[#6B8E78]">${computeCAGR(c, 'long', 'real')}%</td>
        <td>${computeCAGR(c, 'long', 'nominal')}%</td>
        <td>${computeCAGR(c, 'post2010', 'real')}%</td>
        <td>${computeCAGR(c, 'post2010', 'nominal')}%</td>
        <td>${computeCAGR(c, 'last10', 'real')}%</td>
        <td class="text-xs text-[#5C554E]">${c.startYear}年起 (${c.missingNote})</td>
      </tr>`).join('')}</tbody>
    </table>`;
  }
}

// ---------- ABSOLUTE PRICE TABLE ----------
function renderAbsPriceTable() {
  const tbody = document.getElementById('absPriceTableBody');
  if (!tbody) return;
  const filtered = getFilteredCountries();
  const sortKey = appState.absPriceSort;

  const rows = [...filtered].map(c => ({
    ...c,
    cityNatRatio: +(c.capSqmUsd / c.natSqmUsd).toFixed(2),
    natTotal90k: Math.round((c.natSqmUsd * 90) / 1000),
    capTotal90k: Math.round((c.capSqmUsd * 90) / 1000)
  })).sort((a, b) => {
    if (sortKey === 'nationalSqmUsd') return b.natSqmUsd - a.natSqmUsd;
    if (sortKey === 'capitalSqmPpp') return Math.round(b.capSqmUsd * (b.natSqmPpp / b.natSqmUsd)) - Math.round(a.capSqmUsd * (a.natSqmPpp / a.natSqmUsd));
    if (sortKey === 'cityNationalRatio') return b.cityNatRatio - a.cityNatRatio;
    return b.capSqmUsd - a.capSqmUsd;
  });

  tbody.innerHTML = rows.map(c => {
    const capPpp = Math.round(c.capSqmUsd * (c.natSqmPpp / c.natSqmUsd));
    const badgeCls = c.status2026 === 'Actual' ? 'badge-sage' : (c.status2026 === 'Preliminary' ? 'badge-blue' : 'badge-ochre');
    return `<tr>
      <td class="font-semibold text-[#2C2825]">${c.name}</td>
      <td>${c.regionCn}</td>
      <td class="font-mono">$${c.natSqmUsd.toLocaleString()}</td>
      <td class="font-mono text-[#5B7C99]">PPP $${c.natSqmPpp.toLocaleString()}</td>
      <td class="font-mono font-semibold text-[#C86D51]">$${c.capSqmUsd.toLocaleString()} <span class="text-[11px] font-normal text-[#857D74]">(${c.capital})</span></td>
      <td class="font-mono">$${c.majSqmUsd.toLocaleString()} <span class="text-[11px] text-[#857D74]">(${c.majorCity})</span></td>
      <td class="font-semibold">${c.cityNatRatio}x</td>
      <td class="font-mono text-xs">全国 $${c.natTotal90k}k / 核心 $${c.capTotal90k}k</td>
      <td class="text-xs text-[#5C554E] max-w-xs">${c.coverageNote}</td>
      <td>
        <span class="px-1.5 py-0.5 rounded text-[11px] ${badgeCls}">${c.status2026}</span>
        <a href="${c.sourceUrl}" target="_blank" rel="noopener" class="block underline text-[#5B7C99] text-[11px] mt-0.5">${c.sourceName}</a>
      </td>
    </tr>`;
  }).join('');
}

// ---------- CHARTS 5, 6, 7, 8: AFFORDABILITY & RENT ----------
function updateAffordabilityCharts() {
  const filtered = getFilteredCountries();

  // Chart 5: Real House Price Growth vs Real Household Income Growth (2000-2026)
  const items5 = [...filtered].map(c => {
    const pGrowth = computePeriodGrowth(c, '2000_2026', 'real');
    const iGrowth = c.incomeRealGrowth2000_2026;
    return { ...c, pGrowth, iGrowth, gap: +(pGrowth - iGrowth).toFixed(1) };
  }).sort((a, b) => appState.chart5Mode === 'gap' ? b.gap - a.gap : b.pGrowth - a.pGrowth).slice(0, 22);

  createOrUpdateChart('chart5', 'chart5PriceVsIncome', {
    type: 'bar',
    data: {
      labels: items5.map(c => c.name),
      datasets: [
        { label: '2000–2026 实际房价累计涨幅 (%)', data: items5.map(c => c.pGrowth), backgroundColor: '#C86D51', borderRadius: 3 },
        { label: '2000–2026 居民实际可支配收入涨幅 (%)', data: items5.map(c => c.iGrowth), backgroundColor: '#6B8E78', borderRadius: 3 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
      scales: {
        y: { title: { display: true, text: '累计实际增长率 (%)', font: { size: 11 } }, grid: { color: '#EFECE4' } },
        x: { ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 30 } }
      }
    }
  });

  const tbl5 = document.getElementById('tablePanelChart5');
  if (tbl5) {
    tbl5.innerHTML = `<table class="w-full text-left data-table">
      <thead><tr><th>国家/地区</th><th>2000–2026 实际房价涨幅</th><th>2000–2026 实际收入涨幅</th><th>房价超额涨幅差值</th><th>是否脱离收入基本面</th></tr></thead>
      <tbody>${items5.map(c => `<tr>
        <td class="font-semibold">${c.name}</td>
        <td>${c.pGrowth}%</td>
        <td>${c.iGrowth}%</td>
        <td class="font-bold ${c.gap > 30 ? 'text-[#C86D51]' : 'text-[#6B8E78]'}">${c.gap > 0 ? '+' : ''}${c.gap} 个百分点</td>
        <td>${c.gap > 45 ? '显著超越收入增长' : (c.gap > 10 ? '温和高于收入增长' : '与收入增长基本同步或更亲民')}</td>
      </tr>`).join('')}</tbody>
    </table>`;
  }

  // Chart 6: Price-to-Income Ratio (National vs Capital)
  const isOfficial = appState.chart6Scope === 'official';
  const items6 = [...filtered]
    .sort((a, b) => (isOfficial ? b.pirOfficial - a.pirOfficial : b.pirIntl - a.pirIntl))
    .slice(0, 22);

  createOrUpdateChart('chart6', 'chart6PriceToIncome', {
    type: 'bar',
    data: {
      labels: items6.map(c => c.name),
      datasets: [
        {
          label: isOfficial ? '全国官方/中位数房价收入比 (倍)' : '全国国际90㎡公寓口径房价收入比 (倍)',
          data: items6.map(c => isOfficial ? c.pirOfficial : c.pirIntl),
          backgroundColor: '#6B8E78',
          borderRadius: 3
        },
        {
          label: '首都/第一核心城市房价收入比 (倍)',
          data: items6.map(c => c.pirCapital),
          backgroundColor: '#C86D51',
          borderRadius: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
      scales: {
        y: { title: { display: true, text: '房价收入比 (年家庭可支配收入倍数)', font: { size: 11 } }, grid: { color: '#EFECE4' } },
        x: { ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 30 } }
      }
    }
  });

  const tbl6 = document.getElementById('tablePanelChart6');
  if (tbl6) {
    tbl6.innerHTML = `<table class="w-full text-left data-table">
      <thead><tr><th>国家/地区</th><th>国际90㎡公寓口径 PIR</th><th>官方/中位数口径 PIR</th><th>首都/核心城 PIR</th><th>首都名称</th><th>权威来源</th></tr></thead>
      <tbody>${filtered.map(c => `<tr>
        <td class="font-semibold">${c.name}</td>
        <td class="font-bold text-[#C86D51]">${c.pirIntl} 倍</td>
        <td class="font-semibold text-[#6B8E78]">${c.pirOfficial} 倍</td>
        <td class="font-bold">${c.pirCapital} 倍</td>
        <td>${c.capital}</td>
        <td><a href="${c.sourceUrl}" target="_blank" rel="noopener" class="underline text-[#5B7C99]">${c.sourceName}</a></td>
      </tr>`).join('')}</tbody>
    </table>`;
  }

  // Chart 7: Price-to-Rent Ratio & Gross Rental Yield
  const items7 = [...filtered]
    .sort((a, b) => appState.chart7Sort === 'prr_desc' ? b.prr - a.prr : b.rentalYield - a.rentalYield)
    .slice(0, 22);

  createOrUpdateChart('chart7', 'chart7PriceToRent', {
    type: 'bar',
    data: {
      labels: items7.map(c => c.name),
      datasets: [
        {
          label: '房价租金比 Price-to-Rent Ratio (倍, 左轴)',
          data: items7.map(c => c.prr),
          backgroundColor: '#5B7C99',
          yAxisID: 'y',
          borderRadius: 3
        },
        {
          label: '毛租金回报率 Gross Rental Yield (%, 右轴)',
          data: items7.map(c => c.rentalYield),
          type: 'line',
          borderColor: '#C86D51',
          backgroundColor: '#C86D51',
          yAxisID: 'y1',
          borderWidth: 2.2,
          pointRadius: 3.5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
      scales: {
        y: { position: 'left', title: { display: true, text: '房价租金比 (年租金倍数)', font: { size: 11 } }, grid: { color: '#EFECE4' } },
        y1: { position: 'right', title: { display: true, text: '毛租金回报率 (%)', font: { size: 11 } }, grid: { drawOnChartArea: false } },
        x: { ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 30 } }
      }
    }
  });

  const tbl7 = document.getElementById('tablePanelChart7');
  if (tbl7) {
    tbl7.innerHTML = `<table class="w-full text-left data-table">
      <thead><tr><th>国家/地区</th><th>房价租金比 (倍)</th><th>毛租金回报率 (%)</th><th>估值与租金基本面诊断</th></tr></thead>
      <tbody>${items7.map(c => `<tr>
        <td class="font-semibold">${c.name}</td>
        <td class="font-bold text-[#5B7C99]">${c.prr} 倍</td>
        <td class="font-semibold text-[#C86D51]">${c.rentalYield}%</td>
        <td>${c.prr >= 40 ? '显著偏离租金基本面 (强金融储值预期)' : (c.prr >= 25 ? '温和溢价区间' : '租金现金流支撑充沛')}</td>
      </tr>`).join('')}</tbody>
    </table>`;
  }

  // Chart 8: Rent-to-Income & Mortgage-to-Income Burden
  const items8 = [...filtered]
    .sort((a, b) => appState.chart8Metric === 'rent' ? b.rentIncomeRatio - a.rentIncomeRatio : b.mortgageIncomeRatio - a.mortgageIncomeRatio)
    .slice(0, 22);

  const ds8 = [];
  if (appState.chart8Metric === 'all' || appState.chart8Metric === 'mortgage') {
    ds8.push({
      label: '按揭月供占家庭收入比 (%, 截断150%)',
      data: items8.map(c => Math.min(c.mortgageIncomeRatio, 150)),
      backgroundColor: '#C86D51',
      borderRadius: 3
    });
  }
  if (appState.chart8Metric === 'all' || appState.chart8Metric === 'rent') {
    ds8.push({
      label: '租金占家庭月收入比 (%)',
      data: items8.map(c => c.rentIncomeRatio),
      backgroundColor: '#D49A45',
      borderRadius: 3
    });
  }
  if (appState.chart8Metric === 'all') {
    ds8.push({
      label: '广义住房支出占可支配收入比 (%)',
      data: items8.map(c => c.housingCostShare),
      backgroundColor: '#6B8E78',
      borderRadius: 3
    });
  }

  createOrUpdateChart('chart8', 'chart8RentAndMortgageBurden', {
    type: 'bar',
    data: { labels: items8.map(c => c.name), datasets: ds8 },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
      scales: {
        y: { title: { display: true, text: '占家庭收入比例 (%)', font: { size: 11 } }, grid: { color: '#EFECE4' } },
        x: { ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 30 } }
      }
    }
  });

  const tbl8 = document.getElementById('tablePanelChart8');
  if (tbl8) {
    tbl8.innerHTML = `<table class="w-full text-left data-table">
      <thead><tr><th>国家/地区</th><th>按揭月供占收入比 (%)</th><th>租金占家庭收入比 (%)</th><th>住房相关支出占可支配收入 (%)</th><th>典型首付比例</th><th>按揭利率 (%)</th></tr></thead>
      <tbody>${filtered.map(c => `<tr>
        <td class="font-semibold">${c.name}</td>
        <td class="font-bold text-[#C86D51]">${c.mortgageIncomeRatio}%</td>
        <td>${c.rentIncomeRatio}%</td>
        <td>${c.housingCostShare}%</td>
        <td>${c.downPaymentPct}% (LTV ${c.ltv}%)</td>
        <td>${c.mortgageRate}% (${c.loanTerm}年)</td>
      </tr>`).join('')}</tbody>
    </table>`;
  }
}

// ---------- INTERACTIVE MORTGAGE & AFFORDABILITY SIMULATOR ----------

function initSimulator() {
  const sel = document.getElementById('simCountrySelect');
  if (!sel) return;
  sel.innerHTML = COUNTRIES.map(c => `<option value="${c.code}">${c.name} (${c.regionCn} · ${c.capital})</option>`).join('');
  sel.value = 'CN';
  loadCountryToSimulator('CN');

  sel.addEventListener('change', () => loadCountryToSimulator(sel.value));
  ['simLocationSelect', 'simIncomeGroup', 'simAreaSqm', 'simDownPaymentPct', 'simMortgageRate', 'simLoanTerm'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', runMortgageSimulation);
  });
  const btnReset = document.getElementById('btnResetSimulator');
  if (btnReset) {
    btnReset.addEventListener('click', () => loadCountryToSimulator(sel.value));
  }
}

function loadCountryToSimulator(code) {
  const c = COUNTRIES.find(x => x.code === code) || COUNTRIES[0];
  document.getElementById('simDownPaymentPct').value = c.downPaymentPct;
  document.getElementById('simMortgageRate').value = Math.min(28, c.mortgageRate);
  document.getElementById('simLoanTerm').value = c.loanTerm;
  document.getElementById('simPolicyHint').textContent = `当地制度特征: ${c.rateType}`;
  runMortgageSimulation();
}

function runMortgageSimulation() {
  const code = document.getElementById('simCountrySelect').value;
  const c = COUNTRIES.find(x => x.code === code) || COUNTRIES[0];
  const loc = document.getElementById('simLocationSelect').value;
  const incMultiplier = parseFloat(document.getElementById('simIncomeGroup').value);
  const area = parseFloat(document.getElementById('simAreaSqm').value);
  const downPct = parseFloat(document.getElementById('simDownPaymentPct').value);
  const rateAnnual = parseFloat(document.getElementById('simMortgageRate').value);
  const termYears = parseFloat(document.getElementById('simLoanTerm').value);

  document.getElementById('simAreaVal').textContent = area;
  document.getElementById('simDownVal').textContent = downPct;
  document.getElementById('simLtvVal').textContent = 100 - downPct;
  document.getElementById('simRateVal').textContent = rateAnnual.toFixed(1);
  document.getElementById('simTermVal').textContent = termYears;

  const sim = calculateMortgageSimulation(c, { loc, incMultiplier, area, downPct, rateAnnual, termYears });

  document.getElementById('simOutTotalPrice').textContent = `$${Math.round(sim.totalPrice).toLocaleString()}`;
  document.getElementById('simOutDownPayment').textContent = `首付: $${Math.round(sim.downPayment).toLocaleString()}`;
  document.getElementById('simOutPir').textContent = `${sim.pir.toFixed(1)} 倍`;
  document.getElementById('simOutSaveYears').textContent = `30%储蓄需 ${sim.saveYears.toFixed(1)} 年`;
  document.getElementById('simOutMonthlyPay').textContent = `$${Math.round(sim.monthlyPay).toLocaleString()} / 月`;
  document.getElementById('simOutPaymentToIncome').textContent = `月供占收入: ${sim.payToIncomePct.toFixed(1)}%`;
  document.getElementById('simOutRentVsBuy').textContent = `月供为同面积租金 ${sim.payToRentRatio.toFixed(2)}x`;

  const diffEl = document.getElementById('simOutDifficultyBadge');
  diffEl.textContent = sim.difficultyLabel;
  diffEl.className = sim.difficultyClass;

  const tbody = document.getElementById('simIncomeTiersBody');
  tbody.innerHTML = sim.incomeTiers.map(t => {
    const status = t.tMti <= 30 ? '<span class="px-2 py-0.5 rounded badge-sage text-[11px]">独立购房可行</span>'
      : (t.tMti <= 50 ? '<span class="px-2 py-0.5 rounded badge-ochre text-[11px]">需缩减面积或加首付</span>'
      : '<span class="px-2 py-0.5 rounded badge-terracotta text-[11px]">独立按揭超负荷/宜租房或保障房</span>');
    return `<tr>
      <td class="font-semibold">${t.name}</td>
      <td class="font-mono">$${Math.round(t.incA).toLocaleString()}</td>
      <td class="font-bold">${t.tPir.toFixed(1)} 倍</td>
      <td>${t.tSave.toFixed(1)} 年</td>
      <td class="font-semibold text-[#C86D51]">${t.tMti.toFixed(1)}%</td>
      <td class="text-[#5B7C99]">${t.tRti.toFixed(1)}%</td>
      <td>${status}</td>
    </tr>`;
  }).join('');
}

function updateSupplyCharts() {
  const filtered = getFilteredCountries();

  // Chart 9: Homeownership vs Rental Share
  const items9 = [...filtered]
    .sort((a, b) => appState.chart9Sort === 'own_desc' ? b.homeownership - a.homeownership : b.rentalPopShare - a.rentalPopShare)
    .slice(0, 24);

  createOrUpdateChart('chart9', 'chart9Homeownership', {
    type: 'bar',
    data: {
      labels: items9.map(c => c.name),
      datasets: [
        { label: '城镇/全国住房自有率 (%)', data: items9.map(c => c.homeownership), backgroundColor: '#6B8E78', borderRadius: 3 },
        { label: '租房人口比例 (%)', data: items9.map(c => c.rentalPopShare), backgroundColor: '#D49A45', borderRadius: 3 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
      scales: {
        x: { stacked: true, ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 30 } },
        y: { stacked: true, max: 100, title: { display: true, text: '住房产权与租住结构 (%)', font: { size: 11 } } }
      }
    }
  });

  const tbl9 = document.getElementById('tablePanelChart9');
  if (tbl9) {
    tbl9.innerHTML = `<table class="w-full text-left data-table">
      <thead><tr><th>国家/地区</th><th>住房自有率 (%)</th><th>租房人口比例 (%)</th><th>千人拥有住宅套数</th><th>制度特征</th></tr></thead>
      <tbody>${filtered.map(c => `<tr>
        <td class="font-semibold">${c.name}</td>
        <td class="font-bold text-[#6B8E78]">${c.homeownership}%</td>
        <td>${c.rentalPopShare}%</td>
        <td>${c.dwellingsPer1k} 套/千人</td>
        <td class="text-xs text-[#5C554E]">${c.assetRole}</td>
      </tr>`).join('')}</tbody>
    </table>`;
  }

  // Chart 10: Per Capita Floor Area & Household Size / Vacancy
  const metric10 = appState.chart10Metric;
  const items10 = [...filtered]
    .sort((a, b) => metric10 === 'vacancy' ? b.vacancyRate - a.vacancyRate : b.perCapitaSqm - a.perCapitaSqm)
    .slice(0, 24);

  const ds10 = metric10 === 'vacancy'
    ? [{ label: '全国住房空置率 (%)', data: items10.map(c => c.vacancyRate), backgroundColor: '#C86D51', borderRadius: 3 }]
    : (metric10 === 'perCapita'
      ? [{ label: '人均住房面积 (㎡/人)', data: items10.map(c => c.perCapitaSqm), backgroundColor: '#5B7C99', borderRadius: 3 }]
      : [
          { label: '人均住房面积 (㎡/人)', data: items10.map(c => c.perCapitaSqm), backgroundColor: '#5B7C99', borderRadius: 3 },
          { label: '每户平均居住面积 (㎡/户)', data: items10.map(c => c.householdSqm), backgroundColor: '#6B8E7899', borderRadius: 3 }
        ]);

  createOrUpdateChart('chart10', 'chart10FloorArea', {
    type: 'bar',
    data: { labels: items10.map(c => c.name), datasets: ds10 },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
      scales: {
        y: { title: { display: true, text: metric10 === 'vacancy' ? '空置率 (%)' : '面积 (平方米 ㎡)', font: { size: 11 } }, grid: { color: '#EFECE4' } },
        x: { ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 30 } }
      }
    }
  });

  const tbl10 = document.getElementById('tablePanelChart10');
  if (tbl10) {
    tbl10.innerHTML = `<table class="w-full text-left data-table">
      <thead><tr><th>国家/地区</th><th>人均住房面积 (㎡)</th><th>户均居住面积 (㎡)</th><th>全国存量 (万套)</th><th>空置率 (%)</th><th>老龄化率 (65+)</th></tr></thead>
      <tbody>${filtered.map(c => `<tr>
        <td class="font-semibold">${c.name}</td>
        <td class="font-bold text-[#5B7C99]">${c.perCapitaSqm} ㎡</td>
        <td>${c.householdSqm} ㎡</td>
        <td>${(c.housingStockM * 100).toFixed(0)} 万套</td>
        <td>${c.vacancyRate}%</td>
        <td>${c.agingRate}%</td>
      </tr>`).join('')}</tbody>
    </table>`;
  }

  // Supply & Demographic Full Table
  const sBody = document.getElementById('supplyDemographicTableBody');
  if (sBody) {
    sBody.innerHTML = filtered.map(c => {
      const supplyMatch = c.dwellingsPer1k >= 460
        ? '<span class="px-2 py-0.5 rounded badge-sage text-[11px]">总量充裕 / 局部都会集中</span>'
        : (c.dwellingsPer1k >= 350
          ? '<span class="px-2 py-0.5 rounded badge-blue text-[11px]">供需大体平衡 / 核心城紧平衡</span>'
          : '<span class="px-2 py-0.5 rounded badge-terracotta text-[11px]">增量供给刚性短缺</span>');
      return `<tr>
        <td class="font-semibold">${c.name}</td>
        <td>${(c.housingStockM * 100).toFixed(0)} 万套</td>
        <td class="font-semibold">${c.dwellingsPer1k} 套</td>
        <td>开工 ${(c.startsM * 100).toFixed(1)} / 竣工 ${(c.completionsM * 100).toFixed(1)}</td>
        <td>${c.perCapitaSqm} ㎡/人 (${c.householdSqm} ㎡/户)</td>
        <td>自有 ${c.homeownership}% / 租 ${c.rentalPopShare}%</td>
        <td>${c.vacancyRate}%</td>
        <td>${c.urbanization}%</td>
        <td>人口 ${c.popGrowth > 0 ? '+' : ''}${c.popGrowth}% / 户数 +${c.hhGrowth}%</td>
        <td>老龄 ${c.agingRate}% / 净移民 ${c.netMigration > 0 ? '+' : ''}${c.netMigration}%</td>
        <td>${supplyMatch}</td>
      </tr>`;
    }).join('');
  }
}

// ---------- CHARTS 11, 12, 13, 14: REAL ESTATE FINANCE & SYSTEMIC RISK ----------
function updateFinanceCharts() {
  const filtered = getFilteredCountries();

  // Chart 11: Mortgage Debt to GDP (2000 vs 2010 vs 2026)
  const items11 = [...filtered].sort((a, b) => b.mortgageGdp2026 - a.mortgageGdp2026).slice(0, 22);
  createOrUpdateChart('chart11', 'chart11MortgageToGdp', {
    type: 'bar',
    data: {
      labels: items11.map(c => c.name),
      datasets: [
        { label: '2000年 按揭贷款/GDP (%)', data: items11.map(c => c.mortgageGdp2000), backgroundColor: '#D49A4588', borderRadius: 2 },
        { label: '2010年 按揭贷款/GDP (%)', data: items11.map(c => c.mortgageGdp2010), backgroundColor: '#5B7C99', borderRadius: 2 },
        { label: '2026年 按揭贷款/GDP (%)', data: items11.map(c => c.mortgageGdp2026), backgroundColor: '#C86D51', borderRadius: 2 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
      scales: {
        y: { title: { display: true, text: '居民住房按揭余额占 GDP 比例 (%)', font: { size: 11 } }, grid: { color: '#EFECE4' } },
        x: { ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 30 } }
      }
    }
  });

  const tbl11 = document.getElementById('tablePanelChart11');
  if (tbl11) {
    tbl11.innerHTML = `<table class="w-full text-left data-table">
      <thead><tr><th>国家/地区</th><th>2000年 按揭/GDP</th><th>2010年 按揭/GDP</th><th>2026年 按揭/GDP</th><th>2010–2026 杠杆变化</th><th>银行涉房贷款集中度</th></tr></thead>
      <tbody>${filtered.map(c => {
        const diff = +(c.mortgageGdp2026 - c.mortgageGdp2010).toFixed(1);
        return `<tr>
          <td class="font-semibold">${c.name}</td>
          <td>${c.mortgageGdp2000}%</td>
          <td>${c.mortgageGdp2010}%</td>
          <td class="font-bold text-[#C86D51]">${c.mortgageGdp2026}%</td>
          <td>${diff > 0 ? '+' : ''}${diff} pct</td>
          <td>${c.bankReShare}%</td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
  }

  // Chart 12: Household Debt to GDP (2000 vs 2010 vs 2026)
  const items12 = [...filtered].sort((a, b) => b.hhDebtGdp2026 - a.hhDebtGdp2026).slice(0, 22);
  createOrUpdateChart('chart12', 'chart12HouseholdDebtGdp', {
    type: 'bar',
    data: {
      labels: items12.map(c => c.name),
      datasets: [
        { label: '2000年 居民总债务/GDP (%)', data: items12.map(c => c.hhDebtGdp2000), backgroundColor: '#857D7488', borderRadius: 2 },
        { label: '2010年 居民总债务/GDP (%)', data: items12.map(c => c.hhDebtGdp2010), backgroundColor: '#5B7C99', borderRadius: 2 },
        { label: '2026年 居民总债务/GDP (%)', data: items12.map(c => c.hhDebtGdp2026), backgroundColor: '#6B8E78', borderRadius: 2 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
      scales: {
        y: { title: { display: true, text: '居民部门总债务占 GDP 比例 (%)', font: { size: 11 } }, grid: { color: '#EFECE4' } },
        x: { ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 30 } }
      }
    }
  });

  const tbl12 = document.getElementById('tablePanelChart12');
  if (tbl12) {
    tbl12.innerHTML = `<table class="w-full text-left data-table">
      <thead><tr><th>国家/地区</th><th>2000年 居民债务/GDP</th><th>2010年 居民债务/GDP</th><th>2026年 居民债务/GDP</th><th>2010–2026 债务趋势</th><th>IMF/BIS 85%警戒线诊断</th></tr></thead>
      <tbody>${filtered.map(c => {
        const d = +(c.hhDebtGdp2026 - c.hhDebtGdp2010).toFixed(1);
        return `<tr>
          <td class="font-semibold">${c.name}</td>
          <td>${c.hhDebtGdp2000}%</td>
          <td>${c.hhDebtGdp2010}%</td>
          <td class="font-bold text-[#6B8E78]">${c.hhDebtGdp2026}%</td>
          <td>${d > 0 ? '加杠杆 (+' + d + '%)' : '去杠杆 (' + d + '%)'}</td>
          <td>${c.hhDebtGdp2026 >= 85 ? '高负债敏感区 (≥85%)' : (c.hhDebtGdp2026 >= 60 ? '中等负债区 (60%-85%)' : '低负债安全区 (<60%)')}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
  }

  // Chart 13: Real Estate Investment to GDP & Bank/Fiscal Reliance
  const view13 = appState.chart13View;
  const items13 = [...filtered]
    .sort((a, b) => view13 === 'inv_gdp' ? b.reInvGdpPeak - a.reInvGdpPeak : b.bankReShare - a.bankReShare)
    .slice(0, 22);

  const ds13 = view13 === 'inv_gdp'
    ? [
        { label: '历史峰值期 房地产开发投资/GDP (%)', data: items13.map(c => c.reInvGdpPeak), backgroundColor: '#C86D51', borderRadius: 3 },
        { label: '2026年 房地产开发投资/GDP (%)', data: items13.map(c => c.reInvGdp2026), backgroundColor: '#5B7C99', borderRadius: 3 }
      ]
    : [
        { label: '商业银行房地产贷款集中度 (%)', data: items13.map(c => c.bankReShare), backgroundColor: '#5B7C99', borderRadius: 3 },
        { label: '土地出让/不动产税占地方财政比例 (%)', data: items13.map(c => c.landFiscalReliance), backgroundColor: '#D49A45', borderRadius: 3 }
      ];

  createOrUpdateChart('chart13', 'chart13ReInvestmentGdp', {
    type: 'bar',
    data: { labels: items13.map(c => c.name), datasets: ds13 },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
      scales: {
        y: { title: { display: true, text: '占比 (%)', font: { size: 11 } }, grid: { color: '#EFECE4' } },
        x: { ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 30 } }
      }
    }
  });

  const tbl13 = document.getElementById('tablePanelChart13');
  if (tbl13) {
    tbl13.innerHTML = `<table class="w-full text-left data-table">
      <thead><tr><th>国家/地区</th><th>峰值地产投资/GDP</th><th>2026地产投资/GDP</th><th>占固定资产投资比</th><th>银行涉房贷款占比</th><th>地方土地/物业税依赖度</th></tr></thead>
      <tbody>${filtered.map(c => `<tr>
        <td class="font-semibold">${c.name}</td>
        <td>${c.reInvGdpPeak}%</td>
        <td class="font-bold text-[#5B7C99]">${c.reInvGdp2026}%</td>
        <td>${c.reInvFaiShare}%</td>
        <td>${c.bankReShare}%</td>
        <td>${c.landFiscalReliance}%</td>
      </tr>`).join('')}</tbody>
    </table>`;
  }

  // Chart 14: House Prices, Interest Rates, and Income Co-movement
  updateChart14();

  // Finance Risk Full Table
  const fBody = document.getElementById('financeRiskTableBody');
  if (fBody) {
    fBody.innerHTML = filtered.map(c => `<tr>
      <td class="font-semibold">${c.name}</td>
      <td>${c.mortgageGdp2026}%</td>
      <td class="font-bold ${c.hhDebtGdp2026 >= 85 ? 'text-[#C86D51]' : 'text-[#2C2825]'}">${c.hhDebtGdp2026}%</td>
      <td>${c.mortgageRate}%</td>
      <td class="text-xs">${c.rateType}</td>
      <td>${c.bankReShare}%</td>
      <td>${c.nplRate}%</td>
      <td>${c.reInvGdp2026}% (峰值${c.reInvGdpPeak}%)</td>
      <td>${c.landFiscalReliance}%</td>
      <td class="text-xs text-[#5C554E] max-w-xs">${c.assetRole}</td>
      <td class="text-xs font-medium">${c.riskLevel}</td>
    </tr>`).join('');
  }
}

function updateChart14() {
  const code = appState.chart14Country;
  const c = COUNTRIES.find(x => x.code === code) || COUNTRIES[0];

  const realPriceArr = YEARS_AXIS.map(yr => getSeriesValue(c.realSeries, yr));
  // Construct historically grounded income index (2010=100) and mortgage rate trajectory for the selected economy
  const inc2000 = 100 / (1 + (c.incomeRealGrowth2000_2026 / 100) * (10 / 26));
  const incomeArr = YEARS_AXIS.map(yr => {
    if (yr <= 2010) {
      const ratio = (yr - 1985) / 25;
      return +(inc2000 * 0.72 + ratio * (100 - inc2000 * 0.72)).toFixed(1);
    } else {
      const ratio = (yr - 2010) / 16;
      const endInc = inc2000 * (1 + c.incomeRealGrowth2000_2026 / 100);
      return +(100 + ratio * (endInc - 100)).toFixed(1);
    }
  });

  const rateProfiles = {
    US: [12.4, 10.1, 7.9, 8.1, 5.9, 6.0, 4.7, 3.9, 4.5, 3.1, 2.96, 5.3, 6.8, 6.7, 6.5, 6.45],
    JP: [7.0, 7.5, 4.2, 2.8, 2.3, 2.4, 1.9, 1.3, 1.1, 0.9, 0.85, 0.9, 0.95, 1.05, 1.12, 1.15],
    CN: [9.0, 9.8, 12.2, 5.58, 5.51, 6.8, 5.9, 5.15, 5.45, 5.1, 5.3, 4.3, 4.0, 3.45, 3.2, 3.15],
    HK: [10.5, 10.0, 9.0, 8.5, 5.2, 3.2, 2.1, 2.15, 2.35, 2.2, 1.65, 3.1, 4.12, 4.15, 4.12, 4.12],
    TW: [9.2, 9.5, 7.8, 6.2, 2.6, 2.7, 1.75, 1.92, 1.63, 1.36, 1.35, 1.85, 2.07, 2.18, 2.19, 2.18],
    DE: [8.2, 8.9, 7.4, 6.1, 4.3, 4.9, 3.6, 1.9, 1.8, 1.3, 1.3, 2.8, 3.9, 3.7, 3.65, 3.65],
    GB: [12.8, 14.5, 7.8, 6.4, 5.1, 5.6, 3.8, 2.6, 2.1, 1.8, 1.6, 4.2, 5.4, 4.9, 4.7, 4.65],
    CA: [11.8, 13.2, 8.4, 7.2, 5.5, 5.8, 4.1, 2.9, 3.4, 2.1, 1.9, 4.6, 5.8, 5.2, 4.8, 4.65],
    KR: [11.5, 11.0, 10.2, 8.2, 5.6, 6.5, 5.1, 3.1, 3.4, 2.5, 2.9, 4.6, 4.5, 4.2, 4.15, 4.15],
    ES: [14.5, 15.2, 10.5, 5.8, 3.4, 5.2, 2.6, 2.1, 1.9, 1.6, 1.45, 2.6, 3.8, 3.6, 3.5, 3.45]
  };
  const rateArr = rateProfiles[code] || YEARS_AXIS.map(() => c.mortgageRate);

  createOrUpdateChart('chart14', 'chart14PriceRateIncome', {
    type: 'line',
    data: {
      labels: YEARS_AXIS,
      datasets: [
        {
          label: `${c.name} 实际房价指数 (2010=100, 左轴)`,
          data: realPriceArr,
          borderColor: '#C86D51',
          backgroundColor: '#C86D5122',
          yAxisID: 'y',
          borderWidth: 2.5,
          tension: 0.25
        },
        {
          label: `${c.name} 居民实际可支配收入指数 (2010=100, 左轴)`,
          data: incomeArr,
          borderColor: '#6B8E78',
          borderDash: [5, 4],
          yAxisID: 'y',
          borderWidth: 2.2,
          tension: 0.25
        },
        {
          label: `${c.name} 按揭贷款利率 (%, 右轴)`,
          data: rateArr,
          borderColor: '#5B7C99',
          backgroundColor: '#5B7C9933',
          yAxisID: 'y1',
          borderWidth: 2,
          tension: 0.2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
      scales: {
        y: { position: 'left', title: { display: true, text: '指数 (2010 = 100)', font: { size: 11 } }, grid: { color: '#EFECE4' } },
        y1: { position: 'right', title: { display: true, text: '按揭贷款利率 (%)', font: { size: 11 } }, grid: { drawOnChartArea: false } }
      }
    }
  });

  const tbl14 = document.getElementById('tablePanelChart14');
  if (tbl14) {
    tbl14.innerHTML = `<table class="w-full text-left data-table">
      <thead><tr><th>年份</th><th>${c.name} 实际房价指数 (2010=100)</th><th>居民实际收入指数 (2010=100)</th><th>住房按揭利率 (%)</th></tr></thead>
      <tbody>${YEARS_AXIS.map((yr, idx) => `<tr>
        <td class="font-semibold">${yr}</td>
        <td class="text-[#C86D51] font-bold">${realPriceArr[idx]}</td>
        <td class="text-[#6B8E78]">${incomeArr[idx]}</td>
        <td class="text-[#5B7C99]">${rateArr[idx]}%</td>
      </tr>`).join('')}</tbody>
    </table>`;
  }
}

// ---------- CHART 16 & CASE STUDIES ----------
function updateTimelineAndCases() {
  const era = appState.timelineEra;
  const evs = BUBBLE_EVENTS.filter(e => era === 'ALL' || e.era === era);

  createOrUpdateChart('chart16', 'chart16BubbleTimeline', {
    type: 'bar',
    data: {
      labels: evs.map(e => `${e.year} ${e.country.split('/')[0].trim()}`),
      datasets: [
        {
          label: '关键事件时点实际房价指数 (2010=100)',
          data: evs.map(e => e.metric),
          backgroundColor: evs.map((_, i) => WARM_PALETTE[i % WARM_PALETTE.length]),
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: ctx => evs[ctx[0].dataIndex].title,
            label: ctx => `指数水平: ${ctx.parsed.y} (2010=100) | 周期影响: ${evs[ctx.dataIndex].drawdown}`
          }
        }
      },
      scales: {
        y: { title: { display: true, text: '实际房价指数 (2010=100)', font: { size: 11 } }, grid: { color: '#EFECE4' } },
        x: { ticks: { font: { size: 10 }, maxRotation: 35, minRotation: 20 } }
      }
    }
  });

  const tbl16 = document.getElementById('tablePanelChart16');
  if (tbl16) {
    tbl16.innerHTML = `<table class="w-full text-left data-table">
      <thead><tr><th>年份</th><th>国家/地区</th><th>标志性历史事件</th><th>指数水平(2010=100)</th><th>最大回撤/后续影响</th></tr></thead>
      <tbody>${evs.map(e => `<tr>
        <td class="font-bold text-[#C86D51]">${e.year}</td>
        <td class="font-semibold">${e.country}</td>
        <td>${e.title}</td>
        <td>${e.metric}</td>
        <td class="text-xs text-[#5C554E]">${e.drawdown}</td>
      </tr>`).join('')}</tbody>
    </table>`;
  }

  const cardsBox = document.getElementById('timelineEventsContainer');
  if (cardsBox) {
    cardsBox.innerHTML = evs.map(e => `<div class="bg-[#F6F3EC] p-3.5 rounded-lg border border-[#E3DDD1] hover:border-[#C86D51] transition-all cursor-pointer" onclick="selectCaseStudy('${e.code}')">
      <div class="flex items-center justify-between text-xs mb-1">
        <span class="font-bold text-[#C86D51]">${e.year} · ${e.country}</span>
        <span class="px-1.5 py-0.5 rounded badge-ochre text-[10px]">${e.drawdown}</span>
      </div>
      <div class="serif-title font-bold text-xs sm:text-sm text-[#2C2825] mb-1">${e.title}</div>
      <p class="text-xs text-[#5C554E] line-clamp-3">${e.desc}</p>
    </div>`).join('');
  }

  renderCaseStudySection();
}

function selectCaseStudy(code) {
  const exists = CASE_STUDIES.find(c => c.code === code);
  if (exists) {
    appState.activeCaseCode = code;
    renderCaseStudySection();
  }
}
window.selectCaseStudy = selectCaseStudy;

function renderCaseStudySection() {
  const btnsContainer = document.getElementById('caseStudyButtons');
  const detailPanel = document.getElementById('caseStudyDetailPanel');
  if (!btnsContainer || !detailPanel) return;

  btnsContainer.innerHTML = CASE_STUDIES.map(cs => {
    const active = cs.code === appState.activeCaseCode;
    return `<button type="button" onclick="selectCaseStudy('${cs.code}')" class="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
      active
        ? 'bg-[#C86D51] text-white border-[#C86D51] font-semibold shadow-sm'
        : 'bg-[#F6F3EC] text-[#2C2825] border-[#E3DDD1] hover:border-[#C86D51]'
    }">${cs.name}</button>`;
  }).join('');

  const cs = CASE_STUDIES.find(x => x.code === appState.activeCaseCode) || CASE_STUDIES[0];
  const countryObj = COUNTRIES.find(x => x.code === cs.code);

  detailPanel.innerHTML = `
    <div class="bg-[#F6F3EC] p-4 rounded-xl border border-[#E3DDD1]">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h4 class="serif-title text-lg font-bold text-[#2C2825]">${cs.name} — ${cs.tag}</h4>
        ${countryObj ? `<a href="${countryObj.sourceUrl}" target="_blank" rel="noopener" class="text-xs underline text-[#5B7C99]">权威数据源: ${countryObj.sourceName} ↗</a>` : ''}
      </div>
      <p class="text-xs sm:text-sm text-[#5C554E] mb-4">${cs.summary}</p>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        ${cs.keyMetrics.map(m => `<div class="bg-[#FFFDF9] p-3 rounded-lg border border-[#E3DDD1]">
          <div class="text-[11px] text-[#857D74]">${m.label}</div>
          <div class="serif-title text-sm sm:text-base font-bold text-[#C86D51] mt-0.5">${m.val}</div>
        </div>`).join('')}
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      ${cs.sections.map(sec => `<div class="bg-[#FFFDF9] p-4 rounded-xl border border-[#E3DDD1]">
        <h5 class="serif-title font-bold text-sm text-[#2C2825] mb-2 pb-1.5 border-b border-[#EFECE4]">${sec.title}</h5>
        <p class="text-xs text-[#5C554E] leading-relaxed">${sec.text}</p>
      </div>`).join('')}
    </div>
  `;
}

// ---------- CHART 15 & SCORING SYSTEM ----------
function updateScoringAndConclusions() {
  const scored = computeMultiDimensionalScores();
  const filterMode = appState.chart15Filter;

  let displayList = [];
  if (filterMode === 'top25') {
    displayList = [...scored].sort((a, b) => b.scores.total - a.scores.total).slice(0, 25);
  } else if (filterMode === 'bottom25') {
    displayList = [...scored].sort((a, b) => a.scores.total - b.scores.total).slice(0, 25);
  } else {
    const majorCodes = ['US', 'CN', 'JP', 'DE', 'GB', 'FR', 'CA', 'AU', 'KR', 'SG', 'HK', 'TW', 'MO', 'IN', 'BR', 'MX', 'ZA', 'SA', 'CH', 'SE'];
    displayList = scored.filter(c => majorCodes.includes(c.code)).sort((a, b) => b.scores.total - a.scores.total);
  }

  createOrUpdateChart('chart15', 'chart15ComprehensiveScore', {
    type: 'bar',
    data: {
      labels: displayList.map(c => `${c.name} (${c.scores.total})`),
      datasets: [
        { label: '可负担性加权分', data: displayList.map(c => c.scores.c1), backgroundColor: '#6B8E78' },
        { label: '租售均衡加权分', data: displayList.map(c => c.scores.c2), backgroundColor: '#5B7C99' },
        { label: '住房供给加权分', data: displayList.map(c => c.scores.c3), backgroundColor: '#D49A45' },
        { label: '金融稳健加权分', data: displayList.map(c => c.scores.c4), backgroundColor: '#C86D51' },
        { label: '周期平稳加权分', data: displayList.map(c => c.scores.c5), backgroundColor: '#8E5B66' },
        { label: '收入同步加权分', data: displayList.map(c => c.scores.c6), backgroundColor: '#7A6F64' }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 11, font: { size: 10 } } } },
      scales: {
        x: { stacked: true, max: 100, title: { display: true, text: '综合健康度与可负担性评分 (0–100分)', font: { size: 11 } } },
        y: { stacked: true, ticks: { font: { size: 10 } } }
      }
    }
  });

  const tbl15 = document.getElementById('tablePanelChart15');
  if (tbl15) {
    const allSorted = [...scored].sort((a, b) => b.scores.total - a.scores.total);
    tbl15.innerHTML = `<table class="w-full text-left data-table">
      <thead><tr><th>全球排名</th><th>国家/地区</th><th>综合总分</th><th>可负担性(S1)</th><th>租售均衡(S2)</th><th>供给品质(S3)</th><th>金融稳健(S4)</th><th>周期平稳(S5)</th><th>收入同步(S6)</th></tr></thead>
      <tbody>${allSorted.map((c, idx) => `<tr>
        <td class="font-bold">#${idx + 1}</td>
        <td class="font-semibold">${c.name}</td>
        <td class="font-bold text-[#C86D51]">${c.scores.total}</td>
        <td>${c.scores.s1}</td>
        <td>${c.scores.s2}</td>
        <td>${c.scores.s3}</td>
        <td>${c.scores.s4}</td>
        <td>${c.scores.s5}</td>
        <td>${c.scores.s6}</td>
      </tr>`).join('')}</tbody>
    </table>`;
  }

  const grid10 = document.getElementById('tenConclusionsGrid');
  if (grid10 && !grid10.innerHTML) {
    grid10.innerHTML = TEN_CONCLUSIONS.map(item => `<div class="bg-[#F6F3EC] p-4 rounded-xl border border-[#E3DDD1]">
      <div class="flex items-center justify-between mb-1.5">
        <span class="text-xs font-bold text-[#C86D51]">${item.num}</span>
        <span class="px-2 py-0.5 rounded badge-blue text-[11px]">${item.badge}</span>
      </div>
      <h4 class="serif-title font-bold text-sm sm:text-base text-[#2C2825] mb-2">${item.q}</h4>
      <p class="text-xs text-[#5C554E] leading-relaxed">${item.a}</p>
    </div>`).join('');
  }
}

// ---------- MASTER 57-ECONOMY DATABASE TABLE & CSV EXPORT ----------
function renderMasterDatabase() {
  const tbody = document.getElementById('masterDatabaseBody');
  if (!tbody) return;
  const scoredMap = {};
  computeMultiDimensionalScores().forEach(s => { scoredMap[s.code] = s.scores.total; });
  const filtered = getFilteredCountries();

  tbody.innerHTML = filtered.map(c => {
    const cum40 = computePeriodGrowth(c, '1985_2026', 'real');
    const cagrReal = computeCAGR(c, 'long', 'real');
    const badgeCls = c.status2026 === 'Actual' ? 'badge-sage' : (c.status2026 === 'Preliminary' ? 'badge-blue' : 'badge-ochre');
    return `<tr>
      <td class="font-semibold text-[#2C2825]">${c.name} (${c.code})</td>
      <td>${c.regionCn}</td>
      <td>${c.startYear}</td>
      <td class="font-bold text-[#6B8E78]">${c.real2026}</td>
      <td>${c.nominal2026}</td>
      <td class="${cum40 >= 0 ? 'text-[#C86D51] font-semibold' : 'text-[#5B7C99]'}">${cum40 > 0 ? '+' : ''}${cum40}%</td>
      <td>${cagrReal}%</td>
      <td>${c.pirIntl}x / ${c.pirOfficial}x</td>
      <td class="font-semibold">${c.pirCapital}x</td>
      <td>${c.prr}x</td>
      <td>${c.rentalYield}%</td>
      <td>${c.mortgageIncomeRatio}%</td>
      <td>${c.homeownership}%</td>
      <td>${c.perCapitaSqm}㎡</td>
      <td>${c.mortgageGdp2026}%</td>
      <td>${c.hhDebtGdp2026}%</td>
      <td class="font-bold text-[#C86D51]">${scoredMap[c.code] || '-'}</td>
      <td><span class="px-1.5 py-0.5 rounded text-[10px] ${badgeCls}">${c.status2026}</span></td>
      <td><a href="${c.sourceUrl}" target="_blank" rel="noopener" class="underline text-[#5B7C99] text-xs">${c.sourceName}</a></td>
    </tr>`;
  }).join('');
}

function exportMasterCsv() {
  const filtered = getFilteredCountries();
  const headers = [
    'Code','Name','Region','StartYear','Status2026','RealIndex2026_2010_100','NominalIndex2026_2010_100',
    'RealGrowth_1985_2026_Pct','RealCAGR_Pct','NatSqmUSD','CapitalSqmUSD','PIR_Intl','PIR_Official','PIR_Capital',
    'PriceToRentRatio','GrossRentalYield_Pct','MortgageToIncome_Pct','RentToIncome_Pct','Homeownership_Pct',
    'PerCapitaSqm','VacancyRate_Pct','MortgageToGDP2026_Pct','HouseholdDebtToGDP2026_Pct','ReInvToGDP2026_Pct','SourceURL'
  ];
  const lines = [headers.join(',')];
  filtered.forEach(c => {
    const row = [
      c.code, `"${c.name}"`, c.region, c.startYear, c.status2026, c.real2026, c.nominal2026,
      computePeriodGrowth(c, '1985_2026', 'real'), computeCAGR(c, 'long', 'real'),
      c.natSqmUsd, c.capSqmUsd, c.pirIntl, c.pirOfficial, c.pirCapital,
      c.prr, c.rentalYield, c.mortgageIncomeRatio, c.rentIncomeRatio, c.homeownership,
      c.perCapitaSqm, c.vacancyRate, c.mortgageGdp2026, c.hhDebtGdp2026, c.reInvGdp2026, `"${c.sourceUrl}"`
    ];
    lines.push(row.join(','));
  });
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'global_57_economies_housing_research_1985_2026.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ==================== REFRESH ALL VIEWS ====================
function refreshAllViews() {
  renderCountrySelectorChips();
  updateCharts1And2();
  updateCharts3And4();
  renderAbsPriceTable();
  updateAffordabilityCharts();
  updateSupplyCharts();
  updateFinanceCharts();
  updateTimelineAndCases();
  updateScoringAndConclusions();
  renderMasterDatabase();
}

export function initRealEstateModule() {
  // Navigation Tabs
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab');
      appState.activeTab = target;
      document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-panel').forEach(panel => {
        if (panel.id === target) panel.classList.remove('hidden');
        else panel.classList.add('hidden');
      });
      refreshAllViews();
    });
  });

  // Region Filter Buttons
  document.querySelectorAll('.region-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      appState.regionFilter = btn.getAttribute('data-region');
      document.querySelectorAll('.region-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      refreshAllViews();
    });
  });

  // Global Price Mode, Period & Search
  document.getElementById('globalPriceMode')?.addEventListener('change', (e) => {
    appState.priceMode = e.target.value;
    refreshAllViews();
  });
  document.getElementById('globalPeriodSelect')?.addEventListener('change', (e) => {
    appState.periodWindow = e.target.value;
    appState.chart3Window = e.target.value;
    const c3Sel = document.getElementById('chart3WindowSelect');
    if (c3Sel) c3Sel.value = e.target.value;
    refreshAllViews();
  });
  document.getElementById('globalSearchInput')?.addEventListener('input', (e) => {
    appState.searchQuery = e.target.value;
    refreshAllViews();
  });

  // Preset Buttons for Multi-country Line Chart
  document.getElementById('btnPresetMajor')?.addEventListener('click', () => {
    appState.selectedLineCodes = ['US', 'JP', 'CN', 'HK', 'TW', 'DE', 'GB', 'SG', 'KR', 'CA'];
    renderCountrySelectorChips();
    updateCharts1And2();
  });
  document.getElementById('btnPresetBubble')?.addEventListener('click', () => {
    appState.selectedLineCodes = ['JP', 'HK', 'US', 'ES', 'IE', 'CN', 'SE', 'CA', 'MO'];
    renderCountrySelectorChips();
    updateCharts1And2();
  });
  document.getElementById('btnPresetEmerging')?.addEventListener('click', () => {
    appState.selectedLineCodes = ['CN', 'IN', 'MY', 'TH', 'PH', 'VN', 'MX', 'CL', 'BR', 'ZA'];
    renderCountrySelectorChips();
    updateCharts1And2();
  });
  document.getElementById('btnPresetEurope')?.addEventListener('click', () => {
    appState.selectedLineCodes = ['DE', 'FR', 'GB', 'IT', 'ES', 'NL', 'CH', 'SE', 'PL', 'HU'];
    renderCountrySelectorChips();
    updateCharts1And2();
  });

  // Individual Chart Controls
  document.getElementById('chart1Submarket')?.addEventListener('change', e => {
    appState.chart1Submarket = e.target.value;
    updateCharts1And2();
  });
  document.getElementById('chart1LogScale')?.addEventListener('change', e => {
    appState.chart1LogScale = e.target.checked;
    updateCharts1And2();
  });
  document.getElementById('chart2BaseYear')?.addEventListener('change', e => {
    appState.chart2BaseYear = e.target.value;
    updateCharts1And2();
  });
  document.getElementById('chart3WindowSelect')?.addEventListener('change', e => {
    appState.chart3Window = e.target.value;
    updateCharts3And4();
  });
  document.getElementById('chart4PeriodSelect')?.addEventListener('change', e => {
    appState.chart4Period = e.target.value;
    updateCharts3And4();
  });
  document.getElementById('absPriceSortSelect')?.addEventListener('change', e => {
    appState.absPriceSort = e.target.value;
    renderAbsPriceTable();
  });
  document.getElementById('chart5ModeSelect')?.addEventListener('change', e => {
    appState.chart5Mode = e.target.value;
    updateAffordabilityCharts();
  });
  document.getElementById('chart6ScopeSelect')?.addEventListener('change', e => {
    appState.chart6Scope = e.target.value;
    updateAffordabilityCharts();
  });
  document.getElementById('chart7SortSelect')?.addEventListener('change', e => {
    appState.chart7Sort = e.target.value;
    updateAffordabilityCharts();
  });
  document.getElementById('chart8MetricSelect')?.addEventListener('change', e => {
    appState.chart8Metric = e.target.value;
    updateAffordabilityCharts();
  });
  document.getElementById('chart9SortSelect')?.addEventListener('change', e => {
    appState.chart9Sort = e.target.value;
    updateSupplyCharts();
  });
  document.getElementById('chart10MetricSelect')?.addEventListener('change', e => {
    appState.chart10Metric = e.target.value;
    updateSupplyCharts();
  });
  document.getElementById('chart13ViewSelect')?.addEventListener('change', e => {
    appState.chart13View = e.target.value;
    updateFinanceCharts();
  });
  document.getElementById('chart14CountrySelect')?.addEventListener('change', e => {
    appState.chart14Country = e.target.value;
    updateChart14();
  });
  document.getElementById('chart15FilterSelect')?.addEventListener('change', e => {
    appState.chart15Filter = e.target.value;
    updateScoringAndConclusions();
  });

  // Timeline Era Buttons
  document.querySelectorAll('.timeline-era-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      appState.timelineEra = btn.getAttribute('data-era');
      document.querySelectorAll('.timeline-era-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateTimelineAndCases();
    });
  });

  // Weight Sliders for Chart 15
  [1, 2, 3, 4, 5, 6].forEach(idx => {
    const sl = document.getElementById(`wSlider${idx}`);
    if (sl) {
      sl.addEventListener('input', () => {
        appState.weights[`w${idx}`] = parseInt(sl.value, 10);
        document.getElementById(`wVal${idx}`).textContent = `${sl.value}%`;
        updateScoringAndConclusions();
        renderMasterDatabase();
      });
    }
  });
  document.getElementById('btnResetWeights')?.addEventListener('click', () => {
    const defaults = { w1: 25, w2: 15, w3: 20, w4: 20, w5: 10, w6: 10 };
    appState.weights = { ...defaults };
    [1, 2, 3, 4, 5, 6].forEach(idx => {
      document.getElementById(`wSlider${idx}`).value = defaults[`w${idx}`];
      document.getElementById(`wVal${idx}`).textContent = `${defaults[`w${idx}`]}%`;
    });
    updateScoringAndConclusions();
    renderMasterDatabase();
  });

  document.getElementById('btnExportFullCsv')?.addEventListener('click', exportMasterCsv);

  window.toggleTablePanel = toggleTablePanel;
  window.selectCaseStudy = selectCaseStudy;
  window.reFilterSearch = function(val) {
    appState.searchQuery = val;
    const el = document.getElementById('globalSearchInput');
    if (el && el.value !== val) el.value = val;
    refreshAllViews();
  };

  initSimulator();
  refreshAllViews();
}
