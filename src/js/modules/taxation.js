/**
 * taxation.js — 板块二：全球主要国家与地区综合税制深度比较研究模块 (2000–2026)
 * --------------------------------------------------------------------------
 * 负责综合税制板块的状态管理、14个动态图表、8步税负传导模拟器、国别税制档案卡、5维税制评估与CSV导出。
 * 数据源自 data-manager.js，纯计算逻辑源自 index-calculator.js，图表实例由 chart-manager.js 统一托管。
 */

import { dataManager } from '../data/data-manager.js';
import { chartManager } from '../charts/chart-manager.js';
import { getContinentColor, getContinentTag } from '../charts/chart-utils.js';
import {
  calculate8StepSim as calc8StepSim,
  computeTaxEvalScores
} from '../calculations/index-calculator.js';

const taxDataset = dataManager.getTaxationData();
const JURISDICTIONS = taxDataset.jurisdictions;

let state = {
  continent: 'ALL',
  wedgeMode: 'broad',
  searchQuery: '',
  overviewSortCol: 'taxWedge',
  overviewSortAsc: false,
  profileIds: ['CN-ML', 'TW', 'HK', 'MO', 'SG', 'JP', 'US', 'DE']
};

const charts = chartManager.getNamespaceProxy('tax');

function getFilteredData() {
  return dataManager.filterTaxJurisdictions(state.continent, state.searchQuery);
}

function calculate8StepSim(country, householdType, incomeTierIdx, currencyMode) {
  return calc8StepSim(country, householdType, incomeTierIdx, currencyMode, state.wedgeMode);
}

function setContinent(cont) {
  state.continent = cont;
  document.querySelectorAll('#continentFilterGroup .pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cont === cont);
  });
  refreshAllViews();
}

function setWedgeMode(mode) {
  state.wedgeMode = mode;
  document.querySelectorAll('#wedgeModeGroup .pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  refreshAllViews();
}

function handleGlobalSearch(val) {
  state.searchQuery = val.trim();
  refreshAllViews();
}

function switchTab(tabId) {
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === tabId);
  });
  setTimeout(() => {
    Object.values(charts).forEach(ch => {
      if (ch && typeof ch.resize === 'function') ch.resize();
    });
  }, 50);
}

// ==================== CORE 8-STEP SIMULATION ENGINE ====================

function renderOverviewKpis() {
  const data = getFilteredData();
  if (!data.length) return;
  const useBroad = state.wedgeMode === 'broad';
  const avgPitTop = (data.reduce((s, d) => s + d.pitTop, 0) / data.length).toFixed(1);
  const avgPitEff = (data.reduce((s, d) => s + d.pitEff[2], 0) / data.length).toFixed(1);
  const avgWedge = (data.reduce((s, d) => s + (useBroad ? d.taxWedgeBroad : d.taxWedge), 0) / data.length).toFixed(1);
  const avgVat = (data.reduce((s, d) => s + d.vatStd, 0) / data.length).toFixed(1);
  const avgEffCons = (data.reduce((s, d) => s + d.effConsRate, 0) / data.length).toFixed(1);
  const avgTaxGdp = (data.reduce((s, d) => s + d.taxToGdp, 0) / data.length).toFixed(1);

  document.getElementById('overviewKpiGrid').innerHTML = `
    <div class="kpi-card">
      <div class="kpi-title">当前筛选覆盖司法管辖区</div>
      <div class="kpi-val">${data.length} <span style="font-size:14px;font-weight:500;">个国家/地区</span></div>
      <div class="kpi-sub">中国大陆、台湾、香港、澳门独立统计</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">个税最高法定 vs 平均工资实际税率</div>
      <div class="kpi-val">${avgPitTop}% <span style="font-size:15px;color:var(--sage);">vs ${avgPitEff}%</span></div>
      <div class="kpi-sub">法定最高税率比普通人实际税率高 ${(avgPitTop - avgPitEff).toFixed(1)} 个百分点</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">平均综合劳动税楔 (${useBroad ? '广义含公积金' : 'OECD狭义'})</div>
      <div class="kpi-val">${avgWedge}%</div>
      <div class="kpi-sub">(个税+雇员社保+雇主社保) ÷ 总用工成本</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">标准VAT/GST vs 实际消费税负率</div>
      <div class="kpi-val">${avgVat}% <span style="font-size:15px;color:var(--terracotta);">vs ${avgEffCons}%</span></div>
      <div class="kpi-sub">食品/房租/医疗豁免与储蓄倾向折算后</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">平均宏观税负 (税收收入/GDP)</div>
      <div class="kpi-val">${avgTaxGdp}%</div>
      <div class="kpi-sub">区间：阿联酋 6.5% 至 丹麦 45.2%</div>
    </div>
  `;
}

function getSortedDataForChart(metricFn) {
  const data = [...getFilteredData()];
  const order = document.getElementById('chartSortOrder')?.value || 'desc';
  if (order === 'desc') {
    data.sort((a, b) => metricFn(b) - metricFn(a));
  } else if (order === 'asc') {
    data.sort((a, b) => metricFn(a) - metricFn(b));
  }
  return data;
}

function destroyChart(key) {
  chartManager.destroy('tax', key);
}

// Chart 1: PIT Top Marginal vs 100% AW Effective Rate
function renderChart1() {
  destroyChart('c1');
  const data = getSortedDataForChart(d => d.pitTop);
  const ctx = document.getElementById('chart1PitTop').getContext('2d');
  charts['c1'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.name),
      datasets: [
        {
          label: '最高法定边际税率 (%)',
          data: data.map(d => d.pitTop),
          backgroundColor: 'rgba(200, 125, 101, 0.82)',
          borderRadius: 3
        },
        {
          label: '100%平均工资实际有效个税率 (%)',
          data: data.map(d => d.pitEff[2]),
          backgroundColor: 'rgba(122, 154, 139, 0.90)',
          borderRadius: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            afterBody: (items) => {
              const d = data[items[0].dataIndex];
              return `最低起征税率: ${d.pitMin}% | 剪刀差: ${(d.pitTop - d.pitEff[2]).toFixed(1)}个百分点`;
            }
          }
        }
      },
      scales: {
        x: { ticks: { font: { size: 10 }, maxRotation: 60, minRotation: 45 } },
        y: { beginAtZero: true, max: 60, title: { display: true, text: '税率 (%)' } }
      }
    }
  });
}

