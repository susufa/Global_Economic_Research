# 全球宏观经济研究平台 (Global Economic Research Platform)

本项目是由原单体 `综合.html` 改造而成的规范化前端工程项目，整合了**全球房地产市场（1985–2026）**、**全球综合税制体系（2000–2026）**与**全球经济发展轨迹（1985–2026）**三大深度实证研究板块。工程化改造实现了 HTML、CSS、JavaScript 与 JSON 数据的职责分离，为后续接入动态数据获取系统、缓存管理、历史版本管理和复杂数据分析奠定了坚实的架构基础。

---

## 一、项目目录结构

```text
Global-Economic-Research/
├── index.html                        # 主页面入口（纯 HTML5 结构，不含内联大段 CSS/JS）
├── package.json                      # 项目依赖与 NPM 脚本配置
├── vite.config.js                    # Vite 开发服务器与生产构建配置
├── public/                           # 静态公共资源目录
│   └── assets/
│       ├── images/                   # 静态图片与图标资源目录
│       └── fonts/                    # 本地字体扩展目录
├── src/                              # 源代码目录
│   ├── main.js                       # 前端工程主入口（加载 CSS 与启动核心控制器）
│   │
│   ├── styles/                       # 模块化 CSS 样式体系
│   │   ├── variables.css             # 全局 CSS 变量（背景色、文字色、强调色、字体、圆角、阴影、图表主题色）
│   │   ├── base.css                  # 基础重置、全局字体排版、基础表单控件与自定义滚动条
│   │   ├── layout.css                # 页面主框架、三大板块横幅、栅格系统与响应式断点
│   │   ├── components.css            # 统一卡片、按钮、筛选胶囊、数据表格、模拟器组件、国别档案卡与提示框
│   │   └── charts.css                # 图表画布容器尺寸、响应式高度与表格内嵌迷你条形图样式
│   │
│   ├── js/                           # 模块化 JavaScript (ES Modules)
│   │   ├── core/                     # 核心协调层
│   │   │   ├── app.js                # 应用启动引导、数据校验调用与跨板块全局搜索联动
│   │   │   ├── navigation.js         # 板块锚点导航、专题跳转、表格折叠面板与方法论弹窗控制
│   │   │   └── event-manager.js      # 跨模块发布/订阅事件总线、防重复 DOM 监听绑定与全局 Toast 通知
│   │   │
│   │   ├── data/                     # 数据管理与校验层
│   │   │   ├── data-manager.js       # 统一数据访问、区域/关键词检索过滤与动态数据源适配器扩展接口
│   │   │   └── data-validator.js     # 国家/地区数量、四大独立统计实体（中国大陆/台湾/香港/澳门）及序列完整性校验
│   │   │
│   │   ├── charts/                   # 图表生命周期管理层
│   │   │   ├── chart-manager.js      # 统一管理 46 个 Chart.js 实例的创建、增量复用更新、自适应缩放与安全销毁
│   │   │   └── chart-utils.js        # 15 色暖调科研色板、大洲颜色映射、标签生成与全局 Chart.js 默认配置
│   │   │
│   │   ├── calculations/             # 独立纯函数指标计算引擎
│   │   │   └── index-calculator.js   # 时间序列插值、YoY/QoQ/CAGR、定基换算、房地产6维评分与房贷模拟、税制8步模拟与5维评估、经济13维加权评分
│   │   │
│   │   └── modules/                  # 三大研究板块业务逻辑层
│   │       ├── real-estate.js        # 板块一：全球房地产市场（57个国家/地区、16个图表、房贷模拟器、泡沫史与案例）
│   │       ├── taxation.js           # 板块二：全球综合税制比较（55个管辖区、14个图表、8步税负传导模拟、国别档案卡）
│   │       └── economy.js            # 板块三：全球经济发展轨迹（55个经济体、42年序列、16个图表、10大问题、9大历史冲击、15个案例、13维评分）
│   │
│   └── data/                         # 独立 JSON 原始数据仓库
│       ├── real-estate.json          # 房地产板块完整数据集（57个国家/地区、16个泡沫事件、14个案例、10个结论）
│       ├── taxation.json             # 综合税制板块完整数据集（55个管辖区税率、税楔、宏观税负与溯源链接）
│       └── economy.json              # 经济发展轨迹完整数据集（55个经济体 1985–2026 年度序列、10大问题、9大历史事件、15个案例）
└── README.md                         # 项目架构与工程说明文档
```

---

## 二、使用的技术栈

| 技术 | 版本 / 规范 | 用途说明 |
| :--- | :--- | :--- |
| **Vite** | `^5.4.0` | 前端本地开发服务器（HMR）、ES Modules 模块解析与生产环境打包构建 |
| **HTML5** | 语义化标准 | 页面骨架、三大研究板块容器、数据表格与交互控件结构 |
| **CSS3** | 模块化 CSS + Custom Properties | 统一暖色调科研视觉体系、栅格与弹性布局、组件化样式管理 |
| **JavaScript** | ES2020+ ES Modules (`import`/`export`) | 业务逻辑解耦、数据访问抽象、独立指标计算与图表生命周期管理 |
| **JSON** | 标准独立数据文件 | 存储三大板块全部国家/地区、时间序列、指标、统计口径说明及权威数据来源链接 |
| **Chart.js** | `4.4.3` | 完整保留原有 46 个交互式动态统计图表（折线图、分组柱状图、堆叠图、散点图、雷达图、环形图） |
| **Tailwind CSS** | `3.4.17` | 保留原有工具类布局支持，与模块化 CSS 协同保持 100% 视觉一致性 |

---

## 三、依赖安装、本地启动与生产构建方法

### 1. 环境要求
- **Node.js**: `>= 18.0.0`
- **npm**: `>= 9.0.0`

