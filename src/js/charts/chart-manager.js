/**
 * chart-manager.js — 统一图表实例生命周期管理器
 * --------------------------------------------------------------------------
 * 核心职责：
 * 1. 统一维护所有模块的 Chart.js 实例注册表（按 namespace:key 隔离）
 * 2. 避免重复初始化图表：当图表类型兼容时优先复用已有实例执行增量 update('none')，类型变更或需重建时安全销毁旧实例
 * 3. 页面模块或标签页切换时提供批量 resize 与按需销毁能力，防止内存泄漏
 */

class ChartManager {
  constructor() {
    /** @type {Map<string, any>} */
    this.instances = new Map();
  }

  /**
   * 生成带命名空间的唯一图表键
   * @param {string} namespace - 模块名 ('re' | 'tax' | 'econ')
   * @param {string} key - 图表内部标识
   */
  _makeKey(namespace, key) {
    return `${namespace}:${key}`;
  }

  /**
   * 创建或复用更新 Chart.js 实例
   * @param {string} namespace - 模块命名空间 ('re' | 'tax' | 'econ')
   * @param {string} key - 图表键名
   * @param {string|HTMLCanvasElement|CanvasRenderingContext2D} target - Canvas ID、元素或 2D Context
   * @param {Object} config - Chart.js 配置对象
   * @param {Object} [options] - { forceRecreate: boolean }
   * @returns {any} Chart.js 实例
   */
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

    // 检查是否已有绑定的实例
    const existing = this.instances.get(fullKey) || window.Chart.getChart?.(canvasEl);

    if (existing) {
      // 如果强制重建、或者画布节点已变更、或者图表主类型改变，则安全销毁后重建
      if (
        options.forceRecreate ||
        existing.canvas !== canvasEl ||
        existing.config.type !== config.type
      ) {
        existing.destroy();
        this.instances.delete(fullKey);
      } else {
        // 复用现有图表实例，直接增量更新数据与配置，避免重复创建 Canvas 上下文
        existing.data = config.data;
        if (config.options) {
          existing.options = config.options;
        }
        existing.update('none');
        this.instances.set(fullKey, existing);
        return existing;
      }
    }

    const ctx = canvasEl.getContext('2d');
    const instance = new window.Chart(ctx, config);
    this.instances.set(fullKey, instance);
    return instance;
  }

  /**
   * 销毁指定图表实例并释放内存
   * @param {string} namespace
   * @param {string} key
   */
  destroy(namespace, key) {
    const fullKey = this._makeKey(namespace, key);
    const existing = this.instances.get(fullKey);
    if (existing) {
      existing.destroy();
      this.instances.delete(fullKey);
    }
  }

  /**
   * 获取指定命名空间的代理对象（兼容原模块 `charts[key]` 读写语法）
   * @param {string} namespace - 're' | 'tax' | 'econ'
   * @returns {Proxy}
   */
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
                try { old.destroy(); } catch (_e) { /* ignore already destroyed */ }
              }
              manager.instances.delete(fullKey);
            } else {
              manager.instances.set(fullKey, value);
            }
          }
          return true;
        }
      }
    );
  }

  /**
   * 当容器尺寸或模块可见性变化时，通知所有活跃图表重新自适应尺寸
   * @param {string} [namespace] - 可选仅刷新指定模块
   */
  resizeAll(namespace) {
    for (const [k, chart] of this.instances.entries()) {
      if (!namespace || k.startsWith(`${namespace}:`)) {
        if (chart && typeof chart.resize === 'function') {
          chart.resize();
        }
      }
    }
  }

  /**
   * 获取当前已注册的活跃图表统计信息
   */
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