// Chart 2: Effective PIT across 5 Income Tiers
function renderChart2() {
  destroyChart('c2');
  const tierSel = document.getElementById('chart2TierSelect')?.value || 'ALL';
  const ctx = document.getElementById('chart2PitTiers').getContext('2d');

  if (tierSel === 'ALL') {
    // Show representative subset if ALL 55 is selected so 5 bars/lines are legible, or all if continent filtered
    let data = getSortedDataForChart(d => d.pitEff[4]);
    if (data.length > 22) {
      const repIds = ['CN-ML', 'TW', 'HK', 'MO', 'JP', 'KR', 'SG', 'IN', 'VN', 'SA', 'ZA', 'EG', 'DE', 'FR', 'GB', 'SE', 'DK', 'CH', 'IE', 'HU', 'US', 'CA', 'BR', 'CL'];
      data = data.filter(d => repIds.includes(d.id));
    }
    charts['c2'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.name),
        datasets: [
          { label: '低收入 (50% AW)', data: data.map(d => d.pitEff[0]), borderColor: '#6B8E78', backgroundColor: '#6B8E78', tension: 0.25, pointRadius: 3 },
          { label: '中低收入 (67% AW)', data: data.map(d => d.pitEff[1]), borderColor: '#5B7C99', backgroundColor: '#5B7C99', tension: 0.25, pointRadius: 3 },
          { label: '中等收入 (100% AW)', data: data.map(d => d.pitEff[2]), borderColor: '#D49A45', backgroundColor: '#D49A45', tension: 0.25, pointRadius: 3.5, borderWidth: 2.5 },
          { label: '中高收入 (167% AW)', data: data.map(d => d.pitEff[3]), borderColor: '#8E5B66', backgroundColor: '#8E5B66', tension: 0.25, pointRadius: 3 },
          { label: '高收入 (300% AW)', data: data.map(d => d.pitEff[4]), borderColor: '#C86D51', backgroundColor: '#C86D51', tension: 0.25, pointRadius: 3.5, borderWidth: 2.5 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'top', labels: { boxWidth: 10, font: { size: 11 } } } },
        scales: {
          x: { ticks: { font: { size: 10.5 }, maxRotation: 50, minRotation: 35 } },
          y: { beginAtZero: true, title: { display: true, text: '实际有效个人所得税率 (%)' } }
        }
      }
    });
  } else {
    const idx = parseInt(tierSel, 10);
    const tierNames = ['低收入 (50% AW)', '中低收入 (67% AW)', '中等收入 (100% AW)', '中高收入 (167% AW)', '高收入 (300% AW)'];
    const data = getSortedDataForChart(d => d.pitEff[idx]);
    charts['c2'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.name),
        datasets: [{
          label: `${tierNames[idx]} 实际个税率 (%)`,
          data: data.map(d => d.pitEff[idx]),
          backgroundColor: data.map(d => getContinentColor(d.continent, 0.85)),
          borderRadius: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: {
          x: { ticks: { font: { size: 10 }, maxRotation: 60, minRotation: 45 } },
          y: { beginAtZero: true, title: { display: true, text: '实际个税率 (%)' } }
        }
      }
    });
  }
}

// Chart 3: Employee vs Employer SSC
function renderChart3() {
  destroyChart('c3');
  const useBroad = state.wedgeMode === 'broad';
  const data = getSortedDataForChart(d => (useBroad ? d.sscEmpBroad + d.sscErBroad : d.sscEmp + d.sscEr));
  const ctx = document.getElementById('chart3Ssc').getContext('2d');
  charts['c3'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.name),
      datasets: [
        {
          label: useBroad ? '雇员承担社保+强制公积金 (%)' : '雇员承担政府社保 (%)',
          data: data.map(d => useBroad ? d.sscEmpBroad : d.sscEmp),
          backgroundColor: 'rgba(107, 142, 155, 0.88)',
          borderRadius: 2
        },
        {
          label: useBroad ? '雇主承担社保+强制公积金 (%)' : '雇主承担政府社保 (%)',
          data: data.map(d => useBroad ? d.sscErBroad : d.sscEr),
          backgroundColor: 'rgba(212, 163, 89, 0.88)',
          borderRadius: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } } },
      scales: {
        x: { stacked: true, ticks: { font: { size: 10 }, maxRotation: 60, minRotation: 45 } },
        y: { stacked: true, beginAtZero: true, title: { display: true, text: '占税前工资比例 (%)' } }
      }
    }
  });
}

// Chart 4: Standard VAT vs Effective Consumption Burden
function renderChart4() {
  destroyChart('c4');
  const data = getSortedDataForChart(d => d.vatStd);
  const ctx = document.getElementById('chart4Vat').getContext('2d');
  charts['c4'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.name),
      datasets: [
        {
          label: 'VAT/GST/销售税标准法定税率 (%)',
          data: data.map(d => d.vatStd),
          backgroundColor: 'rgba(155, 126, 142, 0.78)',
          borderRadius: 3
        },
        {
          label: '居民可支配收入实际消费间接税负率 (%)',
          data: data.map(d => d.effConsRate),
          backgroundColor: 'rgba(200, 125, 101, 0.92)',
          borderRadius: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            afterBody: (items) => {
              const d = data[items[0].dataIndex];
              return `普通食品税率: ${d.catRates.food}% | 优惠与豁免: ${d.vatRed.slice(0, 48)}...`;
            }
          }
        }
      },
      scales: {
        x: { ticks: { font: { size: 10 }, maxRotation: 60, minRotation: 45 } },
        y: { beginAtZero: true, max: 30, title: { display: true, text: '税率 (%)' } }
      }
    }
  });
}

// Chart 5: Comprehensive Labor Tax Wedge
function renderChart5() {
  destroyChart('c5');
  const useBroad = state.wedgeMode === 'broad';
  const data = getSortedDataForChart(d => useBroad ? d.taxWedgeBroad : d.taxWedge);
  const ctx = document.getElementById('chart5Wedge').getContext('2d');
  charts['c5'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.name),
      datasets: [{
        label: useBroad ? '广义综合劳动税楔 (含公积金/强制私人养老 %)' : 'OECD狭义综合劳动税楔 (%)',
        data: data.map(d => useBroad ? d.taxWedgeBroad : d.taxWedge),
        backgroundColor: data.map(d => getContinentColor(d.continent, 0.85)),
        borderRadius: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            afterBody: (items) => {
              const d = data[items[0].dataIndex];
              return `OECD狭义税楔: ${d.taxWedge}% | 广义强制负担税楔: ${d.taxWedgeBroad}%`;
            }
          }
        }
      },
      scales: {
        x: { ticks: { font: { size: 10 }, maxRotation: 60, minRotation: 45 } },
        y: { beginAtZero: true, max: 60, title: { display: true, text: '占总用工成本比例 (%)' } }
      }
    }
  });
}

// Chart 6: Historical Tax-to-GDP Trend (2000-2026)
function renderChart6() {
  destroyChart('c6');
  const allYears = ['2000', '2005', '2010', '2015', '2020', '2022', '2023', '2024', '2025', '2026'];
  const startY = document.getElementById('chart6StartYear')?.value || '2000';
  const endY = document.getElementById('chart6EndYear')?.value || '2026';
  const years = allYears.filter(y => parseInt(y) >= parseInt(startY) && parseInt(y) <= parseInt(endY));

  let filtered = getFilteredData();
  // Select representative 10 countries from filtered list so lines are clean and readable
  const priorityIds = ['DK', 'FR', 'DE', 'US', 'JP', 'KR', 'BR', 'ZA', 'CN-ML', 'TW', 'HK', 'MO', 'SG', 'VN', 'IN', 'MX', 'CL', 'EG', 'SE', 'GB'];
  let rep = filtered.filter(d => priorityIds.includes(d.id)).slice(0, 10);
  if (rep.length < 5) rep = filtered.slice(0, 10);

  const palette = ['#C86D51', '#5B7C99', '#6B8E78', '#D49A45', '#8E5B66', '#6E6A64', '#B56576', '#588157', '#BC6C25', '#3D5A80'];
  const ctx = document.getElementById('chart6Trend').getContext('2d');
  charts['c6'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: years.map(y => y === '2026' ? '2026(截至11月)' : y),
      datasets: rep.map((d, i) => ({
        label: d.name,
        data: years.map(y => d.histTaxGdp[y] === 'NA' ? null : d.histTaxGdp[y]),
        borderColor: palette[i % palette.length],
        backgroundColor: palette[i % palette.length],
        tension: 0.25,
        spanGaps: false,
        pointRadius: 3
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'top', labels: { boxWidth: 10, font: { size: 10.5 } } } },
      scales: {
        y: { beginAtZero: false, title: { display: true, text: '税收收入占 GDP 比例 (%)' } }
      }
    }
  });
}

