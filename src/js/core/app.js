/**
 * app.js — 全球宏观经济研究平台核心应用控制器
 * --------------------------------------------------------------------------
 * 核心职责：
 * 1. 统筹初始化数据层 (dataManager)、图表全局配置 (applyChartGlobalDefaults)、导航层 (initNavigation)、多语言引擎 (initI18n) 与三语搜索引擎 (searchEngine / searchResults)
 * 2. 依次启动三大研究板块业务模块：
 *    - 板块一：全球房地产市场研究 (initRealEstateModule)
 *    - 板块二：全球综合税制比较研究 (initTaxationModule)
 *    - 板块三：全球经济发展轨迹研究 (initEconomyModule)
 * 3. 管理跨板块全局联动检索 (handleMasterPlatformSearch)，确保任何界面语言下均可使用简/繁/英检索同一实体并按当前界面语言展示
 */

import { dataManager } from '../data/data-manager.js';
import { applyChartGlobalDefaults } from '../charts/chart-utils.js';
import { chartManager } from '../charts/chart-manager.js';
import { eventManager } from './event-manager.js';
import { initNavigation } from './navigation.js';
import { initI18n, switchPlatformLanguage, getCurrentLanguage, translateDOMTree } from './i18n.js';
import { languageManager } from '../search/language-manager.js';
import { searchIndex } from '../search/search-index.js';
import { searchEngine } from '../search/search-engine.js';
import { searchResults } from '../search/search-results.js';
import { initRealEstateModule } from '../modules/real-estate.js';
import { initTaxationModule } from '../modules/taxation.js';
import { initEconomyModule } from '../modules/economy.js';

/**
 * 若当前界面处于繁体中文或英文模式，同步转换新重绘的表格与卡片 DOM 节点
 */
let isBatchSearching = false;
const DYNAMIC_SEARCH_CONTAINERS = [
  'countrySelectorChips',
  'absPriceTableBody',
  'masterDatabaseBody',
  'overviewKpiGrid',
  'overviewSummaryTbody',
  'simFullTbody',
  'sscDetailTbody',
  'evalScoreTbody',
  'fullDbTbody',
  'scorecardTableBody'
];

function syncActiveLanguageDOM(forceNow = false) {
  if (isBatchSearching && !forceNow) return;
  const lang = getCurrentLanguage();
  if (lang !== 'zh-CN' && typeof document !== 'undefined') {
    for (const id of DYNAMIC_SEARCH_CONTAINERS) {
      const el = document.getElementById(id);
      if (el) translateDOMTree(el, lang);
    }
  }
}

/**
 * 跨板块全局联动检索处理器
 * 同步检索：1. 房地产板块 2. 综合税制全景与数据库 3. 经济发展轨迹13维评分榜
 * @param {string} val - 搜索关键词（支持简体中文、繁体中文、英文全称/简称/别名及指标名）
 */
export function handleMasterPlatformSearch(val) {
  const q = (val || '').trim();
  isBatchSearching = true;
  try {

  eventManager.emit('master:search', q);

  // 1. 同步房地产板块检索
  if (typeof window.reFilterSearch === 'function') {
    window.reFilterSearch(q);
  }

  // 2. 同步综合税制全局搜索与全量数据库搜索
  const taxSearch = document.getElementById('taxGlobalSearchInput');
  if (taxSearch) {
    taxSearch.value = q;
    if (typeof window.handleGlobalSearch === 'function') {
      window.handleGlobalSearch(q);
    }
  }
  const taxDbSearch = document.getElementById('dbSearchInput');
  if (taxDbSearch) {
    taxDbSearch.value = q;
    if (typeof window.renderFullDatabaseTable === 'function') {
      window.renderFullDatabaseTable();
    }
  }

  // 3. 同步经济发展轨迹评分榜搜索
  const econSearch = document.getElementById('scoreSearchInput');
  if (econSearch) {
    econSearch.value = q;
    if (typeof window.renderScorecardTable === 'function') {
      window.renderScorecardTable();
    }
  }

  } finally {
    isBatchSearching = false;
  }
  // 4. 同步将重绘后的表格行转换为当前激活的界面语言（简/繁/En）
  syncActiveLanguageDOM(true);
}

/**
 * 启动并初始化全平台应用
 */
export function initApp() {
  // 1. 校验并初始化静态 JSON 数据仓库与三语搜索索引
  const validationReport = dataManager.init();

  // 2. 应用 Chart.js 全局默认样式
  applyChartGlobalDefaults();

  // 3. 初始化全局导航与弹窗交互
  initNavigation();

  // 4. 初始化简/繁/En 多语言与字体切换引擎
  initI18n();

  // 5. 初始化三大核心研究业务模块
  initRealEstateModule();
  initTaxationModule();
  initEconomyModule();

  // 6. 包装各模块内部搜索函数，确保在繁/英界面下单独使用子板块搜索框时同样即时本地化重绘结果
  const wrapWithLangSync = (fnName) => {
    const origFn = window[fnName];
    if (typeof origFn === 'function') {
      window[fnName] = function (...args) {
        const res = origFn.apply(this, args);
        syncActiveLanguageDOM();
        return res;
      };
    }
  };
  wrapWithLangSync('reFilterSearch');
  wrapWithLangSync('handleGlobalSearch');
  wrapWithLangSync('renderFullDatabaseTable');
  wrapWithLangSync('renderScorecardTable');

  const reSearchEl = document.getElementById('globalSearchInput');
  if (reSearchEl) {
    reSearchEl.addEventListener('input', () => {
      syncActiveLanguageDOM();
    });
  }

  // 7. 挂载跨板块全局检索入口与三语可视化搜索下拉面板
  window.handleMasterPlatformSearch = handleMasterPlatformSearch;

  searchResults.init({
    onSelectEntity(item, localizedName, moduleScope) {
      if (item.type === 'country' || item.type === 'region') {
        if (moduleScope === 'ALL') {
          handleMasterPlatformSearch(localizedName);
        } else if (moduleScope === 'real-estate' && typeof window.reFilterSearch === 'function') {
          window.reFilterSearch(localizedName);
        } else if (moduleScope === 'taxation' && typeof window.handleGlobalSearch === 'function') {
          window.handleGlobalSearch(localizedName);
          if (typeof window.renderFullDatabaseTable === 'function') {
            window.renderFullDatabaseTable();
          }
        } else if (moduleScope === 'economy' && typeof window.renderScorecardTable === 'function') {
          window.renderScorecardTable();
        }
        syncActiveLanguageDOM();
      }
    }
  });

  // 8. 暴露平台运行时诊断与测试接口
  window.__GLOBAL_MACRO_PLATFORM__ = {
    version: '1.2.0',
    dataManager,
    chartManager,
    eventManager,
    validationReport,
    switchPlatformLanguage,
    getCurrentLanguage,
    languageManager,
    searchIndex,
    searchEngine,
    searchResults
  };
}

export default {
  initApp,
  handleMasterPlatformSearch
};
