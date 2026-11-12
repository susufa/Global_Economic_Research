/**
 * main.js — 全球宏观经济研究平台前端工程入口文件
 * --------------------------------------------------------------------------
 * 负责引入模块化 CSS 样式表并在 DOM 就绪后启动核心应用控制器 (initApp)。
 */

import './styles/variables.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/charts.css';

import { initApp } from './js/core/app.js';

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initApp, { once: true });
} else {
  initApp();
}
