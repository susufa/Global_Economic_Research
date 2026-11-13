/**
 * search-results.js — 三语搜索结果可视化下拉面板与点击定位跳转管理器
 * --------------------------------------------------------------------------
 * 核心职责（第四阶段第五步 & 第五阶段）：
 * 1. 为平台搜索框（#masterPlatformSearch、#globalSearchInput、#taxGlobalSearchInput、#dbSearchInput、#scoreSearchInput）提供统一的交互式搜索结果下拉面板
 * 2. 严格按当前界面语言（简 / 繁 / En）显示匹配的实体名称与指标名称（例如：输入 Taipei，在简体界面显示“台北”，在繁体界面显示“臺北”，在英文界面显示“Taipei”）
 * 3. 支持点击搜索结果一键平滑跳转至对应板块、图表或国家明细行，并自动同步筛选状态
 * 4. 监听 languageManager 语言切换事件：当用户搜索后切换界面语言时，下拉结果面板与输入框即时重绘为新语言
 */

import { searchEngine } from './search-engine.js';
import { languageManager } from './language-manager.js';

class SearchResultsManager {
  constructor() {
    this._activeInput = null;
    this._activeQuery = '';
    this._activeModule = 'ALL';
    this._dropdownEl = null;
    this._boundInputs = new Set();
    this._onSelectCallback = null;
  }

