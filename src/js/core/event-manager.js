/**
 * event-manager.js — 全局事件总线、防抖节流与 DOM 事件管理器
 * --------------------------------------------------------------------------
 * 核心职责：
 * 1. 提供跨模块发布/订阅事件总线（Pub/Sub），解耦顶部全局搜索栏与三大研究板块
 * 2. 管理带自动去重的 DOM 事件监听注册，避免重复绑定与内存泄漏
 * 3. 提供全局 Toast 消息提示与弹窗开关控制
 */

class EventManager {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._bus = new Map();
    /** @type {Array<{ el: EventTarget, type: string, handler: Function, options: any }>} */
    this._domListeners = [];
    this._toastTimer = null;
  }

  /**
   * 订阅跨模块自定义事件
   * @param {string} eventName
   * @param {Function} callback
   * @returns {Function} 取消订阅函数
   */
  on(eventName, callback) {
    if (!this._bus.has(eventName)) {
      this._bus.set(eventName, new Set());
    }
    this._bus.get(eventName).add(callback);
    return () => this.off(eventName, callback);
  }

  /**
   * 取消订阅跨模块事件
   * @param {string} eventName
   * @param {Function} callback
   */
  off(eventName, callback) {
    if (this._bus.has(eventName)) {
      this._bus.get(eventName).delete(callback);
    }
  }

  /**
   * 触发跨模块事件
   * @param {string} eventName
   * @param {any} payload
   */
  emit(eventName, payload) {
    if (this._bus.has(eventName)) {
      for (const cb of this._bus.get(eventName)) {
        try {
          cb(payload);
        } catch (err) {
          console.error(`[EventManager] 事件处理器执行异常 (${eventName}):`, err);
        }
      }
    }
  }

  /**
   * 安全绑定 DOM 事件并记录引用，防止重复绑定
   * @param {Element|Window|Document|string} targetOrId
   * @param {string} type
   * @param {Function} handler
   * @param {any} [options]
   */
  bind(targetOrId, type, handler, options = false) {
    const el = typeof targetOrId === 'string' ? document.getElementById(targetOrId) : targetOrId;
    if (!el || typeof el.addEventListener !== 'function') return;

    const exists = this._domListeners.some(
      item => item.el === el && item.type === type && item.handler === handler
    );
    if (exists) return;

    el.addEventListener(type, handler, options);
    this._domListeners.push({ el, type, handler, options });
  }

  /**
   * 清理全部通过 bind 注册的 DOM 监听器
   */
  cleanupAll() {
    for (const { el, type, handler, options } of this._domListeners) {
      el.removeEventListener(type, handler, options);
    }
    this._domListeners = [];
  }

  /**
   * 显示全局底部浮动提示框 (#toastMsg)
   * @param {string} msg
   * @param {number} [duration=3000]
   */
  showToast(msg, duration = 3000) {
    const el = document.getElementById('toastMsg');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      el.classList.add('hidden');
    }, duration);
  }
}

export const eventManager = new EventManager();
export default eventManager;
