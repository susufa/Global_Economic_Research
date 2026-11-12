/**
 * navigation.js — 页面导航、板块锚点跳转与方法论弹窗管理
 * --------------------------------------------------------------------------
 * 核心职责：
 * 1. 管理三大研究板块（房地产、综合税制、经济发展轨迹）的平滑滚动与导航高亮
 * 2. 管理经济轨迹板块内部 8 个专题子模块的快速定位跳转（econScrollToTab / switchTab）
 * 3. 管理房地产与全平台统计口径弹窗 (#methodologyModal) 及数据表格折叠面板 (toggleTablePanel)
 * 4. 监听窗口尺寸变化并通知 chartManager 统一自适应重绘
 */

import { chartManager } from '../charts/chart-manager.js';
import { eventManager } from './event-manager.js';

/**
 * 折叠或展开数据明细表容器
 * @param {string} panelId - DOM 元素 ID
 */
export function toggleTablePanel(panelId) {
  const el = document.getElementById(panelId);
  if (!el) return;
  el.classList.toggle('hidden');
}

/**
 * 经济发展轨迹板块内部专题层级平滑滚动定位
 * @param {string} tabId - 'tab1' .. 'tab8'
 */
export function econScrollToTab(tabId) {
  const map = {
    tab1: 'econ-layer-1',
    tab2: 'econ-layer-1',
    tab3: 'econ-layer-3',
    tab4: 'econ-layer-2',
    tab5: 'econ-layer-2',
    tab6: 'econ-layer-4',
    tab7: 'econ-layer-4',
    tab8: 'econ-layer-5'
  };
  const targetId = map[tabId] || 'section-economic-trajectory';
  document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * 初始化全局导航栏、方法论弹窗与窗口自适应事件
 */
export function initNavigation() {
  // 挂载内联 HTML 所需的全局导航辅助函数
  window.toggleTablePanel = toggleTablePanel;
  window.switchTab = econScrollToTab;

  // 统计口径与方法论弹窗开关
  const modal = document.getElementById('methodologyModal');
  const btnOpen = document.getElementById('btnOpenMethodologyModal');
  const btnClose = document.getElementById('btnCloseMethodologyModal');

  if (btnOpen && modal) {
    eventManager.bind(btnOpen, 'click', () => {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    });
  }

  if (btnClose && modal) {
    eventManager.bind(btnClose, 'click', () => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    });
  }

  // 点击弹窗遮罩背景关闭弹窗
  if (modal) {
    eventManager.bind(modal, 'click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    });
  }

  // 窗口 resize 时统一通知图表管理器自适应缩放
  let resizeTimer = null;
  eventManager.bind(window, 'resize', () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      chartManager.resizeAll();
    }, 120);
  });
}
