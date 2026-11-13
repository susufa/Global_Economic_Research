/**
 * search-engine.js — 统一三语搜索引擎（多语言索引匹配、去重、五级优先级排序与数据集过滤）
 * --------------------------------------------------------------------------
 * 核心职责（第四阶段第二步至第五步）：
 * 1. 输入标准化：调用 search-normalizer 对用户输入执行去空格、大小写归一、标点清理与简繁同义归并
 * 2. 多语言索引匹配：同时比对实体的简体名称、繁体名称、英文全称、英文简称、ISO代码与常用别名
 * 3. 实体 ID 严格去重：使用唯一 entity.id 去重，确保同一国家/地区/指标绝不因匹配多个别名而重复出现
 * 4. 五级优先级排序：
 *    - P1 (1000分)：完整标准名称精确匹配（zh-CN / zh-TW / en）
 *    - P2 (920分) ：完整别名或缩写精确匹配（如 UK / U.K. / USA / Taipei / 臺北）
 *    - P3 (850分) ：简繁/标点标准化后的精确匹配
 *    - P4 (650分) ：名称或别名前缀匹配
 *    - P5 (450分) ：受控包含匹配（对 <=2 字符的短英文缩写禁用任意子串匹配，防止 "uk"/"us" 误匹配无关单词）
 * 5. 搜索结果语言解耦展示：匹配完成后，统一调用 languageManager 按当前界面语言生成显示名称
 */

import { normalizeSearchInput, cjkToSimplified } from './search-normalizer.js';
import { searchIndex } from './search-index.js';
import { languageManager } from './language-manager.js';

class SearchEngine {
  constructor() {
    this._initialized = false;
  }

  /**
   * 初始化搜索引擎并构建一次内存索引
   * @param {{ realEstate?: Object, taxation?: Object, economy?: Object }} [datasets]
   */
  init(datasets = {}) {
    searchIndex.build(datasets);
    this._initialized = true;
    return this;
  }

  /**
   * 确保索引已就绪
   */
  _ensureReady() {
    if (!this._initialized || searchIndex.entities.length === 0) {
      searchIndex.build();
      this._initialized = true;
    }
  }

