/**
 * chart-manager.js — 统一图表实例生命周期管理器
 * --------------------------------------------------------------------------
 * 核心职责：
 * 1. 统一维护所有模块的 Chart.js 实例注册表（按 namespace:key 隔离）
 * 2. 避免重复初始化图表：当图表类型兼容时优先复用已有实例执行增量 update('none')，类型变更或需重建时安全销毁旧实例
 * 3. 页面模块或标签页切换时提供批量 resize 与按需销毁能力，防止内存泄漏
 * 4. 与 i18n 模块协同：在图表创建或更新时自动应用当前激活语言（简/繁/En）标签与字体
 */

class ChartManager {
  constructor() {
    /** @type {Map<string, any>} */
    this.instances = new Map();
  }

  _makeKey(namespace, key) {
    return `${namespace}:${key}`;
  }

  createOrUpdate(namespace, key, target, config, options = {}) {
    const fullKey = this._makeKey(namespace, key);
    let canvasEl = null;

    if (typeof target === 'string') {
      canvasEl = document.getElementById(target);
    } else if (target && target.canvas) {
      canvasEl = target.canvas;
    } else if (target instanceof HTMLCanvasElement) {
      canvasEl = target;
    }

    if (!canvasEl || typeof window.Chart === 'undefined') {
      return null;
    }

    const existing = this.instances.get(fullKey) || window.Chart.getChart?.(canvasEl);

    if (existing) {
      if (
        options.forceRecreate ||
        existing.canvas !== canvasEl ||
        existing.config.type !== config.type
      ) {
        existing.destroy();
        this.instances.delete(fullKey);
      } else {
        existing.data = config.data;
        if (config.options) {
          existing.options = config.options;
        }
        // 更新快照并按当前语言本地化
        if (typeof window.__resetAndLocalizeChart === 'function') {
          window.__resetAndLocalizeChart(existing);
        } else {
          existing.update('none');
        }
        this.instances.set(fullKey, existing);
        return existing;
      }
    }

    const ctx = canvasEl.getContext('2d');
    const instance = new window.Chart(ctx, config);
    this.instances.set(fullKey, instance);
    if (typeof window.__resetAndLocalizeChart === 'function') {
      window.__resetAndLocalizeChart(instance);
    }
    return instance;
  }

  destroy(namespace, key) {
    const fullKey = this._makeKey(namespace, key);
    const existing = this.instances.get(fullKey);
    if (existing) {
      existing.destroy();
      this.instances.delete(fullKey);
    }
  }

  getNamespaceProxy(namespace) {
    const manager = this;
    return new Proxy(
      {},
      {
        get(_, prop) {
          if (typeof prop !== 'string') return undefined;
          return manager.instances.get(manager._makeKey(namespace, prop)) || null;
        },
        set(_, prop, value) {
          if (typeof prop === 'string') {
            const fullKey = manager._makeKey(namespace, prop);
            if (value === null || value === undefined) {
              const old = manager.instances.get(fullKey);
              if (old && typeof old.destroy === 'function') {
                try { old.destroy(); } catch (_e) { /* ignore */ }
              }
              manager.instances.delete(fullKey);
            } else {
              manager.instances.set(fullKey, value);
              if (typeof window.__resetAndLocalizeChart === 'function') {
                window.__resetAndLocalizeChart(value);
              }
            }
          }
          return true;
        }
      }
    );
  }

  resizeAll(namespace) {
    for (const [k, chart] of this.instances.entries()) {
      if (!namespace || k.startsWith(`${namespace}:`)) {
        if (chart && typeof chart.resize === 'function') {
          chart.resize();
        }
      }
    }
  }

  getStats() {
    const counts = { total: this.instances.size, re: 0, tax: 0, econ: 0 };
    for (const k of this.instances.keys()) {
      if (k.startsWith('re:')) counts.re++;
      else if (k.startsWith('tax:')) counts.tax++;
      else if (k.startsWith('econ:')) counts.econ++;
    }
    return counts;
  }
}

export const chartManager = new ChartManager();
export default chartManager;
