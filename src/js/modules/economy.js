/**
 * economy.js — 板块三：全球经济发展轨迹深度研究模块 (1985–2026)
 * --------------------------------------------------------------------------
 * 负责经济发展轨迹板块的状态管理、16个动态图表、10大核心问题、9大历史冲击事件、15个国别深度案例、
 * 13维高质量增长评分体系及CSV导出。
 * 数据源自 data-manager.js，纯计算源自 index-calculator.js，图表生命周期由 chart-manager.js 托管。
 */

import { dataManager } from '../data/data-manager.js';
import { chartManager } from '../charts/chart-manager.js';
import { eventManager } from '../core/event-manager.js';
import { econScrollToTab } from '../core/navigation.js';
import {
  computeEconomyWeightedScore
} from '../calculations/index-calculator.js';

const FULL_DATA = dataManager.getEconomyData();
const YEARS = FULL_DATA.years;
const ECONOMIES = FULL_DATA.economies;
const ECON_MAP = dataManager.getEconomyMapObject();
const DIM_13_NAMES = FULL_DATA.dim13Names;
const TEN_QUESTIONS_DATA = FULL_DATA.tenQuestionsData;
const HISTORICAL_EVENTS = FULL_DATA.historicalEvents;
const CASE_STUDIES = FULL_DATA.caseStudies;

let state = {
  activeTab: 'tab1',
  primaryId: 'CHN',
  compareId: 'USA',
  regionFilter: 'ALL',
  selectedTsIds: ['CHN', 'USA', 'JPN', 'DEU', 'IND', 'TWN', 'KOR'],
  weights13: [8, 8, 9, 9, 9, 9, 8, 7, 7, 7, 6, 7, 6]
};

const charts = chartManager.getNamespaceProxy('econ');

function showToast(msg) {
  eventManager.showToast(msg);
}