// Chart 7: Macro Tax Structure Stacked Bar (% GDP)
function renderChart7() {
  destroyChart('c7');
  const data = getSortedDataForChart(d => d.taxToGdp);
  const ctx = document.getElementById('chart7MacroStack').getContext('2d');
  charts['c7'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.name),
      datasets: [
        { label: '个人所得税/GDP', data: data.map(d => d.macroBreakdown.pit), backgroundColor: '#C86D51' },
        { label: '企业所得税/GDP', data: data.map(d => d.macroBreakdown.cit), backgroundColor: '#D49A45' },
        { label: '社会保障缴款/GDP', data: data.map(d => d.macroBreakdown.ssc), backgroundColor: '#5B7C99' },
        { label: '消费与间接税/GDP', data: data.map(d => d.macroBreakdown.cons), backgroundColor: '#6B8E78' },
        { label: '财产与其他税/GDP', data: data.map(d => +(d.macroBreakdown.prop + d.macroBreakdown.other).toFixed(1)), backgroundColor: '#8E5B66' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'top', labels: { boxWidth: 10, font: { size: 10.5 } } } },
      scales: {
        x: { stacked: true, ticks: { font: { size: 10 }, maxRotation: 60, minRotation: 45 } },
        y: { stacked: true, beginAtZero: true, title: { display: true, text: '占 GDP 比例 (%)' } }
      }
    }
  });
}

// Chart 8: Combined PIT + SSC + Consumption Burden (% of Total Labor Cost)
function renderChart8() {
  destroyChart('c8');
  const data = getFilteredData().map(d => {
    const sim = calculate8StepSim(d, 'single', 2, 'ppp');
    const pitShare = (sim.step2Pit / sim.step5TotalLaborCost) * 100;
    const sscShare = ((sim.step3EmpSsc + sim.step4ErSsc) / sim.step5TotalLaborCost) * 100;
    const consShare = (sim.step7ConsTax / sim.step5TotalLaborCost) * 100;
    return { d, pitShare, sscShare, consShare, total: pitShare + sscShare + consShare };
  });
  const order = document.getElementById('chartSortOrder')?.value || 'desc';
  if (order === 'desc') data.sort((a, b) => b.total - a.total);
  else if (order === 'asc') data.sort((a, b) => a.total - b.total);

  const ctx = document.getElementById('chart8CombinedStack').getContext('2d');
  charts['c8'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(x => x.d.name),
      datasets: [
        { label: '个人所得税占总用工成本 (%)', data: data.map(x => +x.pitShare.toFixed(1)), backgroundColor: '#C86D51' },
        { label: '雇员+雇主社保占总用工成本 (%)', data: data.map(x => +x.sscShare.toFixed(1)), backgroundColor: '#5B7C99' },
        { label: '消费间接税占总用工成本 (%)', data: data.map(x => +x.consShare.toFixed(1)), backgroundColor: '#D49A45' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'top', labels: { boxWidth: 10, font: { size: 10.5 } } } },
      scales: {
        x: { stacked: true, ticks: { font: { size: 10 }, maxRotation: 60, minRotation: 45 } },
        y: { stacked: true, beginAtZero: true, max: 70, title: { display: true, text: '占雇主总用工成本比例 (%)' } }
      }
    }
  });
}

// Chart 9: Post-tax Disposable Income across Household Structures
function renderChart9() {
  destroyChart('c9');
  const mode = document.getElementById('chart9FamilySelect')?.value || 'compare';
  let data = getFilteredData();
  const ctx = document.getElementById('chart9Household').getContext('2d');

  if (mode === 'compare') {
    if (data.length > 22) {
      const repIds = ['CN-ML', 'TW', 'HK', 'MO', 'JP', 'KR', 'SG', 'IN', 'DE', 'FR', 'GB', 'IT', 'BE', 'CH', 'SE', 'DK', 'IE', 'PL', 'HU', 'US', 'CA', 'BR', 'CL', 'ZA'];
      data = data.filter(d => repIds.includes(d.id));
    }
    charts['c9'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.name),
        datasets: [
          {
            label: '单身雇员税后可支配率 (%税前)',
            data: data.map(d => +calculate8StepSim(d, 'single', 2, 'ppp').disposablePctOfGross.toFixed(1)),
            backgroundColor: 'rgba(107, 142, 155, 0.85)'
          },
          {
            label: '有2孩家庭税后可支配率 (%税前)',
            data: data.map(d => +calculate8StepSim(d, 'kids', 2, 'ppp').disposablePctOfGross.toFixed(1)),
            backgroundColor: 'rgba(122, 154, 139, 0.90)'
          },
          {
            label: '高收入雇员(300%AW)税后可支配率 (%税前)',
            data: data.map(d => +calculate8StepSim(d, 'high', 4, 'ppp').disposablePctOfGross.toFixed(1)),
            backgroundColor: 'rgba(200, 125, 101, 0.85)'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'top', labels: { boxWidth: 10, font: { size: 10.5 } } } },
        scales: {
          x: { ticks: { font: { size: 10 }, maxRotation: 55, minRotation: 40 } },
          y: { beginAtZero: false, min: 45, max: 102, title: { display: true, text: '税后可支配收入占税前工资 (%)' } }
        }
      }
    });
  } else {
    const tierIdx = mode === 'high' ? 4 : 2;
    const mapped = data.map(d => ({
      d,
      val: +calculate8StepSim(d, mode, tierIdx, 'ppp').disposablePctOfGross.toFixed(1)
    }));
    mapped.sort((a, b) => b.val - a.val);
    charts['c9'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: mapped.map(x => x.d.name),
        datasets: [{
          label: '税后可支配收入占税前劳动收入比例 (%)',
          data: mapped.map(x => x.val),
          backgroundColor: mapped.map(x => getContinentColor(x.d.continent, 0.85)),
          borderRadius: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { font: { size: 10 }, maxRotation: 60, minRotation: 45 } },
          y: { min: 45, max: 102, title: { display: true, text: '税后可支配率 (%)' } }
        }
      }
    });
  }
}

// Chart 10: Tax Burden vs Social Welfare & Gini Reduction Scatter
function renderChart10() {
  destroyChart('c10');
  const data = getFilteredData();
  const continents = ['亚洲', '欧洲', '美洲', '非洲'];
  const ctx = document.getElementById('chart10Scatter').getContext('2d');
  charts['c10'] = new Chart(ctx, {
    type: 'bubble',
    data: {
      datasets: continents.map(cont => {
        const sub = data.filter(d => d.continent === cont);
        return {
          label: cont,
          data: sub.map(d => ({
            x: d.taxToGdp,
            y: d.socialExpGdp,
            r: Math.max(4, d.giniReduction * 1.3),
            countryName: d.name,
            gini: d.giniReduction
          })),
          backgroundColor: getContinentColor(cont, 0.72),
          borderColor: getContinentColor(cont, 1.0),
          borderWidth: 1.5
        };
      })
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const raw = ctx.raw;
              return `${raw.countryName}: 税收/GDP ${raw.x}% | 社会福利支出/GDP ${raw.y}% | 基尼改善 ${raw.gini}个百分点`;
            }
          }
        }
      },
      scales: {
        x: { title: { display: true, text: '宏观税负：税收收入占 GDP 比例 (%)' }, min: 4, max: 50 },
        y: { title: { display: true, text: '公共社会福利与医疗教育支出占 GDP 比例 (%)' }, min: 0, max: 35 }
      }
    }
  });
}

function renderAllOverviewCharts() {
  renderOverviewKpis();
  renderChart1();
  renderChart2();
  renderChart3();
  renderChart4();
  renderChart5();
  renderChart6();
  renderChart7();
  renderChart8();
  renderChart9();
  renderChart10();
  renderOverviewSummaryTable();
}