  /**
   * 初始化搜索结果下拉面板与全局事件绑定
   * @param {{ onSelectEntity?: Function }} [options]
   */
  init(options = {}) {
    if (options.onSelectEntity) {
      this._onSelectCallback = options.onSelectEntity;
    }

    this._ensureDropdownDOM();

    // 绑定五大搜索输入框
    const inputConfigs = [
      { id: 'masterPlatformSearch', module: 'ALL' },
      { id: 'globalSearchInput', module: 'real-estate' },
      { id: 'taxGlobalSearchInput', module: 'taxation' },
      { id: 'dbSearchInput', module: 'taxation' },
      { id: 'scoreSearchInput', module: 'economy' }
    ];

    for (const cfg of inputConfigs) {
      this.attachToInput(cfg.id, cfg.module);
    }

    // 监听界面语言切换：若当前存在搜索词或打开的下拉框，立即按新语言重绘
    languageManager.onLanguageChange((newLang) => {
      if (this._activeQuery && this._activeInput) {
        this.renderForInput(this._activeInput, this._activeQuery, this._activeModule, newLang);
      }
    });

    // 点击外部关闭下拉面板
    document.addEventListener('mousedown', (e) => {
      if (!this._dropdownEl || this._dropdownEl.classList.contains('hidden')) return;
      const target = e.target;
      if (this._dropdownEl.contains(target)) return;
      if (this._activeInput && this._activeInput.contains(target)) return;
      this.hide();
    });

    // ESC 键关闭下拉面板
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hide();
      }
    });
  }

  /**
   * 创建全局复用的悬浮搜索结果容器 (#trilingualSearchDropdown)
   */
  _ensureDropdownDOM() {
    if (this._dropdownEl) return this._dropdownEl;
    let el = document.getElementById('trilingualSearchDropdown');
    if (!el) {
      el = document.createElement('div');
      el.id = 'trilingualSearchDropdown';
      el.setAttribute('data-no-i18n', 'true');
      el.className = 'hidden fixed z-50 bg-[#FFFDF9] border border-[#D4CCC0] rounded-xl shadow-xl overflow-hidden text-xs';
      el.style.maxHeight = '420px';
      el.style.width = '380px';
      el.style.boxShadow = '0 10px 28px rgba(44, 40, 37, 0.14)';
      document.body.appendChild(el);
    }
    this._dropdownEl = el;
    return el;
  }

  /**
   * 为指定搜索输入框挂载三语搜索下拉面板监听
   * @param {string} inputId
   * @param {'ALL'|'real-estate'|'taxation'|'economy'} moduleScope
   */
  attachToInput(inputId, moduleScope = 'ALL') {
    const inputEl = document.getElementById(inputId);
    if (!inputEl || this._boundInputs.has(inputEl)) return;
    this._boundInputs.add(inputEl);

    const handleTrigger = () => {
      const val = inputEl.value || '';
      this._activeInput = inputEl;
      this._activeQuery = val;
      this._activeModule = moduleScope;
      if (!val.trim()) {
        this.hide();
        return;
      }
      this.renderForInput(inputEl, val, moduleScope);
    };

    inputEl.addEventListener('input', handleTrigger);
    inputEl.addEventListener('focus', () => {
      if ((inputEl.value || '').trim()) {
        handleTrigger();
      }
    });
  }

  /**
   * 定位并渲染针对当前输入框的三语搜索结果列表
   */
  renderForInput(inputEl, rawQuery, moduleScope = 'ALL', lang = languageManager.getLanguage()) {
    const dropdown = this._ensureDropdownDOM();
    const res = searchEngine.search(rawQuery, { lang, moduleFilter: moduleScope, limit: 12 });

    if (res.normalized.isEmpty) {
      this.hide();
      return;
    }

    // 计算输入框屏幕位置
    const rect = inputEl.getBoundingClientRect();
    const panelWidth = Math.max(340, Math.min(440, rect.width + 80));
    let leftPos = rect.left;
    if (leftPos + panelWidth > window.innerWidth - 16) {
      leftPos = Math.max(12, window.innerWidth - panelWidth - 16);
    }
    const topPos = Math.min(window.innerHeight - 80, rect.bottom + 6);

    dropdown.style.width = `${panelWidth}px`;
    dropdown.style.left = `${leftPos}px`;
    dropdown.style.top = `${topPos}px`;

    if (!res.hasMatches) {
      dropdown.innerHTML = `
        <div class="p-4 text-center text-[#857D74]" data-no-i18n="true">
          <div class="font-semibold text-[#5C554E] mb-1">${languageManager.getUIText('noResults', lang)}</div>
          <div class="text-[11px] font-mono">"${this._escapeHtml(res.query)}"</div>
        </div>
      `;
      dropdown.classList.remove('hidden');
      return;
    }

    let html = `<div class="max-h-[390px] overflow-y-auto custom-scrollbar divide-y divide-[#EFECE4]" data-no-i18n="true">`;

    // 1. 国家与地区匹配组
    if (res.entities.length > 0) {
      html += `
        <div class="p-2 bg-[#FAF7F0]">
          <div class="px-2 py-1 text-[11px] font-bold text-[#857D74] uppercase tracking-wider flex items-center justify-between">
            <span>${languageManager.getUIText('entityGroupTitle', lang)} (${res.entities.length})</span>
            <span class="text-[10px] font-normal text-[#C86D51]">${languageManager.getUIText('jumpHint', lang)} ↵</span>
          </div>
          <div class="space-y-1 mt-1">
            ${res.entities.slice(0, 8).map(item => `
              <div class="search-result-item flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[#F5E6E1]/70 cursor-pointer transition"
                   data-entity-id="${item.id}"
                   data-entity-type="${item.type}">
                <div class="min-w-0">
                  <div class="font-bold text-[#2C2825] text-xs truncate">
                    <span class="search-result-primary-name">${this._escapeHtml(item.displayName)}</span>
                    ${item.displaySubtitle ? `<span class="text-[11px] font-normal text-[#857D74] ml-1.5">${this._escapeHtml(item.displaySubtitle)}</span>` : ''}
                  </div>
                </div>
                <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold badge-sage shrink-0">${this._escapeHtml(item.typeBadge)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // 2. 研究指标与专题匹配组
    if (res.indicators.length > 0) {
      html += `
        <div class="p-2 bg-[#FFFDF9]">
          <div class="px-2 py-1 text-[11px] font-bold text-[#857D74] uppercase tracking-wider">
            ${languageManager.getUIText('indicatorGroupTitle', lang)} (${res.indicators.length})
          </div>
          <div class="space-y-1 mt-1">
            ${res.indicators.slice(0, 6).map(item => `
              <div class="search-result-item flex items-start justify-between gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[#E5EDF3]/70 cursor-pointer transition"
                   data-entity-id="${item.id}"
                   data-entity-type="${item.type}">
                <div class="min-w-0">
                  <div class="font-bold text-[#2C2825] text-xs truncate search-result-primary-name">${this._escapeHtml(item.displayName)}</div>
                  ${item.displaySubtitle ? `<div class="text-[11px] text-[#5C554E] truncate mt-0.5">${this._escapeHtml(item.displaySubtitle)}</div>` : ''}
                </div>
                <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold badge-blue shrink-0 mt-0.5">${this._escapeHtml(item.typeBadge)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    html += `</div>`;
    dropdown.innerHTML = html;
    dropdown.classList.remove('hidden');

    // 绑定结果项点击跳转事件
    dropdown.querySelectorAll('.search-result-item').forEach(rowEl => {
      rowEl.addEventListener('click', () => {
        const entityId = rowEl.getAttribute('data-entity-id');
        const matchedObj = res.all.find(x => x.id === entityId);
        if (matchedObj) {
          this.handleResultClick(matchedObj, inputEl);
        }
      });
    });
  }

  /**
   * 处理点击某个搜索结果项后的跳转与筛选联动
   * @param {Object} item - 搜索结果项
   * @param {HTMLInputElement} [sourceInput]
   */
  handleResultClick(item, sourceInput = null) {
    this.hide();

    // 1. 若点击的是研究板块或指标，平滑滚动至目标图表/卡片并高亮提示
    if (item.type && item.type.startsWith('indicator')) {
      const targetEl = (item.chartId && document.getElementById(item.chartId)) ||
                       (item.targetId && document.getElementById(item.targetId));
      if (targetEl) {
        const cardContainer = targetEl.closest('.cream-card, .card, section') || targetEl;
        cardContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        cardContainer.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
        cardContainer.style.boxShadow = '0 0 0 3px rgba(200, 109, 81, 0.45)';
        setTimeout(() => {
          cardContainer.style.boxShadow = '';
        }, 2200);
      }
      if (this._onSelectCallback) {
        this._onSelectCallback(item);
      }
      return;
    }

    // 2. 若点击的是国家或地区/城市实体：
    // 将搜索框的值设为当前界面语言下的实体显示名称，并触发该模块或全平台的精确过滤与定位
    const lang = languageManager.getLanguage();
    const localizedName = languageManager.getDisplayName(item._rawEntity || item, lang);

    if (sourceInput) {
      sourceInput.value = localizedName;
    }
    this._activeQuery = localizedName;

    // 同步触发全平台或对应模块的过滤，并自动选中模拟器/对比经济体
    if (item.codes?.econ && typeof window.selectPrimaryFromTable === 'function' && this._activeModule === 'economy') {
      window.selectPrimaryFromTable(item.codes.econ);
    }

    if (this._onSelectCallback) {
      this._onSelectCallback(item, localizedName, this._activeModule);
    }

    // 平滑滚动到当前作用模块的数据区域
    if (this._activeModule === 'real-estate') {
      document.getElementById('absPriceComparisonTable')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (this._activeModule === 'taxation') {
      const targetTbl = sourceInput?.id === 'dbSearchInput' ? 'fullDbTbody' : 'overviewSummaryTbody';
      document.getElementById(targetTbl)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (this._activeModule === 'economy') {
      document.getElementById('scorecardTableBody')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /**
   * 隐藏下拉面板
   */
  hide() {
    if (this._dropdownEl) {
      this._dropdownEl.classList.add('hidden');
    }
  }

  _escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

export const searchResults = new SearchResultsManager();
export default searchResults;