function computeWeightedScore(econ) {
  return computeEconomyWeightedScore(econ, state.weights13);
}

    function initSelectors() {
      const pSel = document.getElementById('globalPrimarySelect');
      const cSel = document.getElementById('globalCompareSelect');
      pSel.innerHTML = '';
      cSel.innerHTML = '';

      const regions = ['亚洲', '欧洲', '美洲', '非洲'];
      regions.forEach(reg => {
        const og1 = document.createElement('optgroup');
        og1.label = reg;
        const og2 = document.createElement('optgroup');
        og2.label = reg;
        ECONOMIES.filter(e => e.region === reg).forEach(e => {
          const opt1 = document.createElement('option');
          opt1.value = e.id;
          opt1.textContent = `${e.name} (${e.id})`;
          if (e.id === state.primaryId) opt1.selected = true;
          og1.appendChild(opt1);

          const opt2 = document.createElement('option');
          opt2.value = e.id;
          opt2.textContent = `${e.name} (${e.id})`;
          if (e.id === state.compareId) opt2.selected = true;
          og2.appendChild(opt2);
        });
        pSel.appendChild(og1);
        cSel.appendChild(og2);
      });
    }

    function getFilteredEconomies() {
      const rf = state.regionFilter;
      if (rf === 'ALL') return ECONOMIES;
      if (rf === '发达经济体' || rf === '新兴与发展中经济体') {
        return ECONOMIES.filter(e => e.group === rf);
      }
      return ECONOMIES.filter(e => e.region === rf);
    }

    function handleGlobalControlChange() {
      state.primaryId = document.getElementById('globalPrimarySelect').value;
      state.compareId = document.getElementById('globalCompareSelect').value;
      state.regionFilter = document.getElementById('globalRegionFilter').value;

      // Ensure primary and compare are in selectedTsIds
      if (!state.selectedTsIds.includes(state.primaryId)) {
        state.selectedTsIds.unshift(state.primaryId);
      }
      if (!state.selectedTsIds.includes(state.compareId)) {
        state.selectedTsIds.splice(1, 0, state.compareId);
      }
      if (state.selectedTsIds.length > 10) {
        state.selectedTsIds = state.selectedTsIds.slice(0, 10);
      }

      renderTopComparisonBar();
      initTsCheckboxes();
      renderTimeSeriesCharts();
      renderRankTable();
      renderSectorCharts();
      renderIndustrialTable();
      renderIncomeTable();
      renderLaborTable();
      renderMacroCharts();
      renderMacroTable();
      renderDemoTable();
      renderRadar13Chart();
      renderScorecardTable();
    }

    function swapPrimaryAndCompare() {
      const tmp = state.primaryId;
      state.primaryId = state.compareId;
      state.compareId = tmp;
      document.getElementById('globalPrimarySelect').value = state.primaryId;
      document.getElementById('globalCompareSelect').value = state.compareId;
      handleGlobalControlChange();
    }

    function switchTab(tabId) {
      state.activeTab = tabId;
      document.querySelectorAll('.tab-view').forEach(el => el.classList.add('hidden'));
      const target = document.getElementById(tabId);
      if (target) target.classList.remove('hidden');

      document.querySelectorAll('#mainTabNav .tab-btn').forEach(btn => btn.classList.remove('active'));
      const activeBtn = document.getElementById('btn-' + tabId);
      if (activeBtn) activeBtn.classList.add('active');

      // Resize active charts
      setTimeout(() => {
        Object.values(charts).forEach(ch => {
          if (ch && typeof ch.resize === 'function') ch.resize();
        });
      }, 60);
    }

    function renderTopComparisonBar() {
      const p = ECON_MAP[state.primaryId];
      const c = ECON_MAP[state.compareId];
      if (!p || !c) return;

      document.getElementById('barPrimaryRegion').textContent = `${p.region} · ${p.group}`;
      document.getElementById('barPrimaryStatus').textContent = p.missingUntil ? `1985-${p.missingUntil}缺失` : '1985-2026完整序列';
      document.getElementById('barPrimaryName').textContent = `${p.name} (${p.en})`;
      document.getElementById('barPrimaryType').textContent = p.type;
      document.getElementById('barPrimaryGdp').textContent = `$${p.gdpNom2026.toLocaleString()}B / PPP人均 $${p.pcPpp2026.toLocaleString()}`;
      document.getElementById('barPrimaryGrowth').textContent = `40年实际增长: ${p.realMult40y}x (CAGR ${p.realCagr40y}%) | 人均实际: ${p.realPcMult40y}x`;

      document.getElementById('barCompareRegion').textContent = `${c.region} · ${c.group}`;
      document.getElementById('barCompareStatus').textContent = c.missingUntil ? `1985-${c.missingUntil}缺失` : '1985-2026完整序列';
      document.getElementById('barCompareName').textContent = `${c.name} (${c.en})`;
      document.getElementById('barCompareType').textContent = c.type;
      document.getElementById('barCompareGdp').textContent = `$${c.gdpNom2026.toLocaleString()}B / PPP人均 $${c.pcPpp2026.toLocaleString()}`;
      document.getElementById('barCompareGrowth').textContent = `40年实际增长: ${c.realMult40y}x (CAGR ${c.realCagr40y}%) | 人均实际: ${c.realPcMult40y}x`;

      const ratioNom = (p.gdpNom2026 / c.gdpNom2026).toFixed(2);
      const ratioPppPc = (p.pcPpp2026 / c.pcPpp2026).toFixed(2);
      document.getElementById('barRatioReadout').textContent = `名义规模比: ${ratioNom}x | PPP人均比: ${ratioPppPc}x`;
    }

    // ==================== TAB 1 FUNCTIONS ====================
    function renderTenQuestions() {
      const container = document.getElementById('tenQuestionsGrid');
      container.innerHTML = '';
      TEN_QUESTIONS_DATA.forEach((item, idx) => {
        const card = document.createElement('div');
        card.className = 'p-4 rounded-xl border border-[#E3DDD1] bg-[#FAF7F0] hover:border-[#C86D51] transition cursor-pointer';
        card.onclick = () => {
          item.expanded = !item.expanded;
          renderTenQuestions();
        };
        card.innerHTML = `
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded badge-terracotta text-xs font-bold">${item.tag}</span>
              <h3 class="text-sm font-bold text-[#2C2825]">${item.q}</h3>
            </div>
            <span class="text-[#857D74] font-bold text-xs">${item.expanded ? '▲ 收起' : '▼ 展开'}</span>
          </div>
          <p class="text-xs text-[#5C554E] font-medium mt-2">${item.summary}</p>
          ${item.expanded ? `
            <div class="mt-2.5 pt-2.5 border-t border-[#E3DDD1]/80 text-xs text-[#5C554E] whitespace-pre-line leading-relaxed">${item.details}</div>
            <div class="mt-2.5 flex justify-end">
              <button onclick="event.stopPropagation(); switchTab('${item.targetTab}')" class="text-xs text-[#C86D51] hover:text-[#9E4B32] font-bold underline">
                → 跳转至对应实证图表模块
              </button>
            </div>
          ` : ''}
        `;
        container.appendChild(card);
      });
    }

    function expandAllQuestions(flag) {
      TEN_QUESTIONS_DATA.forEach(item => { item.expanded = flag; });
      renderTenQuestions();
    }

    function renderOverviewCharts() {
      // Chart 1: Global Region & Group Shares (1985 vs 2026 Nominal & 2026 PPP)
      const ctx1 = document.getElementById('chartGlobalShares').getContext('2d');
      if (charts.globalShares) charts.globalShares.destroy();

      const categories = ['亚洲 (19)', '欧洲 (20)', '美洲 (8)', '非洲 (8)', '发达经济体 (25)', '新兴与发展中 (30)'];
      const sumByFilter = (fn, field) => ECONOMIES.filter(fn).reduce((acc, e) => acc + (e[field] || e.gdpNom1990 || 0), 0);

      const tot1985 = ECONOMIES.reduce((a, e) => a + (e.gdpNom1985 || e.gdpNom1990), 0);
      const tot2026Nom = ECONOMIES.reduce((a, e) => a + e.gdpNom2026, 0);
      const tot2026Ppp = ECONOMIES.reduce((a, e) => a + e.gdpPpp2026, 0);

      const filters = [
        e => e.region === '亚洲',
        e => e.region === '欧洲',
        e => e.region === '美洲',
        e => e.region === '非洲',
        e => e.group === '发达经济体',
        e => e.group === '新兴与发展中经济体'
      ];

      const share85 = filters.map(fn => +((sumByFilter(fn, 'gdpNom1985') / tot1985) * 100).toFixed(1));
      const share26Nom = filters.map(fn => +((sumByFilter(fn, 'gdpNom2026') / tot2026Nom) * 100).toFixed(1));
      const share26Ppp = filters.map(fn => +((sumByFilter(fn, 'gdpPpp2026') / tot2026Ppp) * 100).toFixed(1));

      charts.globalShares = new Chart(ctx1, {
        type: 'bar',
        data: {
          labels: categories,
          datasets: [
            { label: '1985 名义GDP份额 (%)', data: share85, backgroundColor: '#857D74' },
            { label: '2026 名义美元GDP份额 (%)', data: share26Nom, backgroundColor: '#C86D51' },
            { label: '2026 PPP购买力平价份额 (%)', data: share26Ppp, backgroundColor: '#6B8E78' }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { font: { size: 11 } } },
            tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y}%` } }
          },
          scales: {
            y: { beginAtZero: true, max: 75, title: { display: true, text: '占55国经济总量比例 (%)' } }
          }
        }
      });

      renderOverviewMultChart();
    }

    function renderOverviewMultChart() {
      const mode = document.getElementById('overviewGroupSelect').value;
      let list = [];
      if (mode === 'TOP_GROWTH') {
        list = [...ECONOMIES].sort((a, b) => b.realMult40y - a.realMult40y).slice(0, 15);
      } else if (mode === 'DIVERGENCE') {
        list = [...ECONOMIES].sort((a, b) => (b.realMult40y / b.realPcMult40y) - (a.realMult40y / a.realPcMult40y)).slice(0, 15);
      } else if (mode === 'STAGNANT') {
        list = [...ECONOMIES].sort((a, b) => a.realPcMult40y - b.realPcMult40y).slice(0, 15);
      } else {
        const repIds = ['CHN', 'VNM', 'IND', 'SGP', 'IRL', 'KOR', 'TWN', 'MYS', 'POL', 'CHL', 'USA', 'DEU', 'JPN', 'BRA', 'MEX', 'ARG', 'ITA', 'ZAF'];
        list = repIds.map(id => ECON_MAP[id]).filter(Boolean);
      }

      const ctx2 = document.getElementById('chartOverviewMultipliers').getContext('2d');
      if (charts.overviewMult) charts.overviewMult.destroy();

      charts.overviewMult = new Chart(ctx2, {
        type: 'bar',
        data: {
          labels: list.map(e => e.name),
          datasets: [
            { label: '40年实际GDP总量增长倍数 (x)', data: list.map(e => e.realMult40y), backgroundColor: '#5B7C99' },
            { label: '40年实际人均GDP增长倍数 (x)', data: list.map(e => e.realPcMult40y), backgroundColor: '#D49A45' }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { font: { size: 11 } } }
          },
          scales: {
            y: { beginAtZero: true, title: { display: true, text: '1985–2026 累计实际增长倍数 (倍)' } }
          }
        }
      });
    }

    // ==================== TAB 2 FUNCTIONS ====================
    function initTsCheckboxes() {
      const box = document.getElementById('tsCountryCheckboxes');
      box.innerHTML = '';
      const list = getFilteredEconomies();
      list.forEach(e => {
        const active = state.selectedTsIds.includes(e.id);
        const btn = document.createElement('button');
        btn.className = `px-2.5 py-1 rounded-md text-xs font-semibold transition border ${
          active
            ? 'bg-[#C86D51] text-[#FFFDF9] border-[#C86D51] shadow-sm'
            : 'bg-white text-[#5C554E] border-[#E3DDD1] hover:bg-[#EFECE4]'
        }`;
        btn.textContent = `${e.name}`;
        btn.onclick = () => toggleTsEconomy(e.id);
        box.appendChild(btn);
      });
    }

    function toggleTsEconomy(id) {
      const idx = state.selectedTsIds.indexOf(id);
      if (idx >= 0) {
        if (state.selectedTsIds.length <= 1) {
          showToast('请至少保留 1 个研究对象');
          return;
        }
        state.selectedTsIds.splice(idx, 1);
      } else {
        if (state.selectedTsIds.length >= 10) {
          showToast('最多同时对比 10 条时间序列曲线，已自动替换最早勾选项');
          state.selectedTsIds.pop();
        }
        state.selectedTsIds.push(id);
      }
      initTsCheckboxes();
      renderTimeSeriesCharts();
    }

    function applyTsPreset() {
      const preset = document.getElementById('tsPresetSelect').value;
      if (preset === 'GREATER_CHINA') {
        state.selectedTsIds = ['CHN', 'TWN', 'HKG', 'MAC'];
      } else if (preset === 'G7_BRICS') {
        state.selectedTsIds = ['USA', 'CHN', 'DEU', 'JPN', 'IND', 'GBR', 'FRA', 'BRA'];
      } else if (preset === 'ASIAN_TIGERS') {
        state.selectedTsIds = ['CHN', 'KOR', 'TWN', 'SGP', 'VNM', 'IND', 'MYS', 'THA'];
      } else if (preset === 'EAST_EUROPE') {
        state.selectedTsIds = ['POL', 'CZE', 'HUN', 'ROU', 'ITA', 'ESP', 'GRC'];
      } else if (preset === 'AFRICA_LATAM') {
        state.selectedTsIds = ['ZAF', 'NGA', 'EGY', 'MAR', 'BRA', 'MEX', 'ARG', 'CHL'];
      } else {
        state.selectedTsIds = [state.primaryId, state.compareId, 'JPN', 'DEU', 'IND', 'TWN', 'KOR'];
      }
      initTsCheckboxes();
      renderTimeSeriesCharts();
    }

    const PALETTE_10 = [
      '#C86D51', '#D49A45', '#6B8E78', '#8E5B66', '#8E5B66',
      '#5B7C99', '#A36A4F', '#7A8B5B', '#f97316', '#475569'
    ];

    function renderTimeSeriesCharts() {
      const metric = document.getElementById('tsMetricSelect').value;
      const metricLabels = {
        gdpNom: '名义 GDP (十亿美元 Current US$)',
        realIdx: '实际 GDP 增长指数 (1985/首年 = 100)',
        realGrowth: '实际 GDP 年度增长率 (%)',
        pcNom: '名义人均 GDP (美元 US$)',
        pcPpp: 'PPP 购买力平价人均 GDP (国际元 Intl$)',
        pop: '总人口 (百万人)'
      };

      const ctx = document.getElementById('chartMainTimeSeries').getContext('2d');
      if (charts.mainTs) charts.mainTs.destroy();

      const datasets = state.selectedTsIds.map((id, idx) => {
        const e = ECON_MAP[id];
        return {
          label: `${e.name} (${e.id})`,
          data: e.series[metric],
          borderColor: PALETTE_10[idx % PALETTE_10.length],
          backgroundColor: PALETTE_10[idx % PALETTE_10.length] + '22',
          borderWidth: (id === state.primaryId || id === state.compareId) ? 3 : 1.8,
          pointRadius: 1.5,
          tension: 0.25,
          spanGaps: false // Explicitly leave gaps for missing years (no fake linear interpolation!)
        };
      });

      charts.mainTs = new Chart(ctx, {
        type: 'line',
        data: { labels: YEARS, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { position: 'top', labels: { font: { size: 11 } } },
            tooltip: {
              callbacks: {
                label: ctx => {
                  const v = ctx.parsed.y;
                  if (v === null || v === undefined) return `${ctx.dataset.label}: 数据缺失 (Missing)`;
                  return `${ctx.dataset.label}: ${v.toLocaleString()}`;
                }
              }
            }
          },
          scales: {
            y: { title: { display: true, text: metricLabels[metric] } }
          }
        }
      });

      // Populate diagnostic sidebar
      const diagBox = document.getElementById('tsDiagnosticBox');
      diagBox.innerHTML = state.selectedTsIds.slice(0, 6).map((id, i) => {
        const e = ECON_MAP[id];
        const missNote = e.missingUntil ? `<span class="text-[#9E4B32] font-semibold">[1985–${e.missingUntil}官方市场价SNA缺失]</span>` : '';
        return `
          <div class="p-2 rounded bg-white border border-[#E3DDD1]">
            <div class="font-bold text-[#2C2825] flex items-center justify-between">
              <span><span class="inline-block w-2 h-2 rounded-full mr-1" style="background:${PALETTE_10[i % PALETTE_10.length]}"></span>${e.name}</span>
              <span class="text-[11px] text-[#857D74]">实际增长 ${e.realMult40y}x / 人均 ${e.realPcMult40y}x</span>
            </div>
            <div class="text-[11px] text-[#5C554E] mt-0.5">
              1985名义: ${e.gdpNom1985 !== null ? '$'+e.gdpNom1985+'B' : '缺失(1990:$'+e.gdpNom1990+'B)'} → 2026预测: <strong>$${e.gdpNom2026.toLocaleString()}B</strong> ${missNote}
            </div>
            <div class="text-[11px] text-[#857D74]">来源: <a href="${e.sourceUrl}" target="_blank" class="text-[#C86D51] underline">${e.source}</a> (${e.status2026})</div>
          </div>
        `;
      }).join('');
    }

    function renderPopVsPcScatter() {
      const ctx = document.getElementById('chartPopVsPcScatter').getContext('2d');
      if (charts.popPcScatter) charts.popPcScatter.destroy();

      const list = getFilteredEconomies();
      const regionColors = { '亚洲': '#C86D51', '欧洲': '#6B8E78', '美洲': '#D49A45', '非洲': '#8E5B66' };

      const datasets = ['亚洲', '欧洲', '美洲', '非洲'].map(reg => {
        const sub = list.filter(e => e.region === reg);
        return {
          label: reg,
          data: sub.map(e => ({
            x: e.popMult40y,
            y: Math.min(e.realPcMult40y, 12), // cap display outlier for readability while showing true value in tooltip
            rawY: e.realPcMult40y,
            r: Math.max(4, Math.min(24, Math.sqrt(e.gdpNom2026) * 0.16)),
            name: e.name,
            gdp: e.gdpNom2026,
            realMult: e.realMult40y
          })),
          backgroundColor: regionColors[reg] + 'aa',
          borderColor: regionColors[reg],
          borderWidth: 1.5
        };
      });

      charts.popPcScatter = new Chart(ctx, {
        type: 'bubble',
        data: { datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' },
            tooltip: {
              callbacks: {
                label: ctx => {
                  const d = ctx.raw;
                  return `${d.name}: 人口增长 ${d.x}倍 | 实际人均GDP增长 ${d.rawY}倍 | 实际GDP总量 ${d.realMult}倍`;
                }
              }
            }
          },
          scales: {
            x: { title: { display: true, text: '1985–2026 总人口增长倍数 (x)' }, min: 0.7, max: 4.0 },
            y: { title: { display: true, text: '1985–2026 实际人均GDP增长倍数 (x, 顶格展示>10x)' }, min: 0.5, max: 12.5 }
          }
        }
      });
    }

    function renderRankTable() {
      const sortKey = document.getElementById('rankSortSelect').value;
      let list = [...getFilteredEconomies()];
      if (sortKey === 'rankNom2026') list.sort((a, b) => a.rankNom2026 - b.rankNom2026);
      else if (sortKey === 'rankPpp2026') list.sort((a, b) => a.rankPpp2026 - b.rankPpp2026);
      else if (sortKey === 'rankChangeDesc') list.sort((a, b) => b.rankChange40y - a.rankChange40y);
      else if (sortKey === 'realCagrDesc') list.sort((a, b) => b.realCagr40y - a.realCagr40y);

      const tbody = document.getElementById('rankTableBody');
      tbody.innerHTML = list.map(e => {
        const chg = e.rankChange40y;
        const chgBadge = chg > 0
          ? `<span class="text-[#466652] font-bold">▲ +${chg}</span>`
          : (chg < 0 ? `<span class="text-[#9E4B32] font-bold">▼ ${chg}</span>` : `<span class="text-[#857D74]">- 0</span>`);
        const g85 = e.gdpNom1985 !== null ? `$${e.gdpNom1985.toLocaleString()}` : `<span class="text-[#96651B]">缺失(90:$${e.gdpNom1990})</span>`;
        return `
          <tr class="hover:bg-[#FAF7F0] cursor-pointer" onclick="selectPrimaryFromTable('${e.id}')">
            <td class="p-2 font-bold text-[#2C2825]">
              #${e.rankNom2026} ${e.name} <span class="text-[11px] text-[#857D74] font-normal">(PPP #${e.rankPpp2026})</span>
            </td>
            <td class="p-2 text-right font-mono">${g85}</td>
            <td class="p-2 text-right font-mono font-bold text-[#9E4B32]">$${e.gdpNom2026.toLocaleString()}</td>
            <td class="p-2 text-right font-mono text-[#466652]">$${e.gdpPpp2026.toLocaleString()}</td>
            <td class="p-2 text-center">${chgBadge} <span class="text-[10px] text-[#857D74]">(${e.rankNom1985}→${e.rankNom2026})</span></td>
            <td class="p-2 text-right font-bold">${e.realMult40y}x <span class="text-[10px] font-normal text-[#857D74]">(${e.realCagr40y}%)</span></td>
            <td class="p-2 text-right font-semibold text-[#96651B]">${e.realPcMult40y}x</td>
          </tr>
        `;
      }).join('');
    }

    function selectPrimaryFromTable(id) {
      state.primaryId = id;
      document.getElementById('globalPrimarySelect').value = id;
      handleGlobalControlChange();
      showToast(`已将主研究对象切换为：${ECON_MAP[id].name}`);
    }

    // ==================== TAB 3 FUNCTIONS ====================
    function renderSectorCharts() {
      renderSingleSectorArea('chartSectorAreaPrimary', state.primaryId, 'secTitlePrimary', 'secBadgePrimary', 'secDiagPrimary');
      renderSingleSectorArea('chartSectorAreaCompare', state.compareId, 'secTitleCompare', 'secBadgeCompare', 'secDiagCompare');
    }

    function renderSingleSectorArea(canvasId, econId, titleId, badgeId, diagId) {
      const e = ECON_MAP[econId];
      if (!e) return;
      document.getElementById(titleId).textContent = `${e.name} (${e.en})：1985–2026 三大产业占GDP比例堆叠面积图`;
      document.getElementById(badgeId).textContent = `2026制造业占比: ${e.mfgShare2026}% (1985: ${e.mfgShare1985}%)`;
      document.getElementById(diagId).innerHTML = `
        <div><strong>1985→2026 三次产业演变：</strong>第一产业 ${e.sec1985[0]}% → <strong>${e.sec2026[0]}%</strong> | 第二产业 ${e.sec1985[1]}% → <strong>${e.sec2026[1]}%</strong> | 第三产业 ${e.sec1985[2]}% → <strong>${e.sec2026[2]}%</strong></div>
        <div class="mt-1"><strong>支柱与高附加值产业：</strong>${e.keyIndustries}</div>
        <div class="mt-1 text-[#5C554E]"><strong>转型质量评估：</strong>${e.upgradingDiagnosis}</div>
      `;

      const ctx = document.getElementById(canvasId).getContext('2d');
      if (charts[canvasId]) charts[canvasId].destroy();

      charts[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
          labels: YEARS,
          datasets: [
            {
              label: '第一产业 (农业 %)',
              data: e.series.sec1,
              borderColor: '#6B8E78',
              backgroundColor: 'rgba(107, 142, 120, 0.55)',
              fill: true,
              pointRadius: 0,
              borderWidth: 1.5,
              stack: 'secStack'
            },
            {
              label: '第二产业 (工业与建筑 %)',
              data: e.series.sec2,
              borderColor: '#5B7C99',
              backgroundColor: 'rgba(91, 124, 153, 0.55)',
              fill: true,
              pointRadius: 0,
              borderWidth: 1.5,
              stack: 'secStack'
            },
            {
              label: '第三产业 (服务业 %)',
              data: e.series.sec3,
              borderColor: '#8E5B66',
              backgroundColor: 'rgba(139, 92, 246, 0.55)',
              fill: true,
              pointRadius: 0,
              borderWidth: 1.5,
              stack: 'secStack'
            },
            {
              label: '其中：制造业占GDP比例 (%) [独立折线]',
              data: e.series.mfg,
              borderColor: '#9E4B32',
              backgroundColor: 'transparent',
              borderDash: [5, 3],
              fill: false,
              pointRadius: 1,
              borderWidth: 2.5,
              yAxisID: 'y'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { position: 'top', labels: { font: { size: 10.5 } } }
          },
          scales: {
            y: {
              stacked: true,
              min: 0,
              max: 100,
              title: { display: true, text: '占 GDP 比重 (%)' }
            }
          }
        }
      });
    }

    function renderMfgComparisonChart() {
      const mode = document.getElementById('mfgFilterSelect').value;
      let list = [];
      if (mode === 'ASIA') list = ECONOMIES.filter(e => e.region === '亚洲');
      else if (mode === 'EUROPE') list = ECONOMIES.filter(e => e.region === '欧洲');
      else if (mode === 'AMERICAS_AFRICA') list = ECONOMIES.filter(e => e.region === '美洲' || e.region === '非洲');
      else {
        const ids = ['TWN', 'IRL', 'KOR', 'CHN', 'THA', 'VNM', 'MYS', 'CZE', 'HUN', 'JPN', 'DEU', 'CHE', 'SGP', 'MEX', 'IND', 'USA', 'BRA', 'ZAF', 'GBR', 'HKG'];
        list = ids.map(id => ECON_MAP[id]).filter(Boolean);
      }

      const ctx = document.getElementById('chartMfgComparison').getContext('2d');
      if (charts.mfgComp) charts.mfgComp.destroy();

      charts.mfgComp = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: list.map(e => e.name),
          datasets: [
            { label: '1985 制造业占GDP (%)', data: list.map(e => e.mfgShare1985), backgroundColor: '#857D74' },
            { label: '2026 制造业占GDP (%)', data: list.map(e => e.mfgShare2026), backgroundColor: '#C86D51' },
            { label: '高技术制成品占出口比重 (%)', data: list.map(e => e.hiTechMfgExportShare), backgroundColor: '#6B8E78' }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'top', labels: { font: { size: 11 } } } },
          scales: { y: { beginAtZero: true, title: { display: true, text: '百分比 (%)' } } }
        }
      });
    }

    function renderIndustrialTable() {
      const list = getFilteredEconomies();
      const tbody = document.getElementById('industrialTableBody');
      tbody.innerHTML = list.map(e => {
        const diff = (e.mfgShare2026 - e.mfgShare1985).toFixed(1);
        const diffCls = diff >= 0 ? 'text-[#466652] font-bold' : 'text-[#9E4B32]';
        return `
          <tr class="hover:bg-[#FAF7F0] cursor-pointer" onclick="selectPrimaryFromTable('${e.id}')">
            <td class="p-2.5 font-bold text-[#2C2825]">${e.name} <span class="text-[#857D74] font-normal">(${e.region})</span></td>
            <td class="p-2.5 text-right font-mono">${e.mfgShare1985}% → <strong>${e.mfgShare2026}%</strong> <span class="${diffCls}">(${diff > 0 ? '+'+diff : diff}%)</span></td>
            <td class="p-2.5 text-right font-mono font-bold text-[#466652]">${e.hiTechMfgExportShare}%</td>
            <td class="p-2.5 text-[#5C554E] max-w-xs">${e.keyIndustries}</td>
            <td class="p-2.5 text-[#5C554E] max-w-md">${e.upgradingDiagnosis}</td>
          </tr>
        `;
      }).join('');
    }

    // ==================== TAB 4 FUNCTIONS ====================
    function renderIncomeCharts() {
      const reg = document.getElementById('wageRegionSelect').value;
      let list = [];
      if (reg === 'TOP20') {
        const ids = ['CHE', 'USA', 'NOR', 'SGP', 'DNK', 'NLD', 'DEU', 'GBR', 'FRA', 'HKG', 'TWN', 'KOR', 'JPN', 'ESP', 'POL', 'CHN', 'MEX', 'BRA', 'ZAF', 'IND'];
        list = ids.map(id => ECON_MAP[id]).filter(Boolean);
      } else {
        list = ECONOMIES.filter(e => e.region === reg);
      }

      const ctx1 = document.getElementById('chartWagesComparison').getContext('2d');
      if (charts.wagesComp) charts.wagesComp.destroy();

      charts.wagesComp = new Chart(ctx1, {
        type: 'bar',
        data: {
          labels: list.map(e => e.name),
          datasets: [
            { label: '年平均工资 ($)', data: list.map(e => e.meanWage2026), backgroundColor: '#5B7C99' },
            { label: '年中位数工资 ($)', data: list.map(e => e.medianWage2026), backgroundColor: '#6B8E78' },
            { label: '人均可支配收入 ($)', data: list.map(e => e.dispIncomePc2026), backgroundColor: '#D49A45' }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'top', labels: { font: { size: 11 } } } },
          scales: { y: { beginAtZero: true, title: { display: true, text: '美元 (USD)' } } }
        }
      });

      // Scatter: Real GDP CAGR vs Real Wage CAGR
      const ctx2 = document.getElementById('chartIncomeVsGdpScatter').getContext('2d');
      if (charts.incomeScatter) charts.incomeScatter.destroy();

      const regionColors = { '亚洲': '#C86D51', '欧洲': '#6B8E78', '美洲': '#D49A45', '非洲': '#8E5B66' };
      const scatterDatasets = ['亚洲', '欧洲', '美洲', '非洲'].map(r => ({
        label: r,
        data: ECONOMIES.filter(e => e.region === r).map(e => ({
          x: e.realCagr40y,
          y: e.realWageCagr,
          r: Math.max(5, (e.gini - 20) * 0.45),
          name: e.name,
          gini: e.gini,
          laborShare: e.laborShareGdp
        })),
        backgroundColor: regionColors[r] + 'aa',
        borderColor: regionColors[r]
      }));

      charts.incomeScatter = new Chart(ctx2, {
        type: 'bubble',
        data: { datasets: scatterDatasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' },
            tooltip: {
              callbacks: {
                label: ctx => {
                  const d = ctx.raw;
                  return `${d.name}: 实际GDP年均 ${d.x}% | 实际工资年均 ${d.y}% | 基尼系数 ${d.gini} | 劳动报酬占比 ${d.laborShare}%`;
                }
              }
            }
          },
          scales: {
            x: { title: { display: true, text: '40年实际 GDP 年均复合增长率 CAGR (%)' } },
            y: { title: { display: true, text: '40年居民实际工资年均增长率 (%)' } }
          }
        }
      });
    }

    function renderIncomeTable() {
      const list = getFilteredEconomies();
      const tbody = document.getElementById('incomeTableBody');
      tbody.innerHTML = list.map(e => {
        const giniCls = e.gini >= 45 ? 'text-[#9E4B32] font-bold' : (e.gini <= 30 ? 'text-[#466652] font-bold' : 'text-[#5C554E]');
        return `
          <tr class="hover:bg-[#FAF7F0] cursor-pointer" onclick="selectPrimaryFromTable('${e.id}')">
            <td class="p-2.5 font-bold text-[#2C2825]">${e.name}</td>
            <td class="p-2.5 text-right font-mono">$${e.pcNom2026.toLocaleString()}</td>
            <td class="p-2.5 text-right font-mono font-semibold text-[#9E4B32]">$${e.dispIncomePc2026.toLocaleString()}</td>
            <td class="p-2.5 text-right font-mono">$${e.meanWage2026.toLocaleString()}</td>
            <td class="p-2.5 text-right font-mono font-bold text-[#466652]">$${e.medianWage2026.toLocaleString()}</td>
            <td class="p-2.5 text-right font-mono">${e.medianToMeanRatio}%</td>
            <td class="p-2.5 text-right font-mono">${e.realWageCagr}%</td>
            <td class="p-2.5 text-right font-mono">${e.laborShareGdp}%</td>
            <td class="p-2.5 text-right font-mono">${e.consRateGdp}%</td>
            <td class="p-2.5 text-right font-mono">${e.savingRate}%</td>
            <td class="p-2.5 text-right font-mono ${giniCls}">${e.gini}</td>
            <td class="p-2.5 text-right font-mono">${e.socSecCoverage}%</td>
          </tr>
        `;
      }).join('');
    }

    // ==================== TAB 5 FUNCTIONS ====================
    function renderLaborCharts() {
      const reg = document.getElementById('prodRegionSelect').value;
      let list = [];
      if (reg === 'TOP22') {
        const ids = ['IRL', 'NOR', 'CHE', 'USA', 'SGP', 'DNK', 'NLD', 'DEU', 'FRA', 'GBR', 'HKG', 'TWN', 'JPN', 'KOR', 'POL', 'TUR', 'CHN', 'MEX', 'ZAF', 'BRA', 'VNM', 'IND'];
        list = ids.map(id => ECON_MAP[id]).filter(Boolean);
      } else {
        list = ECONOMIES.filter(e => e.region === reg);
      }

      const ctx1 = document.getElementById('chartProductivityBar').getContext('2d');
      if (charts.prodBar) charts.prodBar.destroy();

      charts.prodBar = new Chart(ctx1, {
        type: 'bar',
        data: {
          labels: list.map(e => e.name),
          datasets: [
            { label: '每小时劳动生产率 ($ PPP/小时)', data: list.map(e => e.prodPerHour), backgroundColor: '#C86D51', yAxisID: 'y' },
            { label: '青年失业率 (%)', data: list.map(e => e.youthUnemp), backgroundColor: '#8E5B66', yAxisID: 'y1' }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'top' } },
          scales: {
            y: { type: 'linear', position: 'left', title: { display: true, text: '每小时产出 ($ PPP)' } },
            y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: '青年失业率 (%)' } }
          }
        }
      });

      const ctx2 = document.getElementById('chartLaborScatter').getContext('2d');
      if (charts.laborScatter) charts.laborScatter.destroy();

      const regionColors = { '亚洲': '#C86D51', '欧洲': '#6B8E78', '美洲': '#D49A45', '非洲': '#8E5B66' };
      charts.laborScatter = new Chart(ctx2, {
        type: 'bubble',
        data: {
          datasets: ['亚洲', '欧洲', '美洲', '非洲'].map(r => ({
            label: r,
            data: ECONOMIES.filter(e => e.region === r).map(e => ({
              x: e.srvEmpShare,
              y: e.prodPerWorker,
              r: Math.max(4, e.mfgEmpShare * 0.55),
              name: e.name,
              mfgEmp: e.mfgEmpShare,
              unemp: e.unempRate
            })),
            backgroundColor: regionColors[r] + 'aa',
            borderColor: regionColors[r]
          }))
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' },
            tooltip: {
              callbacks: {
                label: ctx => {
                  const d = ctx.raw;
                  return `${d.name}: 服务业就业 ${d.x}% | 制造业就业 ${d.mfgEmp}% | 劳均产出 $${d.y.toLocaleString()} | 失业率 ${d.unemp}%`;
                }
              }
            }
          },
          scales: {
            x: { title: { display: true, text: '服务业就业人数占总就业比例 (%)' } },
            y: { title: { display: true, text: '劳均年度产出 ($ PPP)' } }
          }
        }
      });
    }

    function renderLaborTable() {
      const list = getFilteredEconomies();
      const tbody = document.getElementById('laborTableBody');
      tbody.innerHTML = list.map(e => `
        <tr class="hover:bg-[#FAF7F0] cursor-pointer" onclick="selectPrimaryFromTable('${e.id}')">
          <td class="p-2.5 font-bold text-[#2C2825]">${e.name}</td>
          <td class="p-2.5 text-right font-mono font-bold text-[#9E4B32]">$${e.prodPerHour}</td>
          <td class="p-2.5 text-right font-mono">$${e.prodPerWorker.toLocaleString()}</td>
          <td class="p-2.5 text-right font-mono ${e.unempRate > 10 ? 'text-[#9E4B32] font-bold' : ''}">${e.unempRate}%</td>
          <td class="p-2.5 text-right font-mono ${e.youthUnemp > 20 ? 'text-[#9E4B32] font-bold' : ''}">${e.youthUnemp}%</td>
          <td class="p-2.5 text-right font-mono">${e.lfpRate}%</td>
          <td class="p-2.5 text-right font-mono">${e.empPopRatio}%</td>
          <td class="p-2.5 text-right font-mono font-semibold text-[#466652]">${e.mfgEmpShare}%</td>
          <td class="p-2.5 text-right font-mono">${e.srvEmpShare}%</td>
          <td class="p-2.5 text-[#5C554E]">${e.laborArchetype}</td>
        </tr>
      `).join('');
    }

    // ==================== TAB 6 FUNCTIONS ====================
    function renderMacroCharts() {
      const reg = document.getElementById('debtFilterSelect').value;
      let list = [];
      if (reg === 'TOP22') {
        const ids = ['JPN', 'HKG', 'SGP', 'FRA', 'CAN', 'CHN', 'USA', 'BEL', 'CHE', 'KOR', 'NLD', 'GBR', 'ITA', 'GRC', 'ESP', 'THA', 'MYS', 'BRA', 'DEU', 'IND', 'TWN', 'MAC'];
        list = ids.map(id => ECON_MAP[id]).filter(Boolean);
      } else {
        list = ECONOMIES.filter(e => e.region === reg);
      }

      const ctx1 = document.getElementById('chartDebtStacked').getContext('2d');
      if (charts.debtStacked) charts.debtStacked.destroy();

      charts.debtStacked = new Chart(ctx1, {
        type: 'bar',
        data: {
          labels: list.map(e => e.name),
          datasets: [
            { label: '政府总债务 (% GDP)', data: list.map(e => e.govDebt), backgroundColor: '#8E5B66', stack: 'debt' },
            { label: '居民部门债务 (% GDP)', data: list.map(e => e.hhDebt), backgroundColor: '#D49A45', stack: 'debt' },
            { label: '非金融企业债务 (% GDP)', data: list.map(e => e.corpDebt), backgroundColor: '#5B7C99', stack: 'debt' }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'top' } },
          scales: {
            x: { stacked: true },
            y: { stacked: true, title: { display: true, text: '实体部门总杠杆率 (% of GDP)' } }
          }
        }
      });

      // Inflation History for Primary vs Compare + Global benchmark
      const p = ECON_MAP[state.primaryId];
      const c = ECON_MAP[state.compareId];
      const ctx2 = document.getElementById('chartInflationHistory').getContext('2d');
      if (charts.inflationHist) charts.inflationHist.destroy();

      charts.inflationHist = new Chart(ctx2, {
        type: 'line',
        data: {
          labels: YEARS,
          datasets: [
            {
              label: `${p.name} CPI通胀率 (%)`,
              data: p.series.cpi.map(v => Math.min(v, 100)),
              borderColor: '#C86D51',
              backgroundColor: 'rgba(200, 109, 81, 0.1)',
              borderWidth: 2.5,
              tension: 0.2
            },
            {
              label: `${c.name} CPI通胀率 (%)`,
              data: c.series.cpi.map(v => Math.min(v, 100)),
              borderColor: '#D49A45',
              backgroundColor: 'rgba(212, 154, 69, 0.1)',
              borderWidth: 2.5,
              tension: 0.2
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' },
            tooltip: {
              callbacks: {
                afterBody: () => `注：${p.name} (${p.inflationNote})；${c.name} (${c.inflationNote})`
              }
            }
          },
          scales: {
            y: { title: { display: true, text: '年度 CPI 通胀率 (%, 极值截断于100%)' } }
          }
        }
      });
    }

    function renderMacroTable() {
      const list = getFilteredEconomies();
      const tbody = document.getElementById('macroTableBody');
      tbody.innerHTML = list.map(e => `
        <tr class="hover:bg-[#FAF7F0] cursor-pointer" onclick="selectPrimaryFromTable('${e.id}')">
          <td class="p-2 font-bold text-[#2C2825]">${e.name}</td>
          <td class="p-2 text-right font-mono ${e.govDebt > 100 ? 'text-[#9E4B32] font-bold' : ''}">${e.govDebt}%</td>
          <td class="p-2 text-right font-mono ${e.hhDebt > 80 ? 'text-[#96651B] font-bold' : ''}">${e.hhDebt}%</td>
          <td class="p-2 text-right font-mono">${e.corpDebt}%</td>
          <td class="p-2 text-right font-mono ${e.fiscalBalance < -5 ? 'text-[#9E4B32] font-bold' : 'text-[#466652]'}">${e.fiscalBalance}%</td>
          <td class="p-2 text-right font-mono ${e.interestBurden > 20 ? 'text-[#9E4B32] font-bold' : ''}">${e.interestBurden}%</td>
          <td class="p-2 text-right font-mono">${e.cpi2026}%</td>
          <td class="p-2 text-right font-mono ${e.caBalance >= 0 ? 'text-[#466652]' : 'text-[#9E4B32]'}">${e.caBalance}%</td>
          <td class="p-2 text-right font-mono">$${e.fxReservesB}B</td>
          <td class="p-2 text-right font-mono">${e.exportDep}%</td>
          <td class="p-2 text-[#5C554E] max-w-md">${e.finRisk}</td>
        </tr>
      `).join('');
    }

    // ==================== TAB 7 FUNCTIONS ====================
    function renderDemoCharts() {
      const ctx1 = document.getElementById('chartDemoScatter').getContext('2d');
      if (charts.demoScatter) charts.demoScatter.destroy();

      const regionColors = { '亚洲': '#C86D51', '欧洲': '#6B8E78', '美洲': '#D49A45', '非洲': '#8E5B66' };
      charts.demoScatter = new Chart(ctx1, {
        type: 'bubble',
        data: {
          datasets: ['亚洲', '欧洲', '美洲', '非洲'].map(r => ({
            label: r,
            data: ECONOMIES.filter(e => e.region === r).map(e => ({
              x: e.tfr2026,
              y: e.aging2026,
              r: Math.max(5, Math.min(22, Math.sqrt(e.pop2026) * 0.65)),
              name: e.name,
              pop: e.pop2026,
              pot: e.potentialGrowth
            })),
            backgroundColor: regionColors[r] + 'aa',
            borderColor: regionColors[r]
          }))
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' },
            tooltip: {
              callbacks: {
                label: ctx => {
                  const d = ctx.raw;
                  return `${d.name}: 2026生育率 ${d.x} | 65岁+老龄化率 ${d.y}% | 总人口 ${d.pop}M | 潜在增速 ${d.pot}%`;
                }
              }
            }
          },
          scales: {
            x: { title: { display: true, text: '2026 总和生育率 (TFR, 世代更替线=2.1)' }, min: 0.5, max: 4.8 },
            y: { title: { display: true, text: '2026 65岁及以上老年人口占比 (%)' }, min: 0, max: 33 }
          }
        }
      });

      const reg = document.getElementById('demoRegionSelect').value;
      let list = [];
      if (reg === 'KEY20') {
        const ids = ['JPN', 'ITA', 'FIN', 'GRC', 'DEU', 'KOR', 'TWN', 'HKG', 'CHN', 'THA', 'USA', 'SGP', 'BRA', 'MEX', 'VNM', 'IND', 'IDN', 'EGY', 'ETH', 'NGA'];
        list = ids.map(id => ECON_MAP[id]).filter(Boolean);
      } else {
        list = ECONOMIES.filter(e => e.region === reg);
      }

      const ctx2 = document.getElementById('chartDemoPotential').getContext('2d');
      if (charts.demoPot) charts.demoPot.destroy();

      charts.demoPot = new Chart(ctx2, {
        type: 'bar',
        data: {
          labels: list.map(e => e.name),
          datasets: [
            { label: '1985 劳动年龄人口占比 (%)', data: list.map(e => e.workAge1985), backgroundColor: '#857D74', yAxisID: 'y' },
            { label: '2026 劳动年龄人口占比 (%)', data: list.map(e => e.workAge2026), backgroundColor: '#5B7C99', yAxisID: 'y' },
            { label: '中长期潜在GDP增长率 (%)', data: list.map(e => e.potentialGrowth), type: 'line', borderColor: '#6B8E78', backgroundColor: '#6B8E78', borderWidth: 2.5, yAxisID: 'y1' }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'top' } },
          scales: {
            y: { position: 'left', min: 40, max: 90, title: { display: true, text: '15–64岁劳动年龄人口占比 (%)' } },
            y1: { position: 'right', min: 0, max: 8, grid: { drawOnChartArea: false }, title: { display: true, text: '潜在GDP增长率 (%)' } }
          }
        }
      });
    }

    function renderDemoTable() {
      const list = getFilteredEconomies();
      const tbody = document.getElementById('demoTableBody');
      tbody.innerHTML = list.map(e => {
        let impact = '';
        if (e.aging2026 >= 20) {
          impact = '超老龄社会：养老医疗财政支出刚性扩张，住宅新增需求饱和，依赖自动化与提高生产率维持增长';
        } else if (e.tfr2026 < 1.3 && e.aging2026 >= 14) {
          impact = '未富先老/急速老龄化：人口红利窗口关闭，未来10年劳动力与购房主力人口面临快速下滑';
        } else if (e.workAge2026 >= 66 && e.tfr2026 >= 1.7) {
          impact = '人口红利黄金期：劳动供给充沛、城镇化与首次置业消费需求旺盛，关键在于创造足够工业与现代服务岗位';
        } else if (e.tfr2026 >= 3.0) {
          impact = '高抚养比年轻结构：少儿抚养负担重、基础设施与教育投资压力巨大，若就业不足易引发青年失业风险';
        } else {
          impact = '温和老龄化与移民补充：通过技术移民或温和生育率稳定劳动年龄人口规模';
        }
        return `
          <tr class="hover:bg-[#FAF7F0] cursor-pointer" onclick="selectPrimaryFromTable('${e.id}')">
            <td class="p-2.5 font-bold text-[#2C2825]">${e.name}</td>
            <td class="p-2.5 text-right font-mono">${e.pop1985}M → <strong>${e.pop2026}M</strong></td>
            <td class="p-2.5 text-right font-mono ${e.tfr2026 < 1.1 ? 'text-[#9E4B32] font-bold' : ''}">${e.tfr1985} → <strong>${e.tfr2026}</strong></td>
            <td class="p-2.5 text-right font-mono ${e.aging2026 >= 20 ? 'text-[#8E5B66] font-bold' : ''}">${e.aging1985}% → <strong>${e.aging2026}%</strong></td>
            <td class="p-2.5 text-right font-mono">${e.workAge1985}% → <strong>${e.workAge2026}%</strong></td>
            <td class="p-2.5 text-right font-mono">${e.urban2026}%</td>
            <td class="p-2.5 text-right font-mono">${e.netMigration}‰</td>
            <td class="p-2.5 text-right font-mono font-bold text-[#466652]">${e.potentialGrowth}%</td>
            <td class="p-2.5 text-[#5C554E] max-w-md">${impact}</td>
          </tr>
        `;
      }).join('');
    }

    // ==================== TAB 8 FUNCTIONS ====================
    function renderHistoricalEvents() {
      const box = document.getElementById('historicalEventsTimeline');
      box.innerHTML = HISTORICAL_EVENTS.map(ev => `
        <div class="p-4 rounded-xl bg-[#F6F3EC] border border-[#E3DDD1] flex flex-col justify-between">
          <div>
            <span class="px-2 py-0.5 rounded bg-[#2C2825] text-white text-[11px] font-bold">${ev.period}</span>
            <h3 class="text-sm font-bold text-[#2C2825] mt-2">${ev.title}</h3>
            <p class="text-xs text-[#5C554E] mt-1.5 leading-relaxed">${ev.impact}</p>
          </div>
        </div>
      `).join('');
    }

    function initCaseStudies() {
      const sel = document.getElementById('caseStudySelect');
      sel.innerHTML = CASE_STUDIES.map((cs, idx) => `<option value="${idx}">${cs.name}</option>`).join('');
      renderCaseStudyDetail();
    }

    function renderCaseStudyDetail() {
      const idx = +document.getElementById('caseStudySelect').value || 0;
      const cs = CASE_STUDIES[idx];
      const box = document.getElementById('caseStudyContent');

      const relatedCards = cs.economies.map(id => {
        const e = ECON_MAP[id];
        if (!e) return '';
        return `
          <div class="p-3 rounded-lg bg-white border border-[#E3DDD1] flex items-center justify-between">
            <div>
              <div class="font-bold text-[#2C2825] text-xs">${e.name} (${e.id})</div>
              <div class="text-[11px] text-[#857D74]">2026名义: $${e.gdpNom2026}B | 人均PPP: $${e.pcPpp2026.toLocaleString()} | 40年实际增长: ${e.realMult40y}x</div>
            </div>
            <button onclick="selectPrimaryFromTable('${e.id}')" class="text-xs px-2.5 py-1 rounded bg-[#F5E6E1] text-[#9E4B32] font-semibold hover:bg-[#F5E6E1]">
              设为顶部主对象
            </button>
          </div>
        `;
      }).join('');

      box.innerHTML = `
        <div class="bg-[#F6F3EC] p-4 rounded-xl border border-[#E3DDD1] space-y-3">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E3DDD1] pb-2.5">
            <h3 class="text-base font-bold text-[#2C2825]">${cs.name}</h3>
            <span class="px-2.5 py-1 rounded badge-terracotta text-xs font-bold">${cs.periodSummary}</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${cs.stages.map(st => `
              <div class="p-3 bg-white rounded-lg border border-[#E3DDD1] text-xs text-[#5C554E] leading-relaxed">
                • ${st}
              </div>
            `).join('')}
          </div>
          <div class="p-3 bg-[#F7EFE0] border border-[#E6D0AE] rounded-lg text-xs text-[#2C2825]">
            <strong>历史经验与核心启示：</strong>${cs.coreLesson}
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
            ${relatedCards}
          </div>
        </div>
      `;
    }

    function initWeightSliders() {
      const container = document.getElementById('weightSlidersContainer');
      container.innerHTML = DIM_13_NAMES.map((name, i) => `
        <div class="flex items-center justify-between gap-2 text-xs">
          <span class="text-[#5C554E] font-medium w-44 truncate" title="${name}">${name}</span>
          <input type="range" min="0" max="15" step="1" value="${state.weights13[i]}" oninput="updateWeight(${i}, this.value)" class="flex-1" id="wSlider-${i}" />
          <span class="font-mono font-bold text-[#2C2825] w-8 text-right" id="wVal-${i}">${state.weights13[i]}</span>
        </div>
      `).join('');
      updateTotalWeightReadout();
    }

    function updateWeight(idx, val) {
      state.weights13[idx] = +val;
      document.getElementById(`wVal-${idx}`).textContent = val;
      updateTotalWeightReadout();
      renderScorecardTable();
    }

    function updateTotalWeightReadout() {
      const sum = state.weights13.reduce((a, b) => a + b, 0);
      document.getElementById('totalWeightReadout').textContent = `权重点数总和: ${sum} (自动归一化计算)`;
    }

    function applyWeightPreset(mode) {
      if (mode === 'BALANCED') {
        state.weights13 = [8, 8, 9, 9, 9, 9, 8, 7, 7, 7, 6, 7, 6];
      } else if (mode === 'QUALITY_WELFARE') {
        state.weights13 = [3, 10, 7, 14, 12, 8, 6, 12, 12, 6, 4, 3, 3];
      } else if (mode === 'TECH_UPGRADING') {
        state.weights13 = [7, 8, 10, 6, 12, 15, 15, 6, 4, 4, 3, 12, 5];
      } else if (mode === 'MACRO_SAFETY') {
        state.weights13 = [6, 7, 6, 6, 7, 6, 5, 6, 6, 15, 15, 8, 10];
      }
      initWeightSliders();
      renderScorecardTable();
    }

    function renderRadar13Chart() {
      const p = ECON_MAP[state.primaryId];
      const c = ECON_MAP[state.compareId];
      const ctx = document.getElementById('chartRadar13').getContext('2d');
      if (charts.radar13) charts.radar13.destroy();

      charts.radar13 = new Chart(ctx, {
        type: 'radar',
        data: {
          labels: DIM_13_NAMES,
          datasets: [
            {
              label: `${p.name} (综合得分: ${computeWeightedScore(p)})`,
              data: p.scores13,
              borderColor: '#C86D51',
              backgroundColor: 'rgba(200, 109, 81, 0.22)',
              borderWidth: 2.5,
              pointRadius: 3
            },
            {
              label: `${c.name} (综合得分: ${computeWeightedScore(c)})`,
              data: c.scores13,
              borderColor: '#D49A45',
              backgroundColor: 'rgba(212, 154, 69, 0.22)',
              borderWidth: 2.5,
              pointRadius: 3
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: { min: 0, max: 100, ticks: { stepSize: 20, font: { size: 9 } }, pointLabels: { font: { size: 10.5, weight: 'bold' } } }
          }
        }
      });
    }

    function renderScorecardTable() {
      const q = (document.getElementById('scoreSearchInput')?.value || '').trim();
      let list = dataManager.filterEconomies(state.regionFilter, q).map(e => ({
        ...e,
        weightedScore: computeWeightedScore(e)
      }));
      list.sort((a, b) => b.weightedScore - a.weightedScore);

      const tbody = document.getElementById('scorecardTableBody');
      tbody.innerHTML = list.map((e, idx) => {
        let grade = 'C';
        let gradeCls = 'bg-[#EFECE4] text-[#5C554E]';
        if (e.weightedScore >= 82) { grade = 'S (顶尖)'; gradeCls = 'badge-sage'; }
        else if (e.weightedScore >= 72) { grade = 'A (优秀)'; gradeCls = 'badge-terracotta'; }
        else if (e.weightedScore >= 60) { grade = 'B (良好)'; gradeCls = 'badge-ochre'; }
        else if (e.weightedScore < 48) { grade = 'D (脆弱)'; gradeCls = 'badge-terracotta'; }

        return `
          <tr class="hover:bg-[#FAF7F0] cursor-pointer" onclick="selectPrimaryFromTable('${e.id}')">
            <td class="p-2 font-bold text-[#2C2825]">#${idx + 1}</td>
            <td class="p-2 font-bold text-[#2C2825]">${e.name} <span class="text-[#857D74] font-normal">(${e.id})</span></td>
            <td class="p-2 text-[#857D74]">${e.region} · ${e.group === '发达经济体' ? '发达' : '新兴'}</td>
            <td class="p-2 text-right font-mono font-extrabold text-[#9E4B32] bg-[#F5E6E1]/40">${e.weightedScore.toFixed(1)}</td>
            <td class="p-2 text-center"><span class="badge-pill ${gradeCls}">${grade}</span></td>
            ${e.scores13.map(s => `<td class="p-2 text-right font-mono ${s >= 85 ? 'text-[#466652] font-bold' : (s < 40 ? 'text-[#9E4B32]' : 'text-[#5C554E]')}">${s}</td>`).join('')}
          </tr>
        `;
      }).join('');
    }

    function exportFullDatasetCSV() {
      const headers = [
        "ID", "名称", "英文名", "大洲", "分组", "1985名义GDP($B)", "2026名义GDP($B)", "2026_PPP_GDP($B)",
        "40年实际GDP增长倍数", "40年实际CAGR(%)", "1985人均名义GDP($)", "2026人均名义GDP($)", "2026人均PPP($)",
        "40年实际人均增长倍数", "2026制造业占GDP(%)", "2026服务业占GDP(%)", "人均可支配收入($)", "平均工资($)", "中位数工资($)",
        "基尼系数", "每小时劳动生产率($PPP)", "失业率(%)", "政府债务占GDP(%)", "居民债务占GDP(%)", "企业债务占GDP(%)",
        "2026生育率TFR", "65岁以上老龄化率(%)", "长期潜在增速(%)", "13维综合得分"
      ];
      const rows = ECONOMIES.map(e => [
        e.id, `"${e.name}"`, `"${e.en}"`, e.region, e.group,
        e.gdpNom1985 !== null ? e.gdpNom1985 : "缺失", e.gdpNom2026, e.gdpPpp2026,
        e.realMult40y, e.realCagr40y, e.pcNom1985, e.pcNom2026, e.pcPpp2026,
        e.realPcMult40y, e.mfgShare2026, e.sec2026[2], e.dispIncomePc2026, e.meanWage2026, e.medianWage2026,
        e.gini, e.prodPerHour, e.unempRate, e.govDebt, e.hhDebt, e.corpDebt,
        e.tfr2026, e.aging2026, e.potentialGrowth, computeWeightedScore(e)
      ]);
      const csvContent = "\\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "global_55_economies_40y_analysis_1985_2026.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("已成功导出 55 个代表性经济体 40 年核心指标 CSV 数据表！");
    }

export function initEconomyModule() {
  window.handleGlobalControlChange = handleGlobalControlChange;
  window.swapPrimaryAndCompare = swapPrimaryAndCompare;
  window.exportFullDatasetCSV = exportFullDatasetCSV;
  window.expandAllQuestions = expandAllQuestions;
  window.renderOverviewMultChart = renderOverviewMultChart;
  window.renderTimeSeriesCharts = renderTimeSeriesCharts;
  window.applyTsPreset = applyTsPreset;
  window.toggleTsEconomy = toggleTsEconomy;
  window.renderRankTable = renderRankTable;
  window.selectPrimaryFromTable = selectPrimaryFromTable;
  window.renderMfgComparisonChart = renderMfgComparisonChart;
  window.renderIncomeCharts = renderIncomeCharts;
  window.renderLaborCharts = renderLaborCharts;
  window.renderMacroCharts = renderMacroCharts;
  window.renderDemoCharts = renderDemoCharts;
  window.renderCaseStudyDetail = renderCaseStudyDetail;
  window.applyWeightPreset = applyWeightPreset;
  window.updateWeight = updateWeight;
  window.renderScorecardTable = renderScorecardTable;
  window.switchTab = econScrollToTab;

  initSelectors();
  renderTopComparisonBar();
  renderTenQuestions();
  renderOverviewCharts();
  initTsCheckboxes();
  renderTimeSeriesCharts();
  renderPopVsPcScatter();
  renderRankTable();
  renderSectorCharts();
  renderMfgComparisonChart();
  renderIndustrialTable();
  renderIncomeCharts();
  renderIncomeTable();
  renderLaborCharts();
  renderLaborTable();
  renderMacroCharts();
  renderMacroTable();
  renderDemoCharts();
  renderDemoTable();
  renderHistoricalEvents();
  initCaseStudies();
  initWeightSliders();
  renderRadar13Chart();
  renderScorecardTable();
}