  /**
   * 计算单个实体相对于标准化查询词的匹配得分（0 表示不匹配）
   * @param {Object} entity - 预处理后的索引实体
   * @param {Object} qNorm - normalizeSearchInput(query) 返回结果
   * @returns {number} 匹配得分 (0..1000)
   */
  _scoreEntity(entity, qNorm) {
    if (qNorm.isEmpty) return 0;

    let bestScore = 0;
    const isShortAscii = !qNorm.hasCjk && qNorm.compact.length <= 2;

    // 1. 检查主名称 (names['zh-CN'], names['zh-TW'], names.en, fullNames)
    for (const pNorm of entity._primaryNorms) {
      if (pNorm.isEmpty) continue;

      // P1: 原始小写或去标点完全精确匹配
      if (pNorm.lower === qNorm.lower || pNorm.cleanPunct === qNorm.cleanPunct) {
        return 1000;
      }
      // P3: 简繁归一化后完全精确匹配
      if (pNorm.simplified === qNorm.simplified || pNorm.simplifiedCompact === qNorm.simplifiedCompact) {
        bestScore = Math.max(bestScore, 960);
        continue;
      }
      // P4: 主名称前缀匹配
      if (!isShortAscii) {
        if (
          pNorm.cleanPunct.startsWith(qNorm.cleanPunct) ||
          pNorm.simplified.startsWith(qNorm.simplified) ||
          pNorm.simplifiedCompact.startsWith(qNorm.simplifiedCompact)
        ) {
          bestScore = Math.max(bestScore, 720);
          continue;
        }
      }
      // P5: 主名称包含匹配
      if (qNorm.hasCjk) {
        if (pNorm.simplifiedCompact.includes(qNorm.simplifiedCompact)) {
          bestScore = Math.max(bestScore, 560);
        }
      } else if (qNorm.cleanPunct.length >= 4) {
        if (pNorm.cleanPunct.includes(qNorm.cleanPunct)) {
          bestScore = Math.max(bestScore, 520);
        }
      }
    }

    // 2. 检查全部别名与简称 (aliases)
    for (const aNorm of entity._aliasNorms) {
      if (aNorm.isEmpty) continue;

      // P2: 别名/简称精确匹配（含去句点后的缩写如 U.K. -> uk, U.S.A. -> usa）
      if (
        aNorm.lower === qNorm.lower ||
        aNorm.cleanPunct === qNorm.cleanPunct ||
        aNorm.compact === qNorm.compact
      ) {
        bestScore = Math.max(bestScore, 920);
        continue;
      }

      // P3: 简繁归一化后别名精确匹配
      if (
        aNorm.simplified === qNorm.simplified ||
        aNorm.simplifiedCompact === qNorm.simplifiedCompact
      ) {
        bestScore = Math.max(bestScore, 860);
        continue;
      }

      // 对短英文查询（<=2字符，如 "uk", "us", "cn", "de"），仅允许精确匹配别名或词首独立单词匹配，禁止内部子串模糊匹配
      if (isShortAscii) {
        if (aNorm.tokens.includes(qNorm.compact)) {
          bestScore = Math.max(bestScore, 780);
        }
        continue;
      }

      // P4: 别名前缀匹配
      if (
        aNorm.cleanPunct.startsWith(qNorm.cleanPunct) ||
        aNorm.simplified.startsWith(qNorm.simplified) ||
        aNorm.simplifiedCompact.startsWith(qNorm.simplifiedCompact) ||
        aNorm.tokens.some(t => t.startsWith(qNorm.cleanPunct))
      ) {
        bestScore = Math.max(bestScore, 650);
        continue;
      }

      // P5: 别名受控包含匹配
      if (qNorm.hasCjk) {
        if (aNorm.simplifiedCompact.includes(qNorm.simplifiedCompact)) {
          bestScore = Math.max(bestScore, 480);
        }
      } else if (qNorm.cleanPunct.length >= 4) {
        if (aNorm.cleanPunct.includes(qNorm.cleanPunct)) {
          bestScore = Math.max(bestScore, 450);
        }
      }
    }

    return bestScore;
  }

