/**
 * data-manager.js — 统一数据访问、三语检索过滤与动态扩展接口层
 * --------------------------------------------------------------------------
 * 核心职责：
 * 1. 统一加载并管理三大板块独立 JSON 数据文件（real-estate.json, taxation.json, economy.json）
 * 2. 联动 search-engine 实现跨语言（简/繁/英/别名/城市/指标）的数据过滤，彻底解耦搜索输入语言与界面展示语言
 * 3. 调用 data-validator 执行启动期数据完整性核验
 * 4. 为后续阶段接入动态数据获取系统、版本对比和缓存管理预留标准化接口
 */

import realEstateRaw from '../../data/real-estate.json';
import taxationRaw from '../../data/taxation.json';
import economyRaw from '../../data/economy.json';
import { validateAllDatasets } from './data-validator.js';
import { searchEngine } from '../search/search-engine.js';

class DataManager {
  constructor() {
    this._store = {
      realEstate: realEstateRaw,
      taxation: taxationRaw,
      economy: economyRaw
    };
    this._economyMap = new Map();
    this._adapters = new Map();
    this._validationReport = null;
    this._indexEconomyMap();
  }

  _indexEconomyMap() {
    this._economyMap.clear();
    if (this._store.economy && Array.isArray(this._store.economy.economies)) {
      this._store.economy.economies.forEach(econ => {
        this._economyMap.set(econ.id, econ);
      });
    }
  }

  /**
   * 初始化并校验全部静态 JSON 数据集，同时构建一次三语统一搜索索引
   * @returns {Object} 校验报告
   */
  init() {
    this._validationReport = validateAllDatasets(this._store);
    if (!this._validationReport.valid) {
      console.warn('[DataManager] 数据校验发现警告:', this._validationReport);
    }
    searchEngine.init(this._store);
    return this._validationReport;
  }

  getValidationReport() {
    if (!this._validationReport) {
      this._validationReport = validateAllDatasets(this._store);
    }
    return this._validationReport;
  }

  getRealEstateData() {
    return this._store.realEstate;
  }

  /**
   * 按区域与三语关键词（简/繁/英/缩写/首都城市/指标）筛选房地产国家/地区列表
   * @param {string} regionFilter - 'ALL' | 'Asia' | 'Europe' | 'Americas' | 'Africa' | 'Oceania'
   * @param {string} searchQuery - 搜索关键词
   */
  filterRealEstateCountries(regionFilter = 'ALL', searchQuery = '') {
    const countries = this._store.realEstate.countries || [];
    const regionMatched = countries.filter(c => regionFilter === 'ALL' || c.region === regionFilter);

    const filterSets = searchEngine.getDatasetFilterSets(searchQuery);
    if (filterSets.isEmpty) {
      return regionMatched;
    }

    // 1. 若匹配到了国家或城市实体（例如 台北/臺北/Taipei -> TW, 英国/英國/UK -> GB, 德国/德國/Germany -> DE）
    if (filterSets.hasGeoMatch) {
      return regionMatched.filter(c => filterSets.reCodes.has(c.code));
    }

    // 2. 若匹配的是研究板块指标（例如 Housing Price / 房价 / PIR / 房贷利率），保留当前区域数据供图表和表格展示
    if (filterSets.hasIndicatorMatch) {
      return regionMatched;
    }

    // 3. 兜底匹配记录内的原始字段文本（支持简繁归一）
    return regionMatched.filter(c => searchEngine.matchesRecordText(c, searchQuery));
  }

  getTaxationData() {
    return this._store.taxation;
  }

  /**
   * 按大洲与三语关键词（简/繁/英/缩写/首都城市/税种指标）筛选税收管辖区列表
   * @param {string} continent - 'ALL' | '亚洲' | '欧洲' | '美洲' | '非洲'
   * @param {string} searchQuery - 搜索关键词
   */
  filterTaxJurisdictions(continent = 'ALL', searchQuery = '') {
    const jurisdictions = this._store.taxation.jurisdictions || [];
    const contMatched = jurisdictions.filter(d => continent === 'ALL' || d.continent === continent);

    const filterSets = searchEngine.getDatasetFilterSets(searchQuery);
    if (filterSets.isEmpty) {
      return contMatched;
    }

    // 1. 若匹配到了国家或城市实体（如 台北/臺北/Taipei -> TW, 英国/英國/UK -> GB, 美国/美國/USA -> US）
    if (filterSets.hasGeoMatch) {
      return contMatched.filter(d => filterSets.taxIds.has(d.id));
    }

    // 2. 若匹配的是原始税制规则文本（如 联邦/Federal/免税）
    const textMatched = contMatched.filter(d => searchEngine.matchesRecordText(d, searchQuery));
    if (textMatched.length > 0) {
      return textMatched;
    }

    // 3. 若用户输入的是宏观税制指标名（如 Income Tax / Corporate Tax / 增值税），保留列表展示
    if (filterSets.hasIndicatorMatch) {
      return contMatched;
    }

    return [];
  }

  getEconomyData() {
    return this._store.economy;
  }

  getEconomyMapObject() {
    const mapObj = {};
    for (const [id, econ] of this._economyMap.entries()) {
      mapObj[id] = econ;
    }
    return mapObj;
  }

  /**
   * 按区域与三语关键词（简/繁/英/缩写/首都城市/宏观指标）筛选经济体列表
   * @param {string} regionFilter - 'ALL' | '亚洲' | '欧洲' | '美洲' | '非洲' | '发达经济体' | '新兴与发展中经济体'
   * @param {string} [searchQuery=''] - 搜索关键词
   */
  filterEconomies(regionFilter = 'ALL', searchQuery = '') {
    const economies = this._store.economy.economies || [];
    let regMatched = economies;
    if (regionFilter !== 'ALL') {
      if (regionFilter === '发达经济体' || regionFilter === '新兴与发展中经济体') {
        regMatched = economies.filter(e => e.group === regionFilter);
      } else {
        regMatched = economies.filter(e => e.region === regionFilter);
      }
    }

    const filterSets = searchEngine.getDatasetFilterSets(searchQuery);
    if (filterSets.isEmpty) {
      return regMatched;
    }

    if (filterSets.hasGeoMatch) {
      return regMatched.filter(e => filterSets.econIds.has(e.id));
    }

    const textMatched = regMatched.filter(e => searchEngine.matchesRecordText(e, searchQuery));
    if (textMatched.length > 0) {
      return textMatched;
    }

    if (filterSets.hasIndicatorMatch) {
      return regMatched;
    }

    return [];
  }

  filterEconomiesByRegion(regionFilter = 'ALL') {
    return this.filterEconomies(regionFilter, '');
  }

  registerDataSourceAdapter(moduleKey, adapterFn) {
    if (typeof adapterFn === 'function') {
      this._adapters.set(moduleKey, adapterFn);
    }
  }

  async fetchModuleSnapshot(moduleKey, params = {}) {
    if (this._adapters.has(moduleKey)) {
      const adapter = this._adapters.get(moduleKey);
      return await adapter(params);
    }
    return Promise.resolve(this._store[moduleKey] || null);
  }
}

export const dataManager = new DataManager();
export default dataManager;
