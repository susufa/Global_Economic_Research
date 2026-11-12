/**
 * app.js — 全球宏观经济研究平台核心应用控制器
 * --------------------------------------------------------------------------
 * 核心职责：
 * 1. 统筹初始化数据层 (dataManager)、图表全局配置 (applyChartGlobalDefaults)、导航层 (initNavigation)
 * 2. 依次启动三大研究板块业务模块：
 *    - 板块一：全球房地产市场研究 (initRealEstateModule)
 *    - 板块二：全球综合税制比较研究 (initTaxationModule)
 *    - 板块三：全球经济发展轨迹研究 (initEconomyModule)
 * 3. 管理跨板块全局联动检索 (handleMasterPlatformSearch)
 */

import { dataManager } from '../data/data-manager.js';
import { applyChartGlobalDefaults } from '../charts/chart-utils.js';
import { chartManager } from '../charts/chart-manager.js';
import { eventManager } from './event-manager.js';
import { initNavigation } from './navigation.js';
import { initRealEstateModule } from '../modules/real-estate.js';
import { initTaxationModule } from '../modules/taxation.js';
import { initEconomyModule } from '../modules/economy.js';

/**
 * 跨板块全局联动检索处理器
 * 同步检索：1. 房地产板块 2. 综合税制全景与数据库 3. 经济发展轨迹13维评分榜
 * @param {string} val - 搜索关键词
 */
export function handleMasterPlatformSearch(val) {
  const q = (val || '').trim();

  // 触发事件总线通知
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
}

/**
 * 启动并初始化全平台应用
 */
export function initApp() {
  // 1. 校验并初始化静态 JSON 数据仓库
  const validationReport = dataManager.init();

  // 2. 应用 Chart.js 全局默认样式
  applyChartGlobalDefaults();

  // 3. 初始化全局导航与弹窗交互
  initNavigation();

  // 4. 挂载跨板块全局检索入口（兼容顶部搜索框 oninput="handleMasterPlatformSearch(this.value)"）
  window.handleMasterPlatformSearch = handleMasterPlatformSearch;
  const masterInput = document.getElementById('masterGlobalSearchInput');
  if (masterInput) {
    eventManager.bind(masterInput, 'input', (e) => handleMasterPlatformSearch(e.target.value));
  }

  // 5. 初始化三大核心研究业务模块
  initRealEstateModule();
  initTaxationModule();
  initEconomyModule();

  // 6. 暴露平台运行时诊断接口（便于测试核验与后续动态扩展调试）
  window.__GLOBAL_MACRO_PLATFORM__ = {
    version: '1.0.0',
    dataManager,
    chartManager,
    eventManager,
    validationReport
  };
}

export default {
  initApp,
  handleMasterPlatformSearch
};