function sortOverviewTable(col) {
  if (state.overviewSortCol === col) {
    state.overviewSortAsc = !state.overviewSortAsc;
  } else {
    state.overviewSortCol = col;
    state.overviewSortAsc = false;
  }
  renderOverviewSummaryTable();
}

function renderOverviewSummaryTable() {
  const useBroad = state.wedgeMode === 'broad';
  const data = [...getFilteredData()];
  const col = state.overviewSortCol;
  const asc = state.overviewSortAsc ? 1 : -1;

  data.sort((a, b) => {
    let va, vb;
    if (col === 'name' || col === 'continent') {
      return a[col].localeCompare(b[col], 'zh-CN') * asc;
    } else if (col === 'pitEffMed') {
      va = a.pitEff[2]; vb = b.pitEff[2];
    } else if (col === 'sscEmp') {
      va = useBroad ? a.sscEmpBroad : a.sscEmp;
      vb = useBroad ? b.sscEmpBroad : b.sscEmp;
    } else if (col === 'sscEr') {
      va = useBroad ? a.sscErBroad : a.sscEr;
      vb = useBroad ? b.sscErBroad : b.sscEr;
    } else if (col === 'taxWedge') {
      va = useBroad ? a.taxWedgeBroad : a.taxWedge;
      vb = useBroad ? b.taxWedgeBroad : b.taxWedge;
    } else {
      va = a[col]; vb = b[col];
    }
    return (va - vb) * asc;
  });

  const tbody = document.getElementById('overviewSummaryTbody');
  tbody.innerHTML = data.map(d => {
    const empSsc = useBroad ? d.sscEmpBroad : d.sscEmp;
    const erSsc = useBroad ? d.sscErBroad : d.sscEr;
    const wedge = useBroad ? d.taxWedgeBroad : d.taxWedge;
    return `
      <tr>
        <td><a href="javascript:void(0)" onclick="jumpToSimulator('${d.id}')"><strong>${d.name}</strong> (${d.enName})</a></td>
        <td>${getContinentTag(d.continent)}</td>
        <td class="num-col">${d.pitTop.toFixed(1)}%</td>
        <td class="num-col"><strong>${d.pitEff[2].toFixed(1)}%</strong></td>
        <td class="num-col">${empSsc.toFixed(1)}%</td>
        <td class="num-col">${erSsc.toFixed(1)}%</td>
        <td class="num-col">
          <div class="mini-bar-wrap">
            <span><strong>${wedge.toFixed(1)}%</strong></span>
            <div class="mini-bar"><div class="mini-bar-fill" style="width:${Math.min(100, wedge * 1.8)}%"></div></div>
          </div>
        </td>
        <td class="num-col">${d.vatStd.toFixed(1)}%</td>
        <td class="num-col">${d.effConsRate.toFixed(1)}%</td>
        <td class="num-col">${d.citRate.toFixed(1)}%</td>
        <td class="num-col">${d.taxToGdp.toFixed(1)}%</td>
        <td class="num-col">${d.socialExpGdp.toFixed(1)}%</td>
      </tr>
    `;
  }).join('');
}

function jumpToSimulator(countryId) {
  document.getElementById('taxSimCountrySelect').value = countryId;
  document.getElementById('tax-layer-3')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  runSimulation();
}

// ==================== TAB 2: SIMULATOR RENDERING ====================
function initSimulatorDropdowns() {
  const sel = document.getElementById('taxSimCountrySelect');
  sel.innerHTML = JURISDICTIONS.map(d => `<option value="${d.id}" ${d.id === 'CN-ML' ? 'selected' : ''}>${d.continent} · ${d.name} (${d.enName})</option>`).join('');

  const profSel = document.getElementById('profileAddSelect');
  profSel.innerHTML = '<option value="">+ 选择国家/地区加入对比卡...</option>' +
    JURISDICTIONS.map(d => `<option value="${d.id}">${d.continent} · ${d.name} (${d.enName})</option>`).join('');
}

function formatMoney(val, currencyMode, currencyLabel) {
  const rounded = Math.round(val).toLocaleString('en-US');
  if (currencyMode === 'ppp') return `PPP $${rounded}`;
  const sym = currencyLabel.split('(')[0].trim();
  return `${sym} ${rounded}`;
}