### 2. 安装项目依赖
在项目根目录下执行：
```bash
npm install
```

### 3. 启动本地开发服务器
```bash
npm run dev
```
启动后默认监听 `http://localhost:5173`，支持热更新（HMR）与 ES Module 按需加载。

### 4. 执行生产环境构建
```bash
npm run build
```
构建产物将输出至 `dist/` 目录（包含压缩合并后的 `index.html`、`assets/*.css` 及 `assets/*.js`）。

### 5. 预览生产环境构建结果
```bash
npm run preview
```

---

## 四、各模块的职责划分

1. **入口与核心协调层 (`src/main.js`, `src/js/core/`)**
   - `main.js`：引入 `variables.css`、`base.css`、`layout.css`、`components.css`、`charts.css`，并在 DOM 就绪时调用 `initApp()`。
   - `app.js`：执行启动期数据完整性校验，配置图表全局参数，初始化三大研究板块，并负责顶部全局搜索框 (`handleMasterPlatformSearch`) 的跨板块同步联动。
   - `navigation.js`：管理板块平滑滚动定位、表格折叠面板切换 (`toggleTablePanel`)、方法论说明弹窗 (`#methodologyModal`) 及窗口缩放时的图表自适应重绘。
   - `event-manager.js`：提供跨模块事件发布/订阅总线（Pub/Sub）、防重复绑定的 DOM 事件注册器与全局浮动提示框 (`showToast`)。

2. **数据管理与校验层 (`src/js/data/`)**
   - `data-manager.js`：封装对 `src/data/*.json` 的读取、按地区/关键词过滤查询及实体字典缓存；同时预留 `registerDataSourceAdapter(moduleKey, adapterFn)` 与 `fetchModuleSnapshot(moduleKey, params)` 异步接口，供下一阶段无缝对接后端 API、IndexedDB 缓存或历史版本管理。
   - `data-validator.js`：校验房地产（57国）、综合税制（55管辖区）、经济轨迹（55经济体 × 42年）的数量、缺失值标记（`null`/`"NA"`）及中国大陆、中国台湾、中国香港、中国澳门四个独立统计实体的完整性。

3. **图表管理层 (`src/js/charts/`)**
   - `chart-manager.js`：按命名空间（`re:*`、`tax:*`、`econ:*`）集中管理全部 46 个 Chart.js 实例。更新数据时若画布与图表类型未变，优先复用已有实例执行无动画增量更新 (`existing.update('none')`)；若需重建则安全调用 `.destroy()`，彻底消除重复初始化与内存泄漏。
   - `chart-utils.js`：集中维护 15 色暖调科研色板 (`WARM_PALETTE`)、区域色彩映射函数 (`getContinentColor`) 与区域徽章生成器 (`getContinentTag`)。

4. **独立指标计算层 (`src/js/calculations/index-calculator.js`)**
   - 纯函数实现，零 DOM 与图表耦合，涵盖：时间序列线性插值 (`getSeriesValue`)、同比/环比增长率 (`computeYoYGrowth`/`computeQoQGrowth`)、结构占比 (`computeSharePct`)、定基换算 (`rebaseIndexSeries`)、房地产区间涨幅与复合年均增长率 (`computePeriodGrowth`/`computeCAGR`)、房地产 6 维健康度评分 (`computeMultiDimensionalScores`)、按揭负担模拟 (`calculateMortgageSimulation`)、税制 8 步收入传导模型 (`calculate8StepSim`)、税制 5 维评估与聚类 (`computeTaxEvalScores`) 以及经济轨迹 13 维加权评分 (`computeEconomyWeightedScore`)。

5. **三大研究板块业务模块 (`src/js/modules/`)**
   - `real-estate.js`：管理房地产板块 6 大专题视图、16 个图表、按揭模拟器、16 大历史泡沫事件、14 个国别案例与 CSV 导出。
   - `taxation.js`：管理综合税制板块 KPI 概览、14 个图表、8 步税负模拟器、国别税制档案对照卡、社保明细表、5 维权重评估与 CSV 导出。
   - `economy.js`：管理经济发展轨迹板块主/对标经济体双擎对比、16 个图表、10 大核心实证问题、9 大历史冲击、15 个国别深度案例、13 维权重滑块评分榜与 CSV 导出。

---

## 五、后续如何增加新的研究板块（扩展指南）

当需要新增第四个研究板块（例如“全球货币政策与通胀周期” `monetary-policy`）时，仅需遵循以下 5 个标准步骤，无需改动现有三个板块的代码：

1. **新增独立数据文件**：在 `src/data/` 下创建 `monetary-policy.json`，遵循相同的 `{ meta, entities/series, ... }` 结构存储原始数据与溯源链接。
2. **注册数据访问与校验方法**：在 `src/js/data/data-validator.js` 中添加 `validateMonetaryData()`，并在 `src/js/data/data-manager.js` 中导入该 JSON 并暴露 `getMonetaryData()` 查询接口。
3. **扩展纯计算函数**：若有专属领域公式（如泰勒规则利率缺口、实际利率计算），在 `src/js/calculations/index-calculator.js` 中导出纯计算函数。
4. **创建业务模块**：在 `src/js/modules/` 下新建 `monetary-policy.js`，通过 `dataManager` 获取数据、调用 `index-calculator` 计算指标、使用 `chartManager.createOrUpdate('monetary', key, canvasId, config)` 渲染图表，并导出 `initMonetaryModule()`。
5. **在入口挂载**：在 `index.html` 中添加对应 `<section id="section-monetary-policy">` 容器与顶部导航链接，并在 `src/js/core/app.js` 的 `initApp()` 中调用 `initMonetaryModule()`，以及在 `handleMasterPlatformSearch()` 中订阅全局搜索事件即可。
