/**
 * data-manager.js — 统一数据访问、格式转换与动态扩展接口层
 * --------------------------------------------------------------------------
 * 核心职责：
 * 1. 统一加载并管理三大板块独立 JSON 数据文件（real-estate.json, taxation.json, economy.json）
 * 2. 提供同步/异步读取接口、按地区/关键词过滤查询与实体映射缓存
 * 3. 调用 data-validator 执行启动期数据完整性核验
 * 4. 为后续阶段接入动态数据获取系统、版本对比和缓存管理预留标准化接口（registerDataSourceAdapter / fetchDynamicSnapshot）
 */

import realEstateRaw from '../../data/real-estate.json';
import taxationRaw from '../../data/taxation.json';
import economyRaw from '../../data/economy.json';
import { validateAllDatasets } from './data-validator.js';

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

  /**
   * 建立经济体 ID 快速索引映射表
   */
  _indexEconomyMap() {
    this._economyMap.clear();
    if (this._store.economy && Array.isArray(this._store.economy.economies)) {
      this._store.economy.economies.forEach(econ => {
        this._economyMap.set(econ.id, econ);
      });
    }
  }

  /**
   * 初始化并校验全部静态 JSON 数据集
   * @returns {Object} 校验报告
   */
  init() {
    this._validationReport = validateAllDatasets(this._store);
    if (!this._validationReport.valid) {
      console.warn('[DataManager] 数据校验发现警告:', this._validationReport);
    }
    return this._validationReport;
  }

  /**
   * 获取最近一次数据完整性校验报告
   */
  getValidationReport() {
    if (!this._validationReport) {
      this._validationReport = validateAllDatasets(this._store);
    }
    return this._validationReport;
  }

  /**
   * 获取房地产板块完整数据
   */
  getRealEstateData() {
    return this._store.realEstate;
  }

  /**
   * 按区域与关键词筛选房地产国家/地区列表
   * @param {string} regionFilter - 'ALL' | 'Asia' | 'Europe' | 'Americas' | 'Africa' | 'Oceania'
   * @param {string} searchQuery - 搜索关键词
   */
  filterRealEstateCountries(regionFilter = 'ALL', searchQuery = '') {
    const countries = this._store.realEstate.countries || [];
    const q = (searchQuery || '').trim().toLowerCase();
    return countries.filter(c => {
      const matchRegion = regionFilter === 'ALL' || c.region === regionFilter;
      const matchSearch = !q ||
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.capital.toLowerCase().includes(q) ||
        c.majorCity.toLowerCase().includes(q) ||
        c.regionCn.toLowerCase().includes(q);
      return matchRegion && matchSearch;
    });
  }

  /**
   * 获取综合税制板块完整数据
   */
  getTaxationData() {
    return this._store.taxation;
  }

  /**
   * 按大洲与关键词筛选税收管辖区列表
   * @param {string} continent - 'ALL' | '亚洲' | '欧洲' | '美洲' | '非洲'
   * @param {string} searchQuery - 搜索关键词
   */
  filterTaxJurisdictions(continent = 'ALL', searchQuery = '') {
    const jurisdictions = this._store.taxation.jurisdictions || [];
    const q = (searchQuery || '').trim().toLowerCase();
    return jurisdictions.filter(d => {
      if (continent !== 'ALL' && d.continent !== continent) return false;
      if (q) {
        const match = d.name.toLowerCase().includes(q) ||
                      d.enName.toLowerCase().includes(q) ||
                      d.subregion.toLowerCase().includes(q) ||
                      d.id.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }

  /**
   * 获取经济发展轨迹板块完整数据
   */
  getEconomyData() {
    return this._store.economy;
  }

  /**
   * 获取经济体 ID 字典映射对象（兼容原 ECON_MAP 访问方式）
   */
  getEconomyMapObject() {
    const mapObj = {};
    for (const [id, econ] of this._economyMap.entries()) {
      mapObj[id] = econ;
    }
    return mapObj;
  }

  /**
   * 按区域过滤经济体列表
   * @param {string} regionFilter - 'ALL' | '亚洲' | '欧洲' | '美洲' | '非洲'
   */
  filterEconomiesByRegion(regionFilter = 'ALL') {
    const economies = this._store.economy.economies || [];
    if (regionFilter === 'ALL') return economies;
    return economies.filter(e => e.region === regionFilter);
  }

  /**
   * 【预留扩展接口】注册外部动态数据源适配器（供后续阶段接入远程 API、缓存或历史版本库使用）
   * @param {string} moduleKey - 'realEstate' | 'taxation' | 'economy'
   * @param {Function} adapterFn - async (params) => dataset
   */
  registerDataSourceAdapter(moduleKey, adapterFn) {
    if (typeof adapterFn === 'function') {
      this._adapters.set(moduleKey, adapterFn);
    }
  }

  /**
   * 【预留扩展接口】异步获取指定模块的数据快照（当前阶段默认返回静态 JSON，后续可无缝切换至适配器）
   * @param {string} moduleKey - 'realEstate' | 'taxation' | 'economy'
   * @param {Object} [params] - 版本或过滤参数
   */
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
