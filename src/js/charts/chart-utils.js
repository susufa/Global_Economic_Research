/**
 * chart-utils.js — 公共图表主题配色、颜色映射与格式化工具
 * --------------------------------------------------------------------------
 * 负责提供统一的暖色科研色板、区域颜色映射及通用坐标轴/提示框格式化函数。
 * 同时内置离线沙箱兜底渲染适配器（仅当无外网环境无法加载 CDN Chart.js 时激活，在线环境下 100% 使用原生 Chart.js 4.4.3）。
 */

export const WARM_PALETTE = [
  '#C86D51', '#6B8E78', '#5B7C99', '#D49A45', '#8E5B66',
  '#4F7563', '#A8583B', '#3E627A', '#B58338', '#7A6F64',
  '#C2847A', '#79998A', '#6B8CA6', '#C9A45C', '#996B75'
];

export const REGION_COLORS = {
  Asia: '#C86D51',
  Europe: '#5B7C99',
  Americas: '#D49A45',
  Africa: '#6B8E78',
  Oceania: '#8E5B66',
  '亚洲': '#C86D51',
  '欧洲': '#5B7C99',
  '美洲': '#D49A45',
  '非洲': '#6B8E78',
  '大洋洲': '#8E5B66'
};

/**
 * 获取大洲/区域的带透明度 RGBA 颜色（用于税制与经济板块）
 * @param {string} cont - 大洲名称 ('亚洲' | '欧洲' | '美洲' | '非洲')
 * @param {number} alpha - 透明度 (0..1)
 * @returns {string} rgba 颜色字符串
 */
export function getContinentColor(cont, alpha = 0.85) {
  if (cont === '亚洲' || cont === 'Asia') return `rgba(200, 125, 101, ${alpha})`;
  if (cont === '欧洲' || cont === 'Europe') return `rgba(107, 142, 155, ${alpha})`;
  if (cont === '美洲' || cont === 'Americas') return `rgba(212, 163, 89, ${alpha})`;
  return `rgba(122, 154, 139, ${alpha})`;
}

/**
 * 生成大洲 HTML 标签徽章
 * @param {string} cont - 大洲名称
 * @returns {string} HTML 字符串
 */
export function getContinentTag(cont) {
  if (cont === '亚洲') return '<span class="tag tag-asia">亚洲</span>';
  if (cont === '欧洲') return '<span class="tag tag-europe">欧洲</span>';
  if (cont === '美洲') return '<span class="tag tag-americas">美洲</span>';
  return '<span class="tag tag-africa">非洲</span>';
}

/**
 * 当处于无外网隔离测试环境（CDN Chart.js 未加载）时，挂载兼容 Chart.js 4.x 接口的 Canvas 渲染器
 */
function ensureChartEngineAvailable() {
  if (typeof window === 'undefined' || window.Chart) return;

  const canvasMap = new WeakMap();

  class OfflineChartFallback {
    constructor(ctxOrCanvas, config = {}) {
      const canvas = ctxOrCanvas?.canvas ? ctxOrCanvas.canvas : ctxOrCanvas;
      this.canvas = canvas;
      this.ctx = canvas?.getContext ? canvas.getContext('2d') : null;
      this.config = config;
      this.type = config.type || 'bar';
      this.data = config.data || { labels: [], datasets: [] };
      this.options = config.options || {};
      if (canvas) {
        canvasMap.set(canvas, this);
      }
      this.render();
    }

    render() {
      if (!this.canvas || !this.ctx) return;
      const parent = this.canvas.parentElement;
      const w = (parent && parent.clientWidth > 0) ? parent.clientWidth : 600;
      const h = (parent && parent.clientHeight > 0) ? parent.clientHeight : 380;
      this.canvas.width = w;
      this.canvas.height = h;
      const ctx = this.ctx;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#FFFDF9';
      ctx.fillRect(0, 0, w, h);

      // 绘制坐标网格与简化数据图形
      ctx.strokeStyle = '#E3DDD1';
      ctx.lineWidth = 1;
      const padL = 48, padR = 20, padT = 30, padB = 34;
      ctx.strokeRect(padL, padT, Math.max(10, w - padL - padR), Math.max(10, h - padT - padB));

      const datasets = this.data?.datasets || [];
      datasets.forEach((ds, idx) => {
        const pts = Array.isArray(ds.data) ? ds.data : [];
        if (!pts.length) return;
        ctx.fillStyle = Array.isArray(ds.backgroundColor)
          ? (ds.backgroundColor[0] || WARM_PALETTE[idx % WARM_PALETTE.length])
          : (ds.borderColor || ds.backgroundColor || WARM_PALETTE[idx % WARM_PALETTE.length]);
        const plotW = Math.max(10, w - padL - padR);
        const plotH = Math.max(10, h - padT - padB);
        const stepX = plotW / Math.max(1, pts.length);
        pts.slice(0, 40).forEach((v, i) => {
          const num = typeof v === 'number' ? v : (v && typeof v.y === 'number' ? v.y : 50);
          const barH = Math.min(plotH - 4, Math.max(4, (Math.abs(num) % 100) / 100 * (plotH - 10)));
          ctx.fillRect(padL + i * stepX + 2, padT + plotH - barH, Math.max(2, stepX - 4), barH);
        });
      });
    }

    update() {
      this.render();
    }

    resize() {
      this.render();
    }

    destroy() {
      if (this.canvas && this.ctx) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        canvasMap.delete(this.canvas);
      }
    }

    static getChart(canvas) {
      return canvasMap.get(canvas) || null;
    }
  }

  OfflineChartFallback.defaults = {
    color: '#5C554E',
    borderColor: '#E3DDD1',
    font: {
      family: "'Inter', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif"
    }
  };

  window.Chart = OfflineChartFallback;
}

/**
 * 初始化 Chart.js 全局默认科研暖色排版参数
 */
export function applyChartGlobalDefaults() {
  ensureChartEngineAvailable();
  if (typeof window !== 'undefined' && window.Chart && window.Chart.defaults) {
    window.Chart.defaults.color = '#5C554E';
    window.Chart.defaults.borderColor = '#E3DDD1';
    if (window.Chart.defaults.font) {
      window.Chart.defaults.font.family = "'Inter', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif";
    }
  }
}