  /**
   * 执行全平台多语言检索，返回去重、排序并按当前界面语言格式化的结果
   * @param {string} rawQuery - 用户输入的搜索词（任意语言：简/繁/英）
   * @param {{ lang?: 'zh-CN'|'zh-TW'|'en', moduleFilter?: 'ALL'|'real-estate'|'taxation'|'economy', limit?: number }} [options]
   */
  search(rawQuery, options = {}) {
    this._ensureReady();
    const lang = options.lang || languageManager.getLanguage();
    const moduleFilter = options.moduleFilter || 'ALL';
    const limit = options.limit || 20;
    const qNorm = normalizeSearchInput(rawQuery);

    if (qNorm.isEmpty) {
      return {
        query: '',
        normalized: qNorm,
        lang,
        entities: [],
        indicators: [],
        all: [],
        hasMatches: false
      };
    }

    /** @type {Map<string, Object>} 使用实体唯一 id 去重 */
    const dedupMap = new Map();

    for (const entity of searchIndex.entities) {
      // 如果指定了特定板块过滤，过滤掉其他板块的指标
      if (moduleFilter !== 'ALL' && entity.module && entity.module !== moduleFilter) {
        continue;
      }
      // 如果在税制或经济板块搜索，而该国家仅存在于房地产参照系（如 AU / NZ 在特定板块无记录），仍保留实体但在模块过滤时按 codes 判断
      const score = this._scoreEntity(entity, qNorm);
      if (score <= 0) continue;

      const existing = dedupMap.get(entity.id);
      if (!existing || score > existing.score) {
        dedupMap.set(entity.id, {
          id: entity.id,
          type: entity.type,
          module: entity.module || null,
          targetId: entity.targetId || null,
          chartId: entity.chartId || null,
          isoCode: entity.isoCode || null,
          parentCountryId: entity.parentCountryId || null,
          codes: entity.codes || null,
          names: entity.names,
          fullNames: entity.fullNames || null,
          displayName: languageManager.getDisplayName(entity, lang),
          displaySubtitle: languageManager.getDisplaySubtitle(entity, lang),
          typeBadge: languageManager.getTypeBadgeLabel(entity.type, lang),
          score,
          _rawEntity: entity
        });
      }
    }

    const allMatched = Array.from(dedupMap.values()).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // 同分时国家/城市优先于长名称指标
      const aIsGeo = a.type === 'country' || a.type === 'region' ? 1 : 0;
      const bIsGeo = b.type === 'country' || b.type === 'region' ? 1 : 0;
      if (bIsGeo !== aIsGeo) return bIsGeo - aIsGeo;
      return a.id.localeCompare(b.id);
    });

    const entities = allMatched.filter(item => item.type === 'country' || item.type === 'region').slice(0, limit);
    const indicators = allMatched.filter(item => item.type.startsWith('indicator')).slice(0, limit);

    return {
      query: qNorm.trimmed,
      normalized: qNorm,
      lang,
      entities,
      indicators,
      all: allMatched.slice(0, limit),
      hasMatches: allMatched.length > 0
    };
  }

  /**
   * 获取用于三大板块数据表与图表过滤的匹配代码集合
   * @param {string} rawQuery
   * @returns {{
   *   isEmpty: boolean,
   *   hasGeoMatch: boolean,
   *   hasIndicatorMatch: boolean,
   *   reCodes: Set<string>,
   *   taxIds: Set<string>,
   *   econIds: Set<string>,
   *   matchedEntities: Array<Object>,
   *   matchedIndicators: Array<Object>,
   *   qNorm: Object
   * }}
   */
  getDatasetFilterSets(rawQuery) {
    this._ensureReady();
    const qNorm = normalizeSearchInput(rawQuery);
    const reCodes = new Set();
    const taxIds = new Set();
    const econIds = new Set();

    if (qNorm.isEmpty) {
      return {
        isEmpty: true,
        hasGeoMatch: false,
        hasIndicatorMatch: false,
        reCodes,
        taxIds,
        econIds,
        matchedEntities: [],
        matchedIndicators: [],
        qNorm
      };
    }

    const res = this.search(rawQuery, { limit: 60 });
    const topGeoScore = res.entities[0]?.score || 0;
    const minCutoff = topGeoScore >= 850 ? 650 : 400;
    const filteredGeo = res.entities.filter(item => item.score >= minCutoff);
    for (const item of filteredGeo) {
      if (item.codes?.re) reCodes.add(item.codes.re);
      if (item.codes?.tax) taxIds.add(item.codes.tax);
      if (item.codes?.econ) econIds.add(item.codes.econ);
    }

    return {
      isEmpty: false,
      hasGeoMatch: res.entities.length > 0,
      hasIndicatorMatch: res.indicators.length > 0,
      reCodes,
      taxIds,
      econIds,
      matchedEntities: res.entities,
      matchedIndicators: res.indicators,
      qNorm
    };
  }

  /**
   * 辅助判断任意原始记录的文本字段是否匹配查询词（支持简繁归一与大小写忽略，用于全库规则关键词搜索）
   * @param {Object|string} recordOrText
   * @param {string} rawQuery
   */
  matchesRecordText(recordOrText, rawQuery) {
    const qNorm = normalizeSearchInput(rawQuery);
    if (qNorm.isEmpty) return true;
    const rawStr = typeof recordOrText === 'string' ? recordOrText : JSON.stringify(recordOrText);
    const lowerStr = rawStr.toLowerCase();
    if (lowerStr.includes(qNorm.lower) || lowerStr.includes(qNorm.cleanPunct)) {
      return true;
    }
    if (qNorm.hasCjk) {
      const simpStr = cjkToSimplified(lowerStr);
      if (simpStr.includes(qNorm.simplified) || simpStr.includes(qNorm.simplifiedCompact)) {
        return true;
      }
    }
    return false;
  }
}

export const searchEngine = new SearchEngine();
export default searchEngine;