function runSimulation() {
  const cId = document.getElementById('taxSimCountrySelect').value || 'CN-ML';
  const hh = document.getElementById('simHouseholdSelect').value || 'single';
  const tierIdx = parseInt(document.getElementById('simIncomeTierSelect').value || '2', 10);
  const currMode = document.getElementById('simCurrencyMode').value || 'ppp';
  const compPreset = document.getElementById('simCompCountries').value || 'greater_china';

  const country = JURISDICTIONS.find(d => d.id === cId) || JURISDICTIONS[0];
  const sim = calculate8StepSim(country, hh, tierIdx, currMode);

  // Render 8 step cards
  document.getElementById('sim8StepsContainer').innerHTML = `
    <div class="step-box">
      <div class="step-num">第 1 步 · 基准收入</div>
      <div class="step-label">税前劳动收入 (Gross Wage)</div>
      <div class="step-val">${formatMoney(sim.step1Gross, currMode, country.currency)}</div>
      <div class="step-pct">相当于总用工成本的 ${((sim.step1Gross / sim.step5TotalLaborCost) * 100).toFixed(1)}%</div>
    </div>
    <div class="step-box">
      <div class="step-num">第 2 步 · 直接个税</div>
      <div class="step-label">雇员个人所得税 (PIT)</div>
      <div class="step-val" style="color:var(--terracotta);">-${formatMoney(sim.step2Pit, currMode, country.currency)}</div>
      <div class="step-pct">实际有效个税率：<strong>${sim.effPitPct.toFixed(1)}%</strong> (法定最高${country.pitTop}%)</div>
    </div>
    <div class="step-box">
      <div class="step-num">第 3 步 · 雇员缴费</div>
      <div class="step-label">雇员社保与强制公积金</div>
      <div class="step-val" style="color:var(--dusty-blue);">-${formatMoney(sim.step3EmpSsc, currMode, country.currency)}</div>
      <div class="step-pct">占税前工资：<strong>${sim.empSscPct.toFixed(1)}%</strong></div>
    </div>
    <div class="step-box">
      <div class="step-num">第 4 步 · 企业用工缴费</div>
      <div class="step-label">雇主社会保障及薪资税</div>
      <div class="step-val" style="color:var(--ochre);">+${formatMoney(sim.step4ErSsc, currMode, country.currency)}</div>
      <div class="step-pct">占税前工资：<strong>${sim.erSscPct.toFixed(1)}%</strong></div>
    </div>
    <div class="step-box">
      <div class="step-num">第 5 步 · 企业总支出</div>
      <div class="step-label">雇主总用工成本 (①+④)</div>
      <div class="step-val">${formatMoney(sim.step5TotalLaborCost, currMode, country.currency)}</div>
      <div class="step-pct">综合劳动税楔：<strong>${sim.laborWedgePct.toFixed(1)}%</strong></div>
    </div>
    <div class="step-box">
      <div class="step-num">第 6 步 · 银行卡到手</div>
      <div class="step-label">税后可支配劳动收入 (①-②-③)</div>
      <div class="step-val" style="color:var(--sage);">${formatMoney(sim.step6Disposable, currMode, country.currency)}</div>
      <div class="step-pct">占税前劳动收入：<strong>${sim.disposablePctOfGross.toFixed(1)}%</strong></div>
    </div>
    <div class="step-box">
      <div class="step-num">第 7 步 · 消费流转税</div>
      <div class="step-label">消费环节承担的间接税估算</div>
      <div class="step-val" style="color:var(--mauve);">-${formatMoney(sim.step7ConsTax, currMode, country.currency)}</div>
      <div class="step-pct">消费倾向 ${(sim.mpc * 100).toFixed(0)}% × 综合有效消费税率 → 占可支配 ${sim.effConsPctOfDisp.toFixed(1)}%</div>
    </div>
    <div class="step-box highlight">
      <div class="step-num">第 8 步 · 真实购买力</div>
      <div class="step-label">最终实际可支配购买力 (⑥-⑦)</div>
      <div class="step-val">${formatMoney(sim.step8RealPurchasingPower, currMode, country.currency)}</div>
      <div class="step-pct">全链路总税负率(占总用工成本)：<strong>${sim.totalComprehensiveWedgePct.toFixed(1)}%</strong></div>
    </div>
  `;

  document.getElementById('simWaterfallTitle').textContent = `${country.name} (${country.enName}) — 8步税负传导与真实购买力分解`;

  // Render Waterfall Chart
  destroyChart('simWf');
  const wfCtx = document.getElementById('chartSimWaterfall').getContext('2d');
  charts['simWf'] = new Chart(wfCtx, {
    type: 'bar',
    data: {
      labels: ['⑤ 雇主总成本', '④ 雇主社保', '① 税前工资', '② 个人所得税', '③ 雇员社保', '⑥ 税后可支配', '⑦ 消费间接税', '⑧ 最终真实购买力'],
      datasets: [{
        label: currMode === 'ppp' ? '金额 (PPP 国际元 $)' : `金额 (${country.currency})`,
        data: [
          Math.round(sim.step5TotalLaborCost),
          Math.round(sim.step4ErSsc),
          Math.round(sim.step1Gross),
          Math.round(sim.step2Pit),
          Math.round(sim.step3EmpSsc),
          Math.round(sim.step6Disposable),
          Math.round(sim.step7ConsTax),
          Math.round(sim.step8RealPurchasingPower)
        ],
        backgroundColor: [
          '#6E6A64', '#D49A45', '#5B7C99', '#C86D51', '#849FA8', '#6B8E78', '#8E5B66', '#52796F'
        ],
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });

  // Render Multi-country Comparison under same simulation parameters
  const presetMap = {
    greater_china: ['CN-ML', 'TW', 'HK', 'MO', 'SG', 'JP', 'KR'],
    g7: ['US', 'DE', 'FR', 'GB', 'JP', 'CA', 'CH'],
    nordic_eu: ['DK', 'SE', 'BE', 'IE', 'PL', 'HU', 'RO'],
    emerging: ['CN-ML', 'IN', 'VN', 'SA', 'ZA', 'BR', 'MX']
  };
  let compIds = [...(presetMap[compPreset] || presetMap.greater_china)];
  if (!compIds.includes(country.id)) compIds.unshift(country.id);
  const compCountries = compIds.map(id => JURISDICTIONS.find(d => d.id === id)).filter(Boolean);
  const compSims = compCountries.map(c => ({ c, s: calculate8StepSim(c, hh, tierIdx, 'ppp') }));

  destroyChart('simMulti');
  const mCtx = document.getElementById('chartSimMultiComp').getContext('2d');
  charts['simMulti'] = new Chart(mCtx, {
    type: 'bar',
    data: {
      labels: compSims.map(x => x.c.name),
      datasets: [
        { label: '④ 雇主社保占比 (%)', data: compSims.map(x => +((x.s.step4ErSsc / x.s.step5TotalLaborCost) * 100).toFixed(1)), backgroundColor: '#D49A45' },
        { label: '③ 雇员社保占比 (%)', data: compSims.map(x => +((x.s.step3EmpSsc / x.s.step5TotalLaborCost) * 100).toFixed(1)), backgroundColor: '#5B7C99' },
        { label: '② 个人所得税占比 (%)', data: compSims.map(x => +((x.s.step2Pit / x.s.step5TotalLaborCost) * 100).toFixed(1)), backgroundColor: '#C86D51' },
        { label: '⑦ 消费间接税占比 (%)', data: compSims.map(x => +((x.s.step7ConsTax / x.s.step5TotalLaborCost) * 100).toFixed(1)), backgroundColor: '#8E5B66' },
        { label: '⑧ 最终真实购买力留存率 (%)', data: compSims.map(x => +((x.s.step8RealPurchasingPower / x.s.step5TotalLaborCost) * 100).toFixed(1)), backgroundColor: '#6B8E78' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'top', labels: { boxWidth: 10, font: { size: 10.5 } } } },
      scales: {
        x: { stacked: true },
        y: { stacked: true, max: 100, title: { display: true, text: '占雇主总用工成本比例 (%)' } }
      }
    }
  });

  // Render full 55-country simulation table
  document.getElementById('simAssumptionsNote').innerHTML =
    `当前消费间接税测算说明：在所选收入档位下，居民边际消费倾向(MPC)设定为 <strong>${(sim.mpc * 100).toFixed(0)}%</strong>（其余 ${(100 - sim.mpc * 100).toFixed(0)}% 用于储蓄或投资，不产生当期消费税）；消费支出按各国普通食品、日用品、住房水电、交通燃油、医疗、教育、娱乐7大类权重及免税/低税率政策加权折算，绝不将法定VAT税率直接等同于全部收入的税负率。`;

  const filtered = getFilteredData();
  document.getElementById('simFullTbody').innerHTML = filtered.map(d => {
    const s = calculate8StepSim(d, hh, tierIdx, currMode);
    return `
      <tr>
        <td><strong>${d.name}</strong> (${d.enName})</td>
        <td>${getContinentTag(d.continent)}</td>
        <td class="num-col">${formatMoney(s.step1Gross, currMode, d.currency)}</td>
        <td class="num-col">${formatMoney(s.step2Pit, currMode, d.currency)} (${s.effPitPct.toFixed(1)}%)</td>
        <td class="num-col">${formatMoney(s.step3EmpSsc, currMode, d.currency)} (${s.empSscPct.toFixed(1)}%)</td>
        <td class="num-col">${formatMoney(s.step4ErSsc, currMode, d.currency)} (${s.erSscPct.toFixed(1)}%)</td>
        <td class="num-col">${formatMoney(s.step5TotalLaborCost, currMode, d.currency)}</td>
        <td class="num-col"><strong>${formatMoney(s.step6Disposable, currMode, d.currency)}</strong></td>
        <td class="num-col">${formatMoney(s.step7ConsTax, currMode, d.currency)} (${s.effConsPctOfDisp.toFixed(1)}%)</td>
        <td class="num-col" style="color:var(--sage);"><strong>${formatMoney(s.step8RealPurchasingPower, currMode, d.currency)}</strong></td>
        <td class="num-col"><strong>${s.totalComprehensiveWedgePct.toFixed(1)}%</strong></td>
      </tr>
    `;
  }).join('');
}

// ==================== TAB 3: PIT PROFILES & SSC DETAIL ====================
function addProfileCountry(id) {
  if (!id) return;
  if (!state.profileIds.includes(id)) {
    state.profileIds.unshift(id);
    if (state.profileIds.length > 8) state.profileIds.pop();
    renderProfileCards();
  }
  document.getElementById('profileAddSelect').value = '';
}

function removeProfileCountry(id) {
  state.profileIds = state.profileIds.filter(x => x !== id);
  renderProfileCards();
}

function resetDefaultProfiles() {
  state.profileIds = ['CN-ML', 'TW', 'HK', 'MO', 'SG', 'JP', 'US', 'DE'];
  renderProfileCards();
}

function renderProfileCards() {
  const container = document.getElementById('profileCardsContainer');
  const list = state.profileIds.map(id => JURISDICTIONS.find(d => d.id === id)).filter(Boolean);
  container.innerHTML = list.map(d => `
    <div class="country-profile-card">
      <div class="cp-head">
        <div>
          <span class="cp-name">${d.name}</span>
          <span style="font-size:12px;color:var(--text-muted);margin-left:6px;">${d.enName}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          ${getContinentTag(d.continent)}
          <button class="btn" style="padding:2px 7px;font-size:11px;" onclick="removeProfileCountry('${d.id}')">移除</button>
        </div>
      </div>
      <div class="cp-row"><span>个人所得税率区间：</span><strong>${d.pitMin}% – ${d.pitTop}%</strong></div>
      <div class="cp-row"><span>5档有效个税 (50/67/100/167/300%AW)：</span><strong>${d.pitEff.join('% / ')}%</strong></div>
      <div class="cp-row"><span>雇员 / 雇主广义社保缴费：</span><strong>${d.sscEmpBroad}% / ${d.sscErBroad}%</strong></div>
      <div class="cp-row"><span>申报单位制度：</span><span>${d.filingUnit}</span></div>
      <div class="cp-detail-block">
        <strong>起征点与免税额：</strong>${d.pitThreshold}
      </div>
      <div class="cp-detail-block">
        <strong>累进税率档位结构：</strong>${d.pitBrackets}
      </div>
      <div class="cp-detail-block">
        <strong>家庭、育儿、住房、教育抵扣：</strong>${d.deductions}
      </div>
      <div class="cp-detail-block">
        <strong>股息、利息与资本利得税处理：</strong>${d.capitalTax}
      </div>
      <div class="cp-detail-block">
        <strong>国家结构与央地层级：</strong>${d.tierNote}
      </div>
    </div>
  `).join('');
}

function renderSscDetailTable() {
  const data = getFilteredData();
  document.getElementById('sscDetailTbody').innerHTML = data.map(d => {
    const s = d.sscDetail;
    return `
      <tr>
        <td><strong>${d.name}</strong> (${d.enName})</td>
        <td class="num-col">${s.pensionEmp.toFixed(2)}%</td>
        <td class="num-col">${s.pensionEr.toFixed(2)}%</td>
        <td class="num-col">${s.healthEmp.toFixed(2)}%</td>
        <td class="num-col">${s.healthEr.toFixed(2)}%</td>
        <td class="num-col">${s.unempEmp.toFixed(2)}%</td>
        <td class="num-col">${s.unempEr.toFixed(2)}%</td>
        <td class="num-col">${(s.injuryEr + s.maternityEr).toFixed(2)}%</td>
        <td class="num-col">${s.housingEmp.toFixed(1)}% / ${s.housingEr.toFixed(1)}%</td>
        <td class="num-col"><strong>${d.sscEmpBroad.toFixed(2)}%</strong></td>
        <td class="num-col"><strong>${d.sscErBroad.toFixed(2)}%</strong></td>
        <td style="max-width:380px;">${s.capFloor}</td>
      </tr>
    `;
  }).join('');
}

// ==================== TAB 4: CORPORATE INCIDENCE & CONSUMPTION CATEGORIES ====================
function renderTab4ChartsAndTable() {
  let data = getFilteredData();
  let sub = data.length > 20 ? data.filter(d => ['CN-ML', 'TW', 'HK', 'MO', 'JP', 'KR', 'SG', 'IN', 'VN', 'SA', 'ZA', 'DE', 'FR', 'GB', 'IT', 'SE', 'DK', 'IE', 'US', 'CA', 'BR', 'AR'].includes(d.id)) : data;

  destroyChart('corpInc');
  const cCtx = document.getElementById('chartCorpIncidence').getContext('2d');
  charts['corpInc'] = new Chart(cCtx, {
    type: 'bar',
    data: {
      labels: sub.map(d => d.name),
      datasets: [
        { label: '转嫁给劳动者：压低实际工资 (%)', data: sub.map(d => d.incidence.labor), backgroundColor: '#5B7C99' },
        { label: '转嫁给消费者：提高商品价格 (%)', data: sub.map(d => d.incidence.consumer), backgroundColor: '#C86D51' },
        { label: '由资本所有者承担：降低资本回报 (%)', data: sub.map(d => d.incidence.capital), backgroundColor: '#6B8E78' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'top', labels: { boxWidth: 10, font: { size: 11 } } } },
      scales: {
        x: { stacked: true, ticks: { font: { size: 10 }, maxRotation: 50, minRotation: 35 } },
        y: { stacked: true, max: 100, title: { display: true, text: '企业税费最终经济归宿分摊 (%)' } }
      }
    }
  });

  destroyChart('consCat');
  const catCtx = document.getElementById('chartConsCategories').getContext('2d');
  charts['consCat'] = new Chart(catCtx, {
    type: 'bar',
    data: {
      labels: sub.map(d => d.name),
      datasets: [
        { label: '普通食品税率 (%)', data: sub.map(d => d.catRates.food), backgroundColor: '#6B8E78' },
        { label: '日常生活用品税率 (%)', data: sub.map(d => d.catRates.daily), backgroundColor: '#5B7C99' },
        { label: '交通与燃油综合税率 (%)', data: sub.map(d => d.catRates.fuel), backgroundColor: '#C86D51' },
        { label: '餐饮与娱乐消费税率 (%)', data: sub.map(d => d.catRates.ent), backgroundColor: '#D49A45' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'top', labels: { boxWidth: 10, font: { size: 11 } } } },
      scales: {
        x: { ticks: { font: { size: 10 }, maxRotation: 50, minRotation: 35 } },
        y: { beginAtZero: true, title: { display: true, text: '综合间接税率 (%)' } }
      }
    }
  });

  document.getElementById('corpVatTbody').innerHTML = data.map(d => `
    <tr>
      <td><strong>${d.name}</strong> (${d.enName})</td>
      <td class="num-col">${d.citRate.toFixed(1)}%</td>
      <td class="num-col">${d.corpTotalTaxRate.toFixed(1)}%</td>
      <td class="num-col" title="${d.incidence.note}">${d.incidence.labor}% / ${d.incidence.consumer}% / ${d.incidence.capital}%</td>
      <td>${d.vatType}</td>
      <td class="num-col"><strong>${d.vatStd.toFixed(1)}%</strong></td>
      <td class="num-col">${d.catRates.food.toFixed(1)}%</td>
      <td class="num-col">${d.catRates.daily.toFixed(1)}%</td>
      <td class="num-col">${d.catRates.housing.toFixed(1)}%</td>
      <td class="num-col">${d.catRates.fuel.toFixed(1)}%</td>
      <td class="num-col">${d.catRates.health.toFixed(1)}%</td>
      <td class="num-col">${d.catRates.edu.toFixed(1)}%</td>
      <td class="num-col">${d.catRates.ent.toFixed(1)}%</td>
      <td class="num-col"><strong>${d.effConsRate.toFixed(1)}%</strong></td>
    </tr>
  `).join('');
}

// ==================== TAB 5: PROPERTY TAXES & MACRO HISTORY ====================
function renderTab5Tables() {
  const data = getFilteredData();
  document.getElementById('propertyTaxTbody').innerHTML = data.map(d => {
    const p = d.propertyTaxes;
    return `
      <tr>
        <td><strong>${d.name}</strong> (${d.enName})</td>
        <td>${p.holding}</td>
        <td>${p.transaction}</td>
        <td>${p.inheritance}</td>
        <td>${p.wealth}</td>
        <td>${p.cgt}</td>
        <td>${p.stamp}</td>
        <td>${p.impact}</td>
      </tr>
    `;
  }).join('');

  const years = ['2000', '2005', '2010', '2015', '2020', '2022', '2023', '2024', '2025', '2026'];
  document.getElementById('macroHistTbody').innerHTML = data.map(d => {
    const h = d.histTaxGdp;
    const diff = (h['2000'] !== 'NA' && h['2024'] !== 'NA')
      ? ((h['2024'] - h['2000']) >= 0 ? `+${(h['2024'] - h['2000']).toFixed(1)}` : (h['2024'] - h['2000']).toFixed(1))
      : '<span class="tag tag-na">早期缺失</span>';
    return `
      <tr>
        <td><strong>${d.name}</strong> (${d.enName})</td>
        ${years.map(y => `<td class="num-col">${h[y] === 'NA' ? '<span class="tag tag-na">NA</span>' : h[y].toFixed(1) + '%'}</td>`).join('')}
        <td class="num-col"><strong>${diff}</strong></td>
        <td class="num-col">${d.govExpGdp.toFixed(1)}%</td>
        <td class="num-col">${d.socialExpGdp.toFixed(1)}%</td>
        <td class="num-col">+${d.giniReduction.toFixed(1)}</td>
        <td style="max-width:340px;">${d.histNote}</td>
      </tr>
    `;
  }).join('');
}

// ==================== TAB 6: MULTI-DIMENSIONAL EVALUATION ====================
function renderEval8Questions() {
  document.getElementById('eval8AnswersGrid').innerHTML = `
    <div class="q-card">
      <div class="q-title">分类特征一：个人直接税负较低的国家与地区分布</div>
      <div class="q-body"><strong>阿联酋(0%)、沙特(0%)、中国澳门(100%AW有效个税0.4%)、中国香港(2.4%)、新加坡(2.2%)、智利(0.5%)、哥伦比亚(0%)、泰国(0%)</strong>。其中阿联酋与沙特零个税，澳门与香港凭借高免税额与低标准税率成为全球受薪层直接税最低的发达都会。</div>
    </div>
    <div class="q-card">
      <div class="q-title">分类特征二：综合劳动税楔较高的国家与地区分布</div>
      <div class="q-body"><strong>比利时(52.5%)、德国(49.3%)、法国(47.2%)、奥地利(47.1%)、意大利(45.8%)、罗马尼亚(42.8%)、芬兰(42.5%)、捷克(41.2%)、匈牙利(41.2%)</strong>。若按含住房公积金/二支柱养老金的广义口径，<strong>中国大陆(41.2%)與荷兰(44.2%)</strong>同样处于高劳动成本区间。</div>
    </div>
    <div class="q-card">
      <div class="q-title">分类特征三：消费端间接税负较高的国家与地区分布</div>
      <div class="q-body"><strong>匈牙利(标准VAT 27%，实际消费税负15.8%)、丹麦(标准25%且食品0豁免，实际15.6%)、巴西(复合流转税26.5%，实际14.5%)、芬兰(25.5%)、挪威(25%)、瑞典(25%)、希腊(24%)、阿根廷(21%+省营业税)</strong>。</div>
    </div>
    <div class="q-card">
      <div class="q-title">分类特征四：企业用工与综合商业税负较高的经济体分布</div>
      <div class="q-body">按雇主社保附加率排序：<strong>法国(35.8%)、巴西(36.8%含FGTS)、捷克(33.8%)、中国大陆(33.3%含五险一金)、瑞典(31.42%)、西班牙(30.48%)、意大利(30.0%)、奥地利(28.43%)、阿尔及利亚(26.0%)</strong>。</div>
    </div>
    <div class="q-card">
      <div class="q-title">分类特征五：个人所得税制累进性较强的经济体分布</div>
      <div class="q-body">以(300%AW有效税率 - 50%AW有效税率)衡量，累进性最强的是：<strong>爱尔兰(+33.6个百分点)、以色列(+29.4)、比利时(+30.2)、南非(+28.6)、澳大利亚/加拿大(+27.8)、德国(+25.2)、韩国(+21.3)、美国(+22.6)</strong>。相反，<strong>匈牙利与罗马尼亚</strong>因单一比例税且无免税额而缺乏累进性。</div>
    </div>
    <div class="q-card">
      <div class="q-title">分类特征六：公共福利支出与税收负担匹配度较高的经济体</div>
      <div class="q-body"><strong>北欧四国(丹麦、芬兰、瑞典、挪威)与西欧(法国、比利时、德国、奥地利)</strong>虽然宏观税负高达38%–45% GDP，但65%–70%以上的财政收入直接转化为全民免费医疗、高等教育、育儿津贴与养老保障，基尼系数再分配改善达11–14个百分点；而<strong>中国澳门、台湾、新加坡、瑞士、爱尔兰</strong>则在低/中税负下实现了高公共服务效率。</div>
    </div>
    <div class="q-card">
      <div class="q-title">分类特征七：低收入劳动者实际税负较低或负税率的经济体</div>
      <div class="q-body"><strong>中国香港、中国澳门、中国台湾、新加坡、泰国、英国(高免税额+食品0% VAT)、爱尔兰、加拿大(CCB牛奶金+GST退税)、美国(EITC可退税抵免)、韩国</strong>。而东欧单一税率国家（匈牙利、罗马尼亚）及无食品VAT豁免的发展中国家低收入税负最重。</div>
    </div>
    <div class="q-card">
      <div class="q-title">分类特征八：居民税后可支配收入与实际购买力较高的经济体</div>
      <div class="q-body">按PPP国际元计价的最终实际可支配购买力排序：<strong>瑞士(PPP $60,100+)、新加坡(PPP $54,200+)、美国(PPP $53,800+)、阿联酋(PPP $66,000+)、澳大利亚/加拿大、挪威、荷兰、中国香港、中国台湾、中国澳门</strong>稳居全球前十梯队。</div>
    </div>
  `;
}


function updateEvalScores() {
  const w1 = parseFloat(document.getElementById('w1Slider').value);
  const w2 = parseFloat(document.getElementById('w2Slider').value);
  const w3 = parseFloat(document.getElementById('w3Slider').value);
  const w4 = parseFloat(document.getElementById('w4Slider').value);
  const w5 = parseFloat(document.getElementById('w5Slider').value);
  const totalW = (w1 + w2 + w3 + w4 + w5) || 1;

  document.getElementById('w1Val').textContent = Math.round((w1 / totalW) * 100);
  document.getElementById('w2Val').textContent = Math.round((w2 / totalW) * 100);
  document.getElementById('w3Val').textContent = Math.round((w3 / totalW) * 100);
  document.getElementById('w4Val').textContent = Math.round((w4 / totalW) * 100);
  document.getElementById('w5Val').textContent = Math.round((w5 / totalW) * 100);

  const data = computeTaxEvalScores(getFilteredData(), { w1, w2, w3, w4, w5 }, state.wedgeMode);

  document.getElementById('evalScoreTbody').innerHTML = data.map((x, idx) => `
    <tr>
      <td><strong>#${idx + 1}</strong></td>
      <td><strong>${x.d.name}</strong> (${x.d.enName})</td>
      <td>${getContinentTag(x.d.continent)}</td>
      <td class="num-col"><strong style="color:var(--terracotta);font-size:14px;">${x.totalScore.toFixed(1)}</strong></td>
      <td class="num-col">${x.s1.toFixed(1)}</td>
      <td class="num-col">${x.s2.toFixed(1)}</td>
      <td class="num-col">${x.s3.toFixed(1)}</td>
      <td class="num-col">${x.s4.toFixed(1)}</td>
      <td class="num-col">${x.s5.toFixed(1)}</td>
      <td><span class="tag tag-europe">${x.cluster}</span></td>
    </tr>
  `).join('');
}

function renderFullDatabaseTable() {
  const q = (document.getElementById('dbSearchInput')?.value || '').trim().toLowerCase();
  const data = getFilteredData().filter(d => {
    if (!q) return true;
    return JSON.stringify(d).toLowerCase().includes(q);
  });

  document.getElementById('fullDbTbody').innerHTML = data.map(d => `
    <tr>
      <td><code>${d.id}</code></td>
      <td><strong>${d.name}</strong><br><span style="font-size:11.5px;color:var(--text-muted);">${d.enName}</span></td>
      <td>${getContinentTag(d.continent)} <span style="font-size:11.5px;">${d.subregion}</span></td>
      <td style="max-width:220px;">${d.federal ? '<strong>联邦/准联邦制</strong>' : '单一制'}<br><span style="font-size:11.5px;color:var(--text-secondary);">${d.tierNote}</span></td>
      <td class="num-col">$${d.avgWagePPP.toLocaleString()}<br><span style="font-size:11px;color:var(--text-muted);">${d.currency} ${d.avgWageLocal.toLocaleString()}</span></td>
      <td class="num-col">${d.pitMin}% / <strong>${d.pitTop}%</strong></td>
      <td class="num-col">${d.pitEff[0]}% / <strong>${d.pitEff[2]}%</strong> / ${d.pitEff[4]}%</td>
      <td class="num-col">${d.sscEmpBroad}% / ${d.sscErBroad}%</td>
      <td class="num-col">${d.taxWedge}% / <strong>${d.taxWedgeBroad}%</strong></td>
      <td class="num-col">${d.vatStd}% / <strong>${d.effConsRate}%</strong></td>
      <td class="num-col">${d.citRate}% / ${d.corpTotalTaxRate}%</td>
      <td class="num-col"><strong>${d.taxToGdp}%</strong><br><span style="font-size:11px;color:var(--text-muted);">不含社保 ${d.taxToGdpExclSsc}%</span></td>
      <td><a href="${d.sourceUrl}" target="_blank" rel="noopener">${d.sourceLabel} ↗</a></td>
    </tr>
  `).join('');
}

// ==================== CSV EXPORT FUNCTIONS ====================
function downloadCSVFile(filename, rows) {
  const processRow = row => row.map(val => {
    let str = (val === null || val === undefined) ? '' : String(val);
    str = str.replace(/"/g, '""');
    if (str.search(/("|,|\n)/g) >= 0) str = `"${str}"`;
    return str;
  }).join(',');

  const csvContent = '\uFEFF' + rows.map(processRow).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportFullCSV() {
  const headers = [
    '代码', '国家或地区', '英文名', '大洲', '次区域', '联邦制', '货币', '当地平均年薪', 'PPP平均年薪(USD)',
    '个税最低税率(%)', '个税最高边际税率(%)', '50%AW有效个税(%)', '67%AW有效个税(%)', '100%AW有效个税(%)', '167%AW有效个税(%)', '300%AW有效个税(%)',
    '雇员社保OECD(%)', '雇员广义社保含公积金(%)', '雇主社保OECD(%)', '雇主广义社保含公积金(%)',
    'OECD狭义劳动税楔(%)', '广义劳动税楔(%)', '企业所得税率(%)', '企业综合税负率(%)',
    '间接税类型', '标准VAT/GST税率(%)', '普通食品税率(%)', '居民实际消费税负率(%)',
    '税收占GDP比例(2024/25 %)', '不含社保税收/GDP(%)', '社会福利支出/GDP(%)', '基尼改善(百分点)', '权威数据来源链接'
  ];
  const rows = [headers];
  JURISDICTIONS.forEach(d => {
    rows.push([
      d.id, d.name, d.enName, d.continent, d.subregion, d.federal ? '是' : '否', d.currency, d.avgWageLocal, d.avgWagePPP,
      d.pitMin, d.pitTop, d.pitEff[0], d.pitEff[1], d.pitEff[2], d.pitEff[3], d.pitEff[4],
      d.sscEmp, d.sscEmpBroad, d.sscEr, d.sscErBroad,
      d.taxWedge, d.taxWedgeBroad, d.citRate, d.corpTotalTaxRate,
      d.vatType, d.vatStd, d.catRates.food, d.effConsRate,
      d.taxToGdp, d.taxToGdpExclSsc, d.socialExpGdp, d.giniReduction, d.sourceUrl
    ]);
  });
  downloadCSVFile('global_55_jurisdictions_tax_burden_2026.csv', rows);
}

function exportSimCSV() {
  const hh = document.getElementById('simHouseholdSelect').value || 'single';
  const tierIdx = parseInt(document.getElementById('simIncomeTierSelect').value || '2', 10);
  const currMode = document.getElementById('simCurrencyMode').value || 'ppp';
  const headers = [
    '国家或地区', '大洲', '模拟家庭类型', '收入档位', '计价基准',
    '1_税前劳动收入', '2_雇员个人所得税', '3_雇员社保及公积金', '4_雇主社保及薪资税',
    '5_雇主总用工成本', '6_税后可支配劳动收入', '7_消费环节间接税估算', '8_最终实际可支配购买力',
    '综合劳动税楔(%)', '全链路综合总税负率(%)'
  ];
  const rows = [headers];
  JURISDICTIONS.forEach(d => {
    const s = calculate8StepSim(d, hh, tierIdx, currMode);
    rows.push([
      d.name, d.continent, hh, tierIdx, currMode === 'ppp' ? 'PPP_USD' : d.currency,
      Math.round(s.step1Gross), Math.round(s.step2Pit), Math.round(s.step3EmpSsc), Math.round(s.step4ErSsc),
      Math.round(s.step5TotalLaborCost), Math.round(s.step6Disposable), Math.round(s.step7ConsTax), Math.round(s.step8RealPurchasingPower),
      s.laborWedgePct.toFixed(2), s.totalComprehensiveWedgePct.toFixed(2)
    ]);
  });
  downloadCSVFile(`global_tax_simulation_${hh}_tier${tierIdx}.csv`, rows);
}

function refreshAllViews() {
  renderAllOverviewCharts();
  runSimulation();
  renderProfileCards();
  renderSscDetailTable();
  renderTab4ChartsAndTable();
  renderTab5Tables();
  renderEval8Questions();
  updateEvalScores();
  renderFullDatabaseTable();
}

export function initTaxationModule() {
  window.setContinent = setContinent;
  window.setWedgeMode = setWedgeMode;
  window.handleGlobalSearch = handleGlobalSearch;
  window.renderAllOverviewCharts = renderAllOverviewCharts;
  window.renderChart2 = renderChart2;
  window.renderChart6 = renderChart6;
  window.renderChart9 = renderChart9;
  window.sortOverviewTable = sortOverviewTable;
  window.jumpToSimulator = jumpToSimulator;
  window.runSimulation = runSimulation;
  window.exportSimCSV = exportSimCSV;
  window.addProfileCountry = addProfileCountry;
  window.removeProfileCountry = removeProfileCountry;
  window.resetDefaultProfiles = resetDefaultProfiles;
  window.updateEvalScores = updateEvalScores;
  window.renderFullDatabaseTable = renderFullDatabaseTable;
  window.exportFullCSV = exportFullCSV;

  initSimulatorDropdowns();
  refreshAllViews();
}
