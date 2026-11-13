/**
 * language-manager.js — 统一界面语言状态与多语言显示名称管理器
 * --------------------------------------------------------------------------
 * 核心职责：
 * 1. 维护当前界面语言状态 ('zh-CN' | 'zh-TW' | 'en')，与 i18n.js 双向同步
 * 2. 提供语言变更事件订阅接口，确保切换界面语言后，当前已激活的搜索结果与表格自动按新语言重绘
 * 3. 根据当前界面语言解析实体的标准显示名称、副标题及分类标签（实现“搜索匹配语言与界面显示语言相互独立”）
 */

const VALID_LANGS = ['zh-CN', 'zh-TW', 'en'];

const TYPE_LABELS = {
  country: {
    'zh-CN': '国家/地区',
    'zh-TW': '國家/地區',
    'en': 'Country / Region'
  },
  region: {
    'zh-CN': '核心城市/都会区',
    'zh-TW': '核心城市/都會區',
    'en': 'City / Metro'
  },
  'indicator-re': {
    'zh-CN': '房地产板块指标',
    'zh-TW': '房地產板塊指標',
    'en': 'Real Estate Indicator'
  },
  'indicator-tax': {
    'zh-CN': '综合税制板块指标',
    'zh-TW': '綜合稅制板塊指標',
    'en': 'Taxation Indicator'
  },
  'indicator-econ': {
    'zh-CN': '经济轨迹板块指标',
    'zh-TW': '經濟軌跡板塊指標',
    'en': 'Macroeconomic Indicator'
  }
};

const UI_TEXTS = {
  noResults: {
    'zh-CN': '未找到匹配的国家/地区或研究指标',
    'zh-TW': '未找到匹配的國家/地區或研究指標',
    'en': 'No matching countries, regions, or indicators found'
  },
  entityGroupTitle: {
    'zh-CN': '匹配国家与地区实体',
    'zh-TW': '匹配國家與地區實體',
    'en': 'Matched Countries & Regions'
  },
  indicatorGroupTitle: {
    'zh-CN': '匹配研究板块与核心指标',
    'zh-TW': '匹配研究板塊與核心指標',
    'en': 'Matched Research Modules & Indicators'
  },
  jumpHint: {
    'zh-CN': '点击定位',
    'zh-TW': '點擊定位',
    'en': 'Jump to view'
  },
  clearSearch: {
    'zh-CN': '清空检索',
    'zh-TW': '清空檢索',
    'en': 'Clear'
  }
};

class LanguageManager {
  constructor() {
    this._currentLang = 'zh-CN';
    /** @type {Set<Function>} */
    this._listeners = new Set();
  }

  /**
   * 获取当前界面语言
   * @returns {'zh-CN' | 'zh-TW' | 'en'}
   */
  getLanguage() {
    if (typeof document !== 'undefined') {
      const htmlLang = document.documentElement.getAttribute('lang');
      if (VALID_LANGS.includes(htmlLang)) {
        this._currentLang = htmlLang;
      }
    }
    return this._currentLang;
  }

  /**
   * 设置当前界面语言并通知所有监听器（包括搜索结果下拉框与表格过滤视图）
   * @param {'zh-CN' | 'zh-TW' | 'en'} lang
   */
  setLanguage(lang) {
    if (!VALID_LANGS.includes(lang)) return;
    const prev = this._currentLang;
    this._currentLang = lang;
    if (prev !== lang) {
      for (const listener of this._listeners) {
        try {
          listener(lang, prev);
        } catch (err) {
          console.error('[LanguageManager] 语言切换回调异常:', err);
        }
      }
    }
  }

  /**
   * 订阅界面语言变更事件
   * @param {Function} callback - (newLang, oldLang) => void
   * @returns {Function} 取消订阅函数
   */
  onLanguageChange(callback) {
    if (typeof callback === 'function') {
      this._listeners.add(callback);
    }
    return () => this._listeners.delete(callback);
  }

  /**
   * 根据当前界面语言获取实体的标准显示名称
   * @param {Object} entity - 搜索索引实体对象
   * @param {'zh-CN' | 'zh-TW' | 'en'} [lang]
   * @returns {string}
   */
  getDisplayName(entity, lang = this.getLanguage()) {
    if (!entity || !entity.names) return '';
    return entity.names[lang] || entity.names['zh-CN'] || entity.names.en || '';
  }

  /**
   * 根据当前界面语言获取实体的次级说明文本（例如所属国家或模块说明）
   * @param {Object} entity
   * @param {'zh-CN' | 'zh-TW' | 'en'} [lang]
   * @returns {string}
   */
  getDisplaySubtitle(entity, lang = this.getLanguage()) {
    if (!entity) return '';
    if (entity.subtitles && entity.subtitles[lang]) {
      return entity.subtitles[lang];
    }
    // 对国家/城市实体，附带另外两种语言的对照名以便直观核验
    if (entity.type === 'country' || entity.type === 'region') {
      const primary = this.getDisplayName(entity, lang);
      const altList = [];
      if (lang !== 'en' && entity.names?.en && entity.names.en !== primary) {
        altList.push(entity.names.en);
      }
      if (lang === 'en' && entity.names?.['zh-CN'] && entity.names['zh-CN'] !== primary) {
        altList.push(entity.names['zh-CN']);
      }
      if (entity.isoCode && !altList.includes(entity.isoCode)) {
        altList.push(entity.isoCode);
      }
      return altList.join(' · ');
    }
    return '';
  }

  /**
   * 获取实体分类徽章文案
   * @param {string} typeKey
   * @param {'zh-CN' | 'zh-TW' | 'en'} [lang]
   */
  getTypeBadgeLabel(typeKey, lang = this.getLanguage()) {
    const group = TYPE_LABELS[typeKey] || TYPE_LABELS.country;
    return group[lang] || group['zh-CN'];
  }

  /**
   * 获取搜索组件 UI 文案
   * @param {string} key
   * @param {'zh-CN' | 'zh-TW' | 'en'} [lang]
   */
  getUIText(key, lang = this.getLanguage()) {
    const item = UI_TEXTS[key];
    if (!item) return key;
    return item[lang] || item['zh-CN'];
  }
}

export const languageManager = new LanguageManager();
export default languageManager;
