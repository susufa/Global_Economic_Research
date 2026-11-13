/**
 * i18n.js — 全平台多语言切换（简体中文 / 繁體中文 / English）与字体工程管理模块
 * --------------------------------------------------------------------------
 * 核心职责：
 * 1. 管理左上角三个等尺寸水平方框（“简” / “繁” / “En”）的交互状态与语言切换
 * 2. 管理三套字体工程体系的实时切换：
 *    - 简体中文 (zh-CN)：《艾尔登法环》/《艾尔登法环：黑夜君临》同款思源宋体 SC (Source Han Serif SC / Noto Serif SC) + 英文数字 IBM Plex
 *    - 繁體中文 (zh-TW)：《艾尔登法环》/《艾尔登法环：黑夜君临》同款思源宋體 TC / 華康明體 (Source Han Serif TC / Noto Serif TC / DFMing) + 英文数字 IBM Plex
 *    - 英文 (en)：IBM Plex 量化工程字体体系 (IBM Plex Sans + IBM Plex Mono + Source Serif 4)
 * 3. 实现全页面静态 DOM 节点、动态渲染表格/卡片、属性（placeholder/title）与 46 个 Chart.js 图表的无损双向语言转换
 */

import { chartManager } from '../charts/chart-manager.js';
import { languageManager } from '../search/language-manager.js';

const S2T_CHAR_MAP = {"万": "萬", "与": "與", "专": "專", "业": "業", "东": "東", "两": "兩", "严": "嚴", "丧": "喪", "个": "個", "临": "臨", "为": "為", "举": "舉", "义": "義", "乌": "烏", "乐": "樂", "乡": "鄉", "书": "書", "买": "買", "争": "爭", "于": "於", "亚": "亞", "产": "產", "亲": "親", "亿": "億", "仅": "僅", "从": "從", "仓": "倉", "仪": "儀", "价": "價", "众": "眾", "优": "優", "会": "會", "传": "傳", "伤": "傷", "伦": "倫", "体": "體", "侣": "侶", "侧": "側", "侨": "僑", "债": "債", "倾": "傾", "偿": "償", "储": "儲", "儿": "兒", "兑": "兌", "兰": "蘭", "关": "關", "兴": "興", "兹": "玆", "养": "養", "兽": "獸", "内": "內", "冈": "岡", "册": "冊", "写": "寫", "军": "軍", "农": "農", "冲": "沖", "决": "決", "况": "況", "冻": "凍", "净": "淨", "减": "減", "凭": "憑", "凯": "凱", "击": "擊", "则": "則", "刚": "剛", "创": "創", "别": "別", "刹": "剎", "剧": "劇", "办": "辦", "务": "務", "动": "動", "励": "勵", "劲": "勁", "劳": "勞", "势": "勢", "匮": "匱", "区": "區", "医": "醫", "华": "華", "协": "協", "单": "單", "卖": "賣", "卢": "盧", "卫": "衛", "却": "卻", "厂": "廠", "厅": "廳", "历": "歷", "厉": "厲", "压": "壓", "厘": "釐", "县": "縣", "参": "參", "双": "雙", "发": "發", "变": "變", "叠": "疊", "叶": "葉", "号": "號", "吨": "噸", "听": "聽", "启": "啟", "员": "員", "响": "響", "啸": "嘯", "团": "團", "园": "園", "围": "圍", "国": "國", "图": "圖", "圆": "圓", "圣": "聖", "场": "場", "坏": "壞", "块": "塊", "坚": "堅", "坝": "壩", "垄": "壟", "垒": "壘", "垫": "墊", "壮": "壯", "声": "聲", "壳": "殼", "处": "處", "备": "備", "复": "復", "够": "夠", "头": "頭", "夹": "夾", "夺": "奪", "奖": "獎", "奥": "奧", "妆": "妝", "娱": "娛", "婴": "嬰", "孙": "孫", "学": "學", "宝": "寶", "实": "實", "审": "審", "宪": "憲", "宽": "寬", "宾": "賓", "对": "對", "导": "導", "寿": "壽", "将": "將", "尔": "爾", "尽": "盡", "层": "層", "属": "屬", "屡": "屢", "屿": "嶼", "岁": "歲", "岗": "崗", "岘": "峴", "岛": "島", "巅": "巔", "巩": "鞏", "币": "幣", "师": "師", "带": "帶", "帮": "幫", "广": "廣", "庆": "慶", "库": "庫", "应": "應", "庞": "龐", "废": "廢", "开": "開", "异": "異", "弃": "棄", "张": "張", "弹": "彈", "强": "強", "归": "歸", "当": "當", "录": "錄", "彻": "徹", "征": "徵", "径": "徑", "忧": "憂", "态": "態", "总": "總", "恶": "惡", "悬": "懸", "惨": "慘", "惩": "懲", "愿": "願", "戏": "戲", "战": "戰", "户": "戶", "执": "執", "扩": "擴", "扫": "掃", "抚": "撫", "抢": "搶", "护": "護", "报": "報", "担": "擔", "拟": "擬", "拥": "擁", "拨": "撥", "择": "擇", "挂": "掛", "挤": "擠", "挥": "揮", "损": "損", "换": "換", "据": "據", "揽": "攬", "摊": "攤", "撑": "撐", "攒": "攢", "敛": "斂", "敦": "惇", "数": "數", "斩": "斬", "断": "斷", "无": "無", "旧": "舊", "时": "時", "显": "顯", "晋": "晉", "暂": "暫", "术": "朮", "机": "機", "杂": "雜", "权": "權", "条": "條", "来": "來", "极": "極", "构": "搆", "枢": "樞", "柜": "櫃", "标": "標", "栋": "棟", "栏": "欄", "树": "樹", "样": "樣", "档": "檔", "检": "檢", "楼": "樓", "榄": "欖", "榈": "櫚", "槛": "檻", "槟": "檳", "横": "橫", "欧": "歐", "残": "殘", "毁": "毀", "毕": "畢", "气": "氣", "氢": "氫", "汇": "匯", "汉": "漢", "沟": "溝", "沪": "滬", "泽": "澤", "洁": "潔", "测": "測", "济": "濟", "润": "潤", "涨": "漲", "淀": "澱", "渐": "漸", "渔": "漁", "渗": "滲", "温": "溫", "湾": "灣", "溃": "潰", "滚": "滾", "滞": "滯", "满": "滿", "滤": "濾", "滨": "濱", "潜": "潛", "澜": "瀾", "濒": "瀕", "灭": "滅", "灵": "靈", "灾": "災", "点": "點", "炼": "煉", "烂": "爛", "烟": "煙", "热": "熱", "爱": "愛", "状": "狀", "独": "獨", "狭": "狹", "猪": "豬", "献": "獻", "环": "環", "现": "現", "电": "電", "画": "畫", "疗": "療", "盐": "鹽", "监": "監", "盖": "蓋", "盘": "槃", "矶": "磯", "矿": "礦", "码": "碼", "础": "礎", "确": "確", "磷": "燐", "离": "離", "种": "種", "积": "積", "称": "稱", "税": "稅", "稳": "穩", "穷": "窮", "竞": "競", "笋": "筍", "笔": "筆", "筛": "篩", "筹": "籌", "签": "簽", "简": "簡", "篮": "籃", "类": "類", "粮": "糧", "紧": "緊", "纠": "糾", "红": "紅", "约": "約", "级": "級", "纪": "紀", "纬": "緯", "纯": "純", "纳": "納", "纵": "縱", "纸": "紙", "纺": "紡", "纽": "紐", "线": "線", "组": "組", "细": "細", "织": "織", "终": "終", "经": "經", "绑": "綁", "结": "結", "绘": "繪", "给": "給", "络": "絡", "绝": "絕", "统": "統", "继": "繼", "续": "續", "维": "維", "综": "綜", "绿": "綠", "缓": "緩", "缔": "締", "编": "編", "缘": "緣", "缝": "縫", "缩": "縮", "缴": "繳", "网": "網", "罗": "羅", "罚": "罰", "职": "職", "联": "聯", "胀": "脹", "脏": "臟", "脑": "腦", "脱": "脫", "腊": "臘", "艺": "藝", "节": "節", "芦": "蘆", "苏": "蘇", "苹": "蘋", "荣": "榮", "药": "藥", "莱": "萊", "获": "獲", "营": "營", "萨": "薩", "蓝": "藍", "虑": "慮", "虚": "虛", "虽": "雖", "蚀": "蝕", "蜗": "蝸", "补": "補", "装": "裝", "见": "見", "观": "觀", "规": "規", "视": "視", "览": "覽", "觉": "覺", "触": "觸", "誉": "譽", "计": "計", "订": "訂", "认": "認", "讨": "討", "让": "讓", "训": "訓", "议": "議", "讯": "訊", "记": "記", "讲": "講", "许": "許", "论": "論", "设": "設", "访": "訪", "证": "證", "评": "評", "诅": "詛", "识": "識", "诈": "詐", "诉": "訴", "诊": "診", "词": "詞", "试": "試", "诗": "詩", "话": "話", "诞": "誕", "询": "詢", "该": "該", "详": "詳", "语": "語", "误": "誤", "说": "說", "请": "請", "诺": "諾", "读": "讀", "课": "課", "调": "調", "谈": "談", "谢": "謝", "贝": "貝", "负": "負", "贡": "貢", "财": "財", "责": "責", "败": "敗", "账": "賬", "货": "貨", "质": "質", "贩": "販", "贫": "貧", "贬": "貶", "购": "購", "贳": "貰", "贴": "貼", "贵": "貴", "贷": "貸", "贸": "貿", "费": "費", "贾": "賈", "赁": "賃", "资": "資", "赋": "賦", "赌": "賭", "赎": "贖", "赔": "賠", "赖": "賴", "赛": "賽", "赠": "贈", "赡": "贍", "赢": "贏", "赶": "趕", "趋": "趨", "跃": "躍", "践": "踐", "踪": "蹤", "车": "車", "轨": "軌", "转": "轉", "轮": "輪", "软": "軟", "轴": "軸", "轻": "輕", "载": "載", "较": "較", "辅": "輔", "辆": "輛", "辈": "輩", "辑": "輯", "输": "輸", "辖": "轄", "辩": "辯", "边": "邊", "达": "達", "迁": "遷", "过": "過", "迈": "邁", "运": "運", "还": "還", "这": "這", "进": "進", "远": "遠", "违": "違", "连": "連", "迟": "遲", "迹": "跡", "适": "適", "选": "選", "逊": "遜", "递": "遞", "逻": "邏", "遗": "遺", "邮": "郵", "邻": "鄰", "采": "採", "释": "釋", "针": "針", "钉": "釘", "钞": "鈔", "钢": "鋼", "钩": "鈎", "钮": "鈕", "钱": "錢", "钾": "鉀", "铁": "鐵", "铂": "鉑", "铜": "銅", "铝": "鋁", "铢": "銖", "银": "銀", "链": "鏈", "销": "銷", "锁": "鎖", "锂": "鋰", "锈": "鏽", "锋": "鋒", "锌": "鋅", "错": "錯", "锚": "錨", "锡": "錫", "键": "鍵", "镇": "鎮", "镍": "鎳", "镑": "鎊", "镜": "鏡", "长": "長", "门": "門", "闭": "閉", "问": "問", "闯": "闖", "闲": "閑", "间": "間", "阀": "閥", "阁": "閣", "阅": "閱", "阈": "閾", "阔": "闊", "队": "隊", "阴": "陰", "阵": "陣", "阶": "階", "际": "際", "陆": "陸", "险": "險", "随": "隨", "隐": "隱", "难": "難", "静": "靜", "韦": "韋", "韧": "韌", "韩": "韓", "页": "頁", "顶": "頂", "项": "項", "顺": "順", "须": "須", "顾": "顧", "顿": "頓", "预": "預", "领": "領", "颈": "頸", "频": "頻", "题": "題", "颜": "顏", "额": "額", "颠": "顛", "风": "風", "飙": "飆", "飞": "飛", "饮": "飲", "饱": "飽", "饲": "飼", "饷": "餉", "馆": "館", "馈": "饋", "马": "馬", "驯": "馴", "驰": "馳", "驱": "驅", "验": "驗", "骤": "驟", "鱼": "魚", "鲁": "魯", "鲜": "鮮", "鸡": "雞", "鸿": "鴻", "麦": "麥", "黄": "黃", "齐": "齊", "龄": "齡", "龙": "龍", "余": "餘", "后": "後", "准": "準", "舍": "捨", "钟": "鐘", "伙": "夥", "周": "週", "松": "鬆", "游": "遊", "赞": "贊"};
const S2T_PHRASES = {"发展": "發展", "发现": "發現", "发布": "發佈", "发行": "發行", "发债": "發債", "发放": "發放", "发达": "發達", "发生": "發生", "历史": "歷史", "历经": "歷經", "历程": "歷程", "空置": "空置", "复苏": "復甦", "恢复": "恢復", "修复": "修復", "复盘": "復盤", "复合": "複合", "复杂": "複雜", "复制": "複製", "占比": "佔比", "占GDP": "佔GDP", "占全": "佔全", "占总": "佔總", "占据": "佔據", "占雇主": "佔僱主", "占税前": "佔稅前", "占家庭": "佔家庭", "占地方": "佔地方", "占出口": "佔出口", "占就业": "佔就業", "雇员": "僱員", "雇主": "僱主", "自雇": "自僱", "软件": "軟體", "互联网": "網際網路", "信息": "資訊", "胡志明市": "胡志明市", "家庭户数": "家庭戶數", "套户比": "套戶比", "户均": "戶均", "住户": "住戶", "家户": "家戶", "汇率": "匯率", "外汇": "外匯", "侨汇": "僑匯", "汇出": "匯出", "汇总": "匯總", "冲击": "衝擊", "冲突": "衝突", "征税": "徵稅", "征收": "徵收", "免征": "免徵", "起征": "起徵", "特征": "特徵", "象征": "象徵", "标准": "標準", "准入": "准入", "准则": "準則", "精准": "精準", "校准": "校準", "基准": "基準", "准联邦": "準聯邦", "周期": "週期", "高周转": "高週轉", "两周": "兩週", "周边": "周邊", "台积电": "台積電", "台湾": "臺灣", "台北": "臺北", "台中": "臺中", "新台币": "新臺幣", "平台": "平台", "出台": "出台", "传贳": "傳貰", "制造": "製造", "制成品": "製成品", "晶圆": "晶圓", "芯片": "晶片", "宏伟": "宏偉", "宏观": "宏觀", "关系": "關係", "联系": "聯繫", "系列": "系列", "系统": "系統", "系数": "係數", "体系": "體系", "宽松": "寬鬆", "放松": "放鬆", "松绑": "鬆綁", "范畴": "範疇", "范围": "範圍", "规范": "規範", "典范": "典範", "示范": "示範", "债务": "債務", "债券": "債券", "举债": "舉債", "负债": "負債", "不良": "不良", "通胀": "通膨", "通货膨胀": "通貨膨脹"};
const EN_PHRASE_ENTRIES = [["全量整合三大专题统计数据库（1985–2026年长周期序列、双口径可负担性、8步税负传导模拟、三次产业结构演进、金融风险敞口与官方机构溯源）", "Integrated 3-module longitudinal database (1985–2026 long-cycle series, dual-criteria affordability, 8-step tax incidence simulation, 3-sector industrial evolution, financial risk exposure & official sources)"], ["覆盖 55 个代表性经济体 · 1985–2026 四十年完整年度序列 · 16 张核心统计图表 · 7 张全景诊断表", "55 Representative Economies · 1985–2026 42Y Annual Series · 16 Core Charts · 7 Diagnostic Tables"], ["覆盖 55 个国家与地区 · 2000–2026 历史序列 · 14 张核心统计图表 · 8 张专业税制明细表", "55 Jurisdictions · 2000–2026 Historical Series · 14 Core Charts · 8 Tax Tables"], ["三部门总债务/GDP堆叠对比 · 40年CPI通胀轨迹 · 生育率vs老龄化分化 · 财政可持续性与人口传导表", "3-Sector Debt/GDP Stack · 40Y CPI Trajectory · TFR vs Aging Divergence · Fiscal & Demographic Tables"], ["覆盖 57 个国家与地区 · 1985–2026 四十年周期 · 16 张核心统计图表 · 13 张数据表", "57 Countries & Regions · 1985–2026 40Y Cycle · 16 Core Charts · 13 Data Tables"], ["全球宏观经济综合数据研究平台 — 房地产市场 × 综合税制体系 × 经济发展轨迹 (1985–2026)", "Global Macroeconomic Research Platform — Real Estate × Tax Systems × Economic Trajectory (1985–2026)"], ["核心宏观经济发展指标：1985–2026年名义/实际/PPP经济规模、人均GDP、增长倍数与全球排名跃迁", "Core Macroeconomic Indicators: 1985–2026 Nominal/Real/PPP GDP Scale, GDP per Capita, Multipliers & Global Rank Shifts"], ["5口径40年时间序列 · 全球GDP份额重塑 · 人口与人均产出分解 · 1985vs2026排名跃迁榜", "5-Metric 40Y Time Series · Global GDP Share Reshaping · Pop vs Per-Capita Decomposition · 1985 vs 2026 Rank Table"], ["工资与可支配收入梯度 · GDP向工资转化效率气泡图 · 劳动生产率vs失业率 · 收入与就业两大全景表", "Wage & Disposable Income Gradient · GDP-to-Wage Bubble Chart · Productivity vs Unemployment · Income & Labor Tables"], ["2000–2026宏观税负历史序列 · 55个国家与地区全量税制主数据库 · 权威国际组织与税务署链接", "2000–2026 Tax/GDP Series · 55-Jurisdiction Full Tax Database · OECD/IMF/Tax Authority Links"], ["完整税制数据及统计资料：2000–2026年税收/GDP历史时间序列、55国可核查主表与官方溯源链接", "Full Tax Database & Sources: 2000–2026 Tax/GDP Historical Series, 55-Jurisdiction Verifiable Master Table & Official Links"], ["十项跨国实证统计摘要 · 1985–2026九大全球宏观冲击波 · 15个代表性经济体40年深度案例", "10 Empirical Topic Summaries · 9 Global Macro Shocks (1985–2026) · 15 Country 40Y Deep-Dive Cases"], ["个税法定vs实际税率 · 5档收入税率曲线 · 五险一金全拆解 · 企业税转嫁与7大消费场景税负", "Statutory vs Effective PIT · 5-Tier Tax Curves · Social Security Breakdown · CIT Incidence & 7 Consumption Categories"], ["第三板块：全球经济发展轨迹 — 四十年增长倍数、收入与生产率、产业结构升级、宏观债务与人口转型", "Module III: Global Economic Trajectory — 40Y Growth Multipliers, Income & Productivity, Industrial Upgrading, Macro Debt & Demographics"], ["6类家庭与就业身份对比 · 8步全链路税负传导瀑布图 · 多国购买力留存率对比与55国精算全表", "6 Household Types · 8-Step Tax Incidence Waterfall · Cross-Country Purchasing Power Retention & 55-Jurisdiction Table"], ["各国居民房地产按揭贷款占 GDP 比例变化 (2000 vs 2010 vs 2026, %)", "Residential Mortgage Loans to GDP (2000 vs 2010 vs 2026, %)"], ["房价增长与历史周期：1985–2026年名义/实际房价指数、累计涨幅、年均复合增速与泡沫周期", "House Price Growth & Cycles: 1985–2026 Nominal/Real Indices, Cumulative Growth, CAGR & Bubble Cycles"], ["国家及地区详细数据与补充资料：六维综合评分、十项统计专题摘要、14国历史案例与57国全量主表", "Country Profiles & Full Data: 6-Dim Health Score, 10 Empirical Conclusions, 14 Country Cases & 57-Economy Master Table"], ["经济结构与产业发展：1985–2026三次产业结构演变、制造业占GDP比重与高技术产业竞争力", "Economic Structure & Industrial Upgrading: 1985–2026 3-Sector Evolution, Manufacturing Share of GDP & High-Tech Competitiveness"], ["主选与对照经济体40年产业面积图 · 工业化与去工业化对比 · 支柱产业与结构转型实证诊断表", "Primary vs Benchmark 40Y Sector Area Charts · Industrialization vs Deindustrialization · Pillar Industries Table"], ["财政、金融及宏观经济风险：政府/居民/企业三部门杠杆率、长期通胀轨迹、生育率与人口老龄化冲击", "Fiscal, Financial & Macro Risks: Gov/HH/Corp 3-Sector Leverage, 40Y CPI Trajectory, Fertility & Aging Shocks"], ["历史发展轨迹与国家案例：十项宏观发展实证专题摘要、九大全球历史冲击阶段与15国发展模式案例库", "Historical Trajectory & Country Cases: 10 Core Empirical Questions, 9 Global Historical Shocks & 15 Deep-Dive Country Cases"], ["13维权重实时调节与双经济体雷达图 · 55个经济体综合评价总榜 · 国际统计数据库来源说明", "13-Dim Interactive Weight Sliders & Dual Radar Chart · 55-Economy Master Scorecard · Official Statistical Sources"], ["核心税负 KPI · 六大实证维度摘要 · 劳动税楔与居民综合负担对比 · 核心指标速览表", "Core Tax KPIs · 6 Empirical Dimensions · Labor Tax Wedge & Household Burden · Summary Table"], ["居民收入、劳动生产率和生活水平：平均/中位数工资、人均可支配收入、基尼系数与每小时产出效率", "Household Income, Labor Productivity & Living Standards: Mean/Median Wage, Disposable Income, Gini & Output per Hour"], ["税制组成结构：个人所得税阶梯、雇员与雇主社保缴费、增值税/GST、企业税归宿与财产税矩阵", "Tax Structure Breakdown: PIT Brackets, Employee/Employer SSC, VAT/GST, Corporate Tax Incidence & Property Tax Matrix"], ["完整经济数据及来源：跨国13维度综合经济实力交互式权重模型、55国总榜与权威统计来源说明", "Full Economic Database & Sources: 13-Dim Interactive Weighted Model, 55-Economy Scorecard & Official Sources"], ["第二板块：全球综合税制与税负比较 — 综合税楔、税制结构、税后购买力模拟与跨国税制评估", "Module II: Global Comprehensive Tax Systems — Tax Wedge, Tax Structure, Net Purchasing Power Sim & Evaluation"], ["房地产金融及系统性风险：按揭贷款/GDP、家庭部门杠杆率、土地财政依赖度与银行风险敞口", "Mortgage Finance & Systemic Risks: Mortgage/GDP, Household Leverage, Land Fiscal Reliance & Bank Exposure"], ["工资、税后收入及购买力比较：不同家庭结构可支配收入率与居民综合税负8步全链路精算模拟器", "Wages, Net Income & Purchasing Power: Disposable Income by Family Type & 8-Step Full-Chain Tax Simulator"], ["不同国家及地区的税制差异：多国并排税制档案对比卡、八类税制结构实证特征与五维评价体系", "Cross-Jurisdiction Tax Profiles: Side-by-Side Country Cards, 8 Structural Archetypes & 5-Dim Evaluation"], ["40年实际GDP累计增长倍数 vs 人均实际GDP增长倍数 (Top & 典型对照)", "40Y Real GDP Multiplier vs Real GDP per Capita Multiplier (Top & Benchmark)"], ["劳动年龄人口比例变化 (1985 vs 2026) 与长期潜在GDP增长率 (%)", "Working-Age Population Share (1985 vs 2026) & Potential GDP Growth (%)"], ["按揭与居民债务占GDP演变 · 房价-利率-收入耦合轨迹 · 银行涉房敞口明细表", "Mortgage & HH Debt/GDP Evolution · Price-Rate-Income Coupling · Bank Real Estate Exposure Table"], ["总体综合税负比较：综合劳动税楔、居民全口径税负堆叠、宏观税负趋势与福利再分配效应", "Overall Tax Burden Comparison: Labor Tax Wedge, Full Household Tax Stack, Macro Tax Trends & Welfare Redistribution"], ["多国并排税制制度档案卡 · 八大跨国税制分类特征 · 交互式5维税制评分与聚类表", "Side-by-Side Tax Profile Cards · 8 Tax Archetypes · Interactive 5-Dim Scoring & Clustering Table"], ["各国实际房价增长 vs 居民实际可支配收入增长对比 (2000–2026, %)", "Real House Price Growth vs Real Household Disposable Income Growth (2000–2026, %)"], ["宏观部门总杠杆率分解：政府债务 + 居民债务 + 企业债务 (% of GDP)", "Macro Sector Total Leverage: Gov + Household + Corporate Debt (% of GDP)"], ["第一板块：全球房地产市场 — 住房可负担性、长周期价格走势、租赁供给与金融风险", "Module I: Global Real Estate Market — Affordability, Long-Term Price Trends, Rental Supply & Financial Risks"], ["全球宏观经济综合数据研究平台：房地产市场 × 综合税制体系 × 经济发展轨迹", "Global Macroeconomic Research Platform: Real Estate × Tax Systems × Economic Trajectory"], ["核心房地产指标：房价水平、房价收入比 (PIR)、住房可负担性与置业按揭模拟", "Core Housing Indicators: Price Levels, Price-to-Income Ratio (PIR), Affordability & Mortgage Simulator"], ["各国房价租金比 (Price-to-Rent) 与毛租金回报率 (%) 比较", "Price-to-Rent Ratio (PRR) & Gross Rental Yield (%) Comparison"], ["全球重要国家房地产泡沫、危机爆发与制度转折历史时间轴 (1985–2026)", "Global Housing Bubbles, Crises & Institutional Turning Points Timeline (1985–2026)"], ["经济总量增长 vs 人口增长 vs 人均实际产出分解 (1985–2026)", "Real GDP Growth vs Population Growth vs Real Output per Capita (1985–2026)"], ["2026年总生育率 (TFR) vs 65岁以上老龄化率 (%) 全球分化图", "2026 Total Fertility Rate (TFR) vs 65+ Aging Rate (%) Global Divergence"], ["支持多国叠加对比 · 对数坐标切换 · 16次重大地产泡沫峰值与回撤时间轴", "Multi-Country Overlay · Log Scale Toggle · 16 Major Housing Bubble Peaks & Drawdowns Timeline"], ["租赁市场与住房供给：房价租金比、租金收益率、产权居住结构、人均面积与空置率", "Rental Market & Housing Supply: PRR, Gross Rental Yield, Tenure Structure, Floor Space per Capita & Vacancy"], ["交互式权重评分 · 14国深度历史案例 · 57国全量数据库与统计口径说明", "Interactive Weighted Scoring · 14 Deep-Dive Cases · 57-Economy Master Database & Methodology"], ["各国房价收入比 (PIR) 比较：全国 vs 首都/核心城市 (2026)", "Price-to-Income Ratio (PIR): National Avg vs Capital/Core City (2026)"], ["图表 5：各国与地区综合劳动税楔 (Labor Tax Wedge) 比较", "Chart 5: Comprehensive Labor Tax Wedge Comparison (% Total Labor Cost)"], ["图表 9：不同家庭结构与就业身份下的税后可支配收入率比较 (% 税前收入)", "Chart 9: Net Disposable Income Ratio Across Household & Employment Types (% Gross)"], ["平均工资 vs 中位数工资 vs 人均可支配收入对比 (2026 USD)", "Mean Wage vs Median Wage vs Disposable Income per Capita (2026 USD)"], ["1985–2026 通货膨胀 (CPI %) 长期轨迹与重大通胀/通缩事件", "1985–2026 Long-Term CPI Inflation (%) Trajectory & Major Price Shocks"], ["核心指标总览 · 全国与首都房价对标 · 房价收入比 · 按揭负担模拟器", "Core KPIs · National vs Capital Prices · PIR · Mortgage Simulator"], ["租售比与毛租金回报率 · 自有率与社会住宅比例 · 套户比与城镇化匹配表", "PRR & Rental Yield · Homeownership & Social Housing · Dwelling-to-HH & Urbanization Table"], ["各国名义住宅价格指数长期趋势 (1985–2026, 2010=100)", "Long-Term Nominal Residential Property Price Index (1985–2026, 2010=100)"], ["四大洲及发达/新兴经济体全球GDP份额演变 (1985 vs 2026)", "Global GDP Share Evolution by Region & Income Group (1985 vs 2026)"], ["图表 1：各国与地区个人所得税最高法定边际税率 vs 平均工资实际税率", "Chart 1: Top Statutory Marginal PIT Rate vs 100% AW Effective PIT Rate"], ["图表 4：VAT/GST/销售税标准税率 vs 居民消费实际有效税负率", "Chart 4: Standard VAT/GST Rate vs Household Effective Consumption Tax Rate"], ["图表 6：税收收入占 GDP 比例历史变化趋势 (2000–2026)", "Chart 6: Tax-to-GDP Ratio Historical Trajectory (2000–2026)"], ["各国实际住宅价格指数长期趋势 (剔除CPI通胀, 2010=100)", "Long-Term Real Residential Property Price Index (CPI-Deflated, 2010=100)"], ["各国居民部门总债务占 GDP 比例变化 (2000–2026, %)", "Household Sector Total Debt to GDP (2000–2026, %)"], ["同假设下多国/地区“综合总税楔 vs 最终实际购买力留存率”横向对比", "Cross-Jurisdiction Total Tax Wedge vs Net Purchasing Power Retention"], ["40年实际GDP年均增速 vs 实际工资年均增速 & 基尼系数气泡图", "40Y Real GDP CAGR vs Real Wage CAGR & Gini Coefficient Bubble Chart"], ["各国房价、按揭利率与居民收入的长期关联趋势 (1985–2026)", "Long-Term Coupling of House Prices, Mortgage Rates & Household Income (1985–2026)"], ["图表 3：雇员与雇主社会保障及强制性缴费比例比较 (% 税前工资)", "Chart 3: Employee & Employer Social Security & Mandatory Contributions (% Gross Wage)"], ["图表 10：各国宏观税负与公共社会福利支出及基尼系数再分配效应关系", "Chart 10: Tax-to-GDP vs Public Social Spending & Gini Redistribution Effect"], ["各国住宅/房地产投资占 GDP 比例变化与财政土地依赖度 (%)", "Real Estate Investment to GDP & Land Fiscal Reliance (%)"], ["各国住房可负担性与房地产市场健康度综合评分对比 (0–100分)", "Housing Affordability & Market Health Composite Score (0–100)"], ["图表 2：不同收入水平下的个人实际所得税率比较 (5档收入曲线)", "Chart 2: Effective PIT Rate Across 5 Income Tiers (50%–300% AW)"], ["图表 8：个人所得税、社保缴费、消费间接税的居民综合负担堆叠对比", "Chart 8: Full Household Burden Stack (PIT + SSC + Indirect Consumption Tax)"], ["工业化、去工业化与高技术制造竞争力 (1985 vs 2026)", "Industrialization, Deindustrialization & High-Tech Manufacturing (1985 vs 2026)"], ["中国大陆 · 中国台湾 · 中国香港 · 中国澳门独立统计实体", "Mainland China · Taiwan · Hong Kong · Macau Independent Statistical Entities"], ["各国住宅价格年均复合增长率 (CAGR) 比较 (% / 年)", "House Price Compound Annual Growth Rate (CAGR, % / Year)"], ["各国租金收入比、按揭月供收入比与住房支出占可支配收入比 (%)", "Rent-to-Income, Mortgage-to-Income & Total Housing Cost Share (%)"], ["各国人均住房面积 (㎡/人) 与户均居住面积 (㎡/户) 比较", "Floor Space per Capita (sqm/person) & per Household (sqm/HH)"], ["每小时劳动生产率 (USD PPP) vs 失业率与青年失业率", "Labor Productivity per Hour (USD PPP) vs Unemployment & Youth Unemployment"], ["跨国13维度综合经济实力与发展质量评价体系 (交互式权重模型)", "13-Dimension Economic Strength & Growth Quality Evaluation (Interactive Weights)"], ["同步检索国家/地区 (如: 台湾 / 日本 / 德国)...", "Sync search country/region (e.g. Taiwan / Japan / Germany)..."], ["输入国家或地区名称 (如: 台湾 / 德国 / 智利)...", "Search jurisdiction (e.g. Taiwan / Germany / Chile)..."], ["第一板块 · 第二层 (Priority Layer 2)", "Module I · Priority Layer 2"], ["第一板块 · 第三层 (Priority Layer 3)", "Module I · Priority Layer 3"], ["第一板块 · 第四层 (Priority Layer 4)", "Module I · Priority Layer 4"], ["第一板块 · 第五层 (Priority Layer 5)", "Module I · Priority Layer 5"], ["第二板块 · 第一层 (Priority Layer 1)", "Module II · Priority Layer 1"], ["第二板块 · 第二层 (Priority Layer 2)", "Module II · Priority Layer 2"], ["第二板块 · 第三层 (Priority Layer 3)", "Module II · Priority Layer 3"], ["第二板块 · 第四层 (Priority Layer 4)", "Module II · Priority Layer 4"], ["第二板块 · 第五层 (Priority Layer 5)", "Module II · Priority Layer 5"], ["第三板块 · 第一层 (Priority Layer 1)", "Module III · Priority Layer 1"], ["第三板块 · 第二层 (Priority Layer 2)", "Module III · Priority Layer 2"], ["第三板块 · 第三层 (Priority Layer 3)", "Module III · Priority Layer 3"], ["第三板块 · 第四层 (Priority Layer 4)", "Module III · Priority Layer 4"], ["第三板块 · 第五层 (Priority Layer 5)", "Module III · Priority Layer 5"], ["第三板块 · 第六层 (Priority Layer 6)", "Module III · Priority Layer 6"], ["主研究对象 · 1985–2026 三大产业结构堆叠面积图", "Primary Economy · 1985–2026 3-Sector GDP Share Stacked Area"], ["对标经济体 · 1985–2026 三大产业结构堆叠面积图", "Benchmark Economy · 1985–2026 3-Sector GDP Share Stacked Area"], ["第二板块：全球综合税制与税负比较 (55国 · 14图)", "Module II: Global Tax Systems (55 Jurisdictions · 14 Charts)"], ["1985–2026 长期经济增长轨迹与多口径时间序列对比", "1985–2026 Long-Term Economic Trajectory & Multi-Metric Time Series"], ["各国多阶段房价累计涨幅对比 (实际 vs 名义, %)", "Multi-Period Cumulative House Price Growth (Real vs Nominal, %)"], ["图表 7：各国与地区宏观税收结构堆叠图 (% GDP)", "Chart 7: Macroeconomic Tax Revenue Structure Stack (% GDP)"], ["就业结构（制造业 vs 服务业就业占比）与人均产出关系", "Employment Structure (Manufacturing vs Services Share) & Output per Worker"], ["46 个交互式统计图表 · 20+ 核心数据明细表", "46 Interactive Statistical Charts · 20+ Core Data Tables"], ["第三板块：全球经济发展轨迹 (55国 · 16图)", "Module III: Economic Trajectory (55 Economies · 16 Charts)"], ["第一板块：全球房地产市场 (57国 · 16图)", "Module I: Global Real Estate (57 Economies · 16 Charts)"], ["三大研究板块 · 57/55 国家及地区全样本", "3 Research Modules · 57/55 Countries & Jurisdictions Full Sample"], ["在全量数据库中搜索国家、税种或规则关键词...", "Search country, tax type, or rule keywords in full DB..."], ["中高收入家庭 (P75, 中位收入145%)", "Upper-Middle HH (P75, 145% Median)"], ["(个税+雇员社保+雇主社保) ÷ 总用工成本", "(PIT + Employee SSC + Employer SSC) ÷ Total Labor Cost"], ["区间：阿联酋 6.5% 至 丹麦 45.2%", "Range: UAE 6.5% to Denmark 45.2%"], ["各国住房自有率与租房人口比例结构比较 (%)", "Homeownership Rate vs Tenant Population Share (%)"], ["2000–2026 (新世纪金融化26年)", "2000–2026 (21st Century 26Y)"], ["2021–2026 (近5年高利率转换期)", "2021–2026 (Last 5Y High-Rate Shift)"], ["高收入精英家庭 (P90, 210%基准)", "High-Income HH (P90, 210% Base)"], ["高收入家庭 (P90, 中位收入210%)", "High-Income HH (P90, 210% Median)"], ["企业税负结构与经济归宿（税负转嫁）实证分析", "Corporate Tax Burden & Economic Incidence (Labor / Consumer / Capital)"], ["1990–2026 (泡沫破灭后36年)", "1990–2026 (Post-1990 Bubble 36Y)"], ["2010–2026 (次贷危机后16年)", "2010–2026 (Post-GFC 16Y)"], ["中位标准家庭 (P50, 100%基准)", "Median HH (P50, 100% Median)"], ["中高收入家庭 (P75, 145%基准)", "Upper-Middle HH (P75, 145% Base)"], ["低收入家庭 (P25, 中位收入55%)", "Low-Income HH (P25, 55% Median)"], ["标准VAT/GST vs 实际消费税负率", "Standard VAT/GST vs Effective Consumption Tax Rate"], ["第二层：居民收入、劳动生产率与生活水平", "Layer 2: Income, Productivity & Living Standards"], ["40年实际房价涨幅最高 (发达/新兴)", "Top 40Y Real House Price Growth (Adv / Emg)"], ["7大日常消费场景的实际间接税负热力对比", "Effective Indirect Tax Rates Across 7 Daily Consumption Categories"], ["导出当前筛选57国完整数据 (CSV)", "Export 57-Economy Full CSV"], ["第三板块 · SECTION III", "MODULE III · SECTION III"], ["1985–2026 (41年全周期)", "1985–2026 (41Y Full Cycle)"], ["2016–2026 (近10年周期)", "2016–2026 (Last 10Y Cycle)"], ["低收入家庭 (P25, 55%基准)", "Low-Income HH (P25, 55% Base)"], ["个税最高法定 vs 平均工资实际税率", "Top Statutory PIT vs 100% AW Effective Rate"], ["食品/房租/医疗豁免与储蓄倾向折算后", "Adjusted for food/rent/healthcare exemptions & MPC"], ["主选国家8步税负传导与购买力留存分解", "Selected Jurisdiction 8-Step Tax Incidence & Purchasing Power Waterfall"], ["第二板块 · SECTION II", "MODULE II · SECTION II"], ["第三层：工资、税后收入与购买力模拟", "Layer 3: Wages & Net Purchasing Power Sim"], ["中国大陆、台湾、香港、澳门独立统计", "Mainland China, Taiwan, HK & Macau Tracked Independently"], ["平均宏观税负 (税收收入/GDP)", "Average Macro Tax Burden (Tax / GDP)"], ["第一板块 · SECTION I", "MODULE I · SECTION I"], ["第四层：财政、金融及宏观经济风险", "Layer 4: Fiscal, Financial & Demographic Risks"], ["第四层：房地产金融与系统性风险", "Layer 4: Mortgage & Systemic Risk"], ["第四层：不同国家及地区税制差异", "Layer 4: Cross-Country Tax Profiles"], ["第五层：完整税制数据及统计资料", "Layer 5: Full Tax Database & Sources"], ["第五层：历史发展轨迹与国家案例", "Layer 5: Historical Shocks & 15 Country Cases"], ["搜索国家/地区名称或代码...", "Search economy name or ISO code..."], ["独立按揭超负荷/宜租房或保障房", "Mortgage Overburden / Rent or Public Housing Advised"], ["法定最高税率比普通人实际税率高", "Top statutory rate exceeds 100% AW effective rate by"], ["导出 55 国完整税制 CSV", "Export 55-Jurisdiction Tax CSV"], ["展开/收起16大历史事件数据表", "Toggle 16 Historical Bubble Events Table"], ["第五层：完整数据表与国家案例", "Layer 5: Full Database & Cases"], ["第一层：核心宏观经济发展指标", "Layer 1: Core Macro Indicators"], ["新兴与发展中经济体 (30)", "Emerging & Developing (30)"], ["实际房价 (剔除CPI通胀)", "Real Price (CPI-Deflated)"], ["名义房价 (本币未剔除通胀)", "Nominal Price (Local Currency)"], ["全球住房可负担性最严峻经济体", "Most Severely Unaffordable Housing Markets"], ["导出 8 步模拟测算 CSV", "Export 8-Step Sim CSV"], ["2.3 8步税后购买力模拟", "2.3 8-Step Net Income Sim"], ["3.6 13维经济实力总榜", "3.6 13-Dim Scorecard"], ["第二层：房价增长与历史周期", "Layer 2: Price Growth & Cycles"], ["第三层：租赁市场与住房供给", "Layer 3: Rental & Housing Supply"], ["第三层：经济结构与产业发展", "Layer 3: Industrial Structure & Upgrading"], ["第六层：完整经济数据及来源", "Layer 6: 13-Dim Scorecard & Full Sources"], ["输入国家/地区/首都...", "Search country / region / capital..."], ["低税率·自由港/个人账户型", "Low-Tax · Free Port / Individual Account"], ["间接税主导·发展中转型税制", "Indirect-Tax Dominant · Developing Transition"], ["13. 人口结构与长期潜力", "13. Demographics & Long-Term Potential"], ["展开/收起57国完整评分表", "Toggle 57-Economy Full Scoring Table"], ["OECD 狭义政府社保口径", "OECD Narrow SSC Basis"], ["新加坡核心区 (CCR)", "Singapore CCR"], ["马尼拉大都会 (NCR)", "Metro Manila (NCR)"], ["跨国统计口径与方法论总览", "Methodology & Statistical Standards"], ["3.1 40年GDP轨迹", "3.1 40Y GDP Trajectory"], ["第一层：总体综合税负比较", "Layer 1: Overall Tax Burden"], ["1985–2026 实际", "1985–2026 Real"], ["极度困难 (需代际支持)", "Extremely Difficult (Intergenerational Support Needed)"], ["13.人口结构与长期潜力", "13. Demographic Potential"], ["重置为两岸四地+美德日新", "Reset to Greater China + US/DE/JP/SG"], ["其他中央区 (RCR)", "RCR"], ["1.1 核心房价与负担", "1.1 Prices & Affordability"], ["第一层：核心房地产指标", "Layer 1: Core Housing Indicators"], ["新兴与发展中 (30)", "Emerging & Developing (30)"], ["房价租金偏离度最高市场", "Highest Price-to-Rent Deviation Markets"], ["当前筛选覆盖司法管辖区", "Filtered Tax Jurisdictions"], ["高税负·高福利再分配型", "High-Tax · High-Welfare Redistributive"], ["强累进·中低收入保护型", "Highly Progressive · Low-Income Protective"], ["3. 长期实际经济增长", "3. Long-Term Real Growth"], ["4. 居民实际收入增长", "4. Real Household Income Growth"], ["10. 宏观经济稳定性", "10. Macroeconomic Stability"], ["跳转至对应实证图表模块", "Jump to Empirical Chart Section"], ["1.2 历史房价周期", "1.2 Historical Cycles"], ["1.4 地产金融风险", "1.4 Financial Risks"], ["2.1 综合税负总览", "2.1 Tax Burden Overview"], ["3.2 收入与生产率", "3.2 Income & Productivity"], ["第二层：税制组成结构", "Layer 2: Tax System Structure"], ["发达经济体 (25)", "Advanced Economies (25)"], ["家庭部门高杠杆预警区", "High Household Debt Leverage Warning Zone"], ["7. 高技术产业发展", "7. High-Tech Industry"], ["9. 收入分配均衡度", "9. Income Distribution Equity"], ["11. 财政可持续性", "11. Fiscal Sustainability"], ["3.长期实际经济增长", "3. Long-Term Real Growth"], ["4.居民实际收入增长", "4. Real Income Growth"], ["10.宏观经济稳定性", "10. Macro Stability"], ["展开/收起对应数据表", "Toggle Data Table"], ["恢复该国默认制度参数", "Reset Default Country Parameters"], ["均衡综合权重(默认)", "Balanced Default Weights"], ["科技升级与竞争力优先", "Tech Upgrading & Competitiveness Priority"], ["实际购买力与企业活力", "Purchasing Power & Business Dynamism"], ["澳大利亚 (参照)", "Australia (Ref)"], ["邻里区 (OCR)", "OCR"], ["新德里 (NCR)", "New Delhi (NCR)"], ["三大纵向研究板块:", "3 Research Modules:"], ["全球全部 (55)", "All Global (55)"], ["大洋洲参照 (2)", "Oceania Ref (2)"], ["房价收入比 PIR", "Price-to-Income PIR"], ["房价租金比 PRR", "Price-to-Rent PRR"], ["需缩减面积或加首付", "Downsize or Higher Down Payment Needed"], ["新兴与发展中经济体", "Emerging & Developing Economies"], ["2. 人均经济产出", "2. GDP per Capita"], ["6. 产业升级能力", "6. Industrial Upgrading"], ["12. 国际竞争力", "12. International Competitiveness"], ["7.高技术产业发展", "7. High-Tech Industry"], ["11.财政可持续性", "11. Fiscal Sustainability"], ["民生与增长质量优先", "Living Standards & Quality Priority"], ["实际人均GDP增长", "Real GDP/Capita Growth"], ["州与地方零售销售税", "State & Local Retail Sales Tax"], ["联邦与省复合消费税", "Federal & Provincial GST/HST/PST"], ["新西兰 (参照)", "New Zealand (Ref)"], ["阿拉伯联合酋长国", "UAE"], ["东京 (23区)", "Tokyo (23 Wards)"], ["居民债务/GDP", "HH Debt / GDP"], ["平均综合劳动税楔", "Average Labor Tax Wedge"], ["5. 劳动生产率", "5. Labor Productivity"], ["2.人均经济产出", "2. GDP per Capita"], ["6.产业升级能力", "6. Industrial Upgrading"], ["12.国际竞争力", "12. Competitiveness"], ["潜在GDP增长率", "Potential GDP Growth"], ["最高法定边际税率", "Top Statutory Marginal Rate"], ["国际货币基金组织", "IMF"], ["主要代表性经济体", "Representative Economies"], ["代表性国家与地区", "Representative Countries & Regions"], ["导出55国CSV", "Export 55-Econ CSV"], ["恢复基准学术权重", "Reset Academic Weights"], ["宏观财政稳健优先", "Macro & Fiscal Stability Priority"], ["广义强制负担口径", "Broad Mandatory Burden"], ["税制模式分类标签", "Tax Regime Cluster"], ["无增值税/销售税", "No VAT / Sales Tax"], ["克卢日-纳波卡", "Cluj-Napoca"], ["布宜诺斯艾利斯", "Buenos Aires"], ["西亚/横跨欧亚", "Eurasia / Middle East"], ["中东欧/东南欧", "CEE / SE Europe"], ["全部 (57)", "All (57)"], ["全部 (55)", "All (55)"], ["亚洲 (19)", "Asia (19)"], ["欧洲 (20)", "Europe (20)"], ["均衡温和型税制", "Balanced Moderate Tax Regime"], ["联邦/准联邦制", "Federal / Quasi-Federal"], ["1. 经济规模", "1. Economic Scale"], ["8. 就业质量", "8. Employment Quality"], ["5.劳动生产率", "5. Labor Productivity"], ["居民可支配收入", "Household Disposable Income"], ["人均可支配收入", "Disposable Income per Capita"], ["年均复合增长率", "CAGR"], ["雇主总用工成本", "Total Employer Labor Cost"], ["税后可支配收入", "Net Disposable Income"], ["非金融企业债务", "Non-Financial Corporate Debt"], ["资产负债表衰退", "Balance Sheet Recession"], ["差饷物业估价署", "Rating and Valuation Dept (RVD)"], ["双职工无孩家庭", "Dual-Earner No-Child HH"], ["自动归一化计算", "Auto-Normalized"], ["最终真实购买力", "Final Real Purchasing Power"], ["已公布实际数据", "Published Actual Data"], ["预测/估算数据", "Forecast / Est. Data"], ["40年实际增长", "40Y Real Growth"], ["实际GDP总量", "Real GDP Total"], ["税制累进性得分", "Progressivity Score"], ["公共福利匹配度", "Welfare Return Match"], ["可负担性加权分", "Affordability Score"], ["租售均衡加权分", "Rent-Price Score"], ["住房供给加权分", "Supply & Space Score"], ["金融稳健加权分", "Financial Stability Score"], ["周期平稳加权分", "Cycle Smoothness Score"], ["收入同步加权分", "Income Alignment Score"], ["官方中位数口径", "Official Median Dwelling Basis"], ["亚的斯亚贝巴", "Addis Ababa"], ["全平台检索:", "Global Search:"], ["美洲 (8)", "Americas (8)"], ["非洲 (8)", "Africa (8)"], ["中等偏紧压力", "Moderate Affordability Pressure"], ["沉重购房负担", "Heavy Mortgage Burden"], ["独立购房可行", "Feasible Independently"], ["个国家/地区", "Jurisdictions"], ["广义含公积金", "Broad incl. Provident Funds"], ["OECD狭义", "OECD Narrow Standard"], ["S (顶尖)", "S (Top Tier)"], ["A (优秀)", "A (Excellent)"], ["B (良好)", "B (Good)"], ["D (脆弱)", "D (Vulnerable)"], ["1.经济规模", "1. Economic Scale"], ["8.就业质量", "8. Employment Quality"], ["9.收入分配", "9. Income Equity"], ["综合税制体系", "Comprehensive Tax System"], ["经济发展轨迹", "Economic Trajectory"], ["住房可负担性", "Housing Affordability"], ["毛租金回报率", "Gross Rental Yield"], ["按揭贷款利率", "Mortgage Rate"], ["全要素生产率", "Total Factor Productivity (TFP)"], ["住宅价格指数", "Residential Property Price Index"], ["综合劳动税楔", "Labor Tax Wedge"], ["实际有效税率", "Effective Tax Rate"], ["社会福利支出", "Social Welfare Expenditure"], ["公共社会福利", "Public Social Welfare"], ["税前劳动收入", "Gross Labor Income"], ["高技术制成品", "High-Tech Manufactures"], ["亚洲金融危机", "Asian Financial Crisis"], ["统计暨普查局", "DSEC"], ["国际清算银行", "BIS"], ["主要经济城市", "Major Economic City"], ["必选核心案例", "Core Case"], ["代表性经济体", "Representative Economies"], ["权重点数总和", "Total Weight Points"], ["二手存量住宅", "Existing Dwellings"], ["地理大洲筛选", "Continent Filter"], ["图表排序方式", "Chart Sort Order"], ["雇员广义合计", "Emp Broad Total"], ["雇主广义合计", "Er Broad Total"], ["购买力留存率", "Purchasing Power Retention"], ["初步统计数据", "Preliminary Data"], ["PPP人均比", "PPP per Capita Ratio"], ["直接税轻便度", "Direct Tax Lightness"], ["消费税亲贫度", "Consumption Tax Pro-Poor"], ["加值型营业税", "Value-Added Business Tax"], ["商品及服务税", "Goods & Services Tax"], ["建筑面积口径", "Gross Floor Area Basis"], ["实用面积口径", "Saleable Area Basis"], ["国际公寓口径", "Intl 90sqm Apartment Basis"], ["独立统计实体", "Independent Statistical Entities"], ["印度尼西亚", "Indonesia"], ["沙特阿拉伯", "Saudi Arabia"], ["阿尔及利亚", "Algeria"], ["埃塞俄比亚", "Ethiopia"], ["新界核心区", "New Territories Core"], ["路氹填海区", "Cotai"], ["东京23区", "Tokyo 23 Wards"], ["伊斯坦布尔", "Istanbul"], ["比勒陀利亚", "Pretoria"], ["约翰内斯堡", "Johannesburg"], ["新行政首都", "New Admin Capital"], ["维多利亚岛", "Victoria Island"], ["卡萨布兰卡", "Casablanca"], ["阿姆斯特丹", "Amsterdam"], ["斯德哥尔摩", "Stockholm"], ["塞萨洛尼基", "Thessaloniki"], ["弗罗茨瓦夫", "Wroclaw"], ["布加勒斯特", "Bucharest"], ["蒂米什瓦拉", "Timisoara"], ["华盛顿特区", "Washington D.C."], ["瓜达拉哈拉", "Guadalajara"], ["里约热内卢", "Rio de Janeiro"], ["瓦尔帕莱索", "Valparaiso"], ["康塞普西翁", "Concepcion"], ["西亚/中东", "Middle East"], ["中欧/西欧", "Central / Western Europe"], ["西欧/中欧", "Western / Central Europe"], ["西欧/北欧", "Western / Northern Europe"], ["拉美/北美", "Latin / North America"], ["拉美/南美", "South America"], ["快速定位:", "Quick Jump:"], ["区域筛选:", "Region Filter:"], ["价格口径:", "Price Basis:"], ["分析周期:", "Period Window:"], ["轻松可负担", "Easily Affordable"], ["发达经济体", "Advanced Economies"], ["5.生产率", "5.Prod"], ["10.稳定", "10.Stab"], ["11.财政", "11.Fiscal"], ["12.竞争", "12.Comp"], ["13.人口", "13.Demo"], ["房地产市场", "Real Estate Market"], ["房价收入比", "Price-to-Income Ratio (PIR)"], ["房价租金比", "Price-to-Rent Ratio (PRR)"], ["租金回报率", "Rental Yield"], ["月供收入比", "Mortgage-to-Income Ratio"], ["租金收入比", "Rent-to-Income Ratio"], ["住房自有率", "Homeownership Rate"], ["总和生育率", "Total Fertility Rate (TFR)"], ["不良贷款率", "NPL Ratio"], ["可支配收入", "Disposable Income"], ["中位数工资", "Median Wage"], ["劳动生产率", "Labor Productivity"], ["劳动参与率", "Labor Force Participation Rate"], ["青年失业率", "Youth Unemployment Rate"], ["购买力平价", "Purchasing Power Parity (PPP)"], ["名义GDP", "Nominal GDP"], ["实际GDP", "Real GDP"], ["人均GDP", "GDP per Capita"], ["个人所得税", "Personal Income Tax (PIT)"], ["企业所得税", "Corporate Income Tax (CIT)"], ["住房公积金", "Housing Provident Fund"], ["中央公积金", "CPF"], ["总用工成本", "Total Labor Cost"], ["实际购买力", "Real Purchasing Power"], ["真实购买力", "Real Purchasing Power"], ["消费间接税", "Consumption Indirect Tax"], ["资本利得税", "Capital Gains Tax (CGT)"], ["高技术产业", "High-Tech Industry"], ["新能源汽车", "New Energy Vehicles (NEV)"], ["新建商品房", "New Commercial Housing"], ["二手存量房", "Existing Housing"], ["集合式公寓", "Multi-Family Apartment"], ["已公布实际", "Published Actual"], ["预测/估算", "Forecast / Est."], ["国家统计局", "National Bureau of Statistics (NBS)"], ["双职工家庭", "Dual-Earner HH"], ["有2孩家庭", "Married 2-Child HH"], ["有子女家庭", "Family with Children"], ["高收入雇员", "High-Income Employee"], ["国家与地区", "Countries & Regions"], ["国家或地区", "Country / Region"], ["国家/地区", "Country / Region"], ["司法管辖区", "Jurisdictions"], ["交换主客体", "Swap Primary & Benchmark"], ["主研究对象", "Primary Economy"], ["对标经济体", "Benchmark Economy"], ["权威数据源", "Official Source"], ["必做核心图", "Core Chart"], ["工伤/生育", "Injury/Maternity"], ["税后可支配", "Net Disposable"], ["名义规模比", "Nominal Scale Ratio"], ["服务业就业", "Services Emp"], ["制造业就业", "Manufacturing Emp"], ["一般销售税", "General Sales Tax"], ["中国大陆", "Mainland China"], ["中国台湾", "Taiwan"], ["中国香港", "Hong Kong"], ["中国澳门", "Macau"], ["马来西亚", "Malaysia"], ["巴基斯坦", "Pakistan"], ["孟加拉国", "Bangladesh"], ["尼日利亚", "Nigeria"], ["罗马尼亚", "Romania"], ["哥伦比亚", "Colombia"], ["澳大利亚", "Australia"], ["澳门半岛", "Macau Peninsula"], ["班加罗尔", "Bengaluru"], ["胡志明市", "Ho Chi Minh City"], ["伊斯兰堡", "Islamabad"], ["阿布扎比", "Abu Dhabi"], ["安塔利亚", "Antalya"], ["耶路撒冷", "Jerusalem"], ["特拉维夫", "Tel Aviv"], ["亚历山大", "Alexandria"], ["马拉喀什", "Marrakech"], ["阿尔及尔", "Algiers"], ["君士坦丁", "Constantine"], ["德雷达瓦", "Dire Dawa"], ["法兰克福", "Frankfurt"], ["曼彻斯特", "Manchester"], ["佛罗伦萨", "Florence"], ["巴塞罗那", "Barcelona"], ["瓦伦西亚", "Valencia"], ["乌得勒支", "Utrecht"], ["布鲁塞尔", "Brussels"], ["安特卫普", "Antwerp"], ["萨尔茨堡", "Salzburg"], ["斯塔万格", "Stavanger"], ["哥本哈根", "Copenhagen"], ["赫尔辛基", "Helsinki"], ["阿尔加维", "Algarve"], ["克拉科夫", "Krakow"], ["布达佩斯", "Budapest"], ["德布勒森", "Debrecen"], ["蒙特利尔", "Montreal"], ["墨西哥城", "Mexico City"], ["巴西利亚", "Brasilia"], ["科尔多瓦", "Cordoba"], ["罗萨里奥", "Rosario"], ["圣地亚哥", "Santiago"], ["阿雷基帕", "Arequipa"], ["布里斯班", "Brisbane"], ["南部非洲", "Southern Africa"], ["个百分点", "percentage points"], ["1.规模", "1.Scale"], ["2.人均", "2.PerCap"], ["3.增长", "3.Growth"], ["4.收入", "4.Income"], ["6.升级", "6.Upgr"], ["7.高技", "7.HiTech"], ["8.就业", "8.Jobs"], ["9.分配", "9.Equity"], ["综合税制", "Comprehensive Tax System"], ["宏观经济", "Macroeconomic"], ["可负担性", "Affordability"], ["按揭利率", "Mortgage Rate"], ["按揭贷款", "Mortgage Loan"], ["按揭月供", "Monthly Mortgage Payment"], ["城镇化率", "Urbanization Rate"], ["老龄化率", "Aging Rate (65+)"], ["净移民率", "Net Migration Rate"], ["平均工资", "Mean Wage"], ["基尼系数", "Gini Coefficient"], ["基尼改善", "Gini Reduction"], ["潜在增速", "Potential Growth"], ["累计涨幅", "Cumulative Growth"], ["实际房价", "Real House Price"], ["名义房价", "Nominal House Price"], ["房价指数", "House Price Index"], ["社会保障", "Social Security"], ["社会保险", "Social Insurance"], ["五险一金", "Social Insurance & Housing Fund"], ["雇员社保", "Employee SSC"], ["雇主社保", "Employer SSC"], ["劳动税楔", "Labor Tax Wedge"], ["有效税率", "Effective Tax Rate"], ["标准税率", "Standard Rate"], ["宏观税负", "Macro Tax Burden"], ["税前工资", "Gross Wage"], ["净财富税", "Net Wealth Tax"], ["土地财政", "Land Finance"], ["地方财政", "Local Fiscal Revenue"], ["政府债务", "Government Debt"], ["居民债务", "Household Debt"], ["家庭债务", "Household Debt"], ["企业债务", "Corporate Debt"], ["外汇储备", "FX Reserves"], ["经常账户", "Current Account"], ["财政赤字", "Fiscal Deficit"], ["财政差额", "Fiscal Balance"], ["第一产业", "Primary Sector (Agri)"], ["第二产业", "Secondary Sector (Industry)"], ["第三产业", "Tertiary Sector (Services)"], ["三次产业", "Three-Sector"], ["三大产业", "Three Sectors"], ["晶圆代工", "Foundry"], ["生物医药", "Biopharma"], ["人工智能", "AI"], ["数字经济", "Digital Economy"], ["电子商务", "E-Commerce"], ["次贷危机", "Subprime Mortgage Crisis"], ["欧债危机", "European Sovereign Debt Crisis"], ["广场协议", "Plaza Accord"], ["泡沫破灭", "Bubble Burst"], ["泡沫破裂", "Bubble Burst"], ["通货膨胀", "Inflation"], ["量化宽松", "Quantitative Easing (QE)"], ["固定利率", "Fixed Rate"], ["浮动利率", "Floating Rate"], ["首付比例", "Down Payment Ratio"], ["贷款期限", "Loan Term"], ["等额本息", "Equal Principal & Interest"], ["建筑面积", "Gross Floor Area (GFA)"], ["实用面积", "Saleable Area"], ["套内面积", "Internal Floor Area"], ["人均面积", "Floor Area per Capita"], ["户均面积", "Floor Area per Household"], ["独栋住宅", "Single-Family"], ["政府组屋", "HDB Public Housing"], ["公营房屋", "Public Housing"], ["初步统计", "Preliminary"], ["数据缺失", "Data Missing"], ["早期缺失", "Early Series Missing"], ["完整序列", "Complete Series"], ["主计总处", "DGBAS"], ["世界银行", "World Bank"], ["单身雇员", "Single Employee"], ["自雇人士", "Self-Employed"], ["中低收入", "Lower-Middle Income"], ["中等收入", "Middle Income"], ["中高收入", "Upper-Middle Income"], ["从高到低", "High to Low"], ["从低到高", "Low to High"], ["核心城市", "Core City"], ["一线城市", "Tier-1 Cities"], ["实证专题", "Empirical Study"], ["核心结论", "Key Takeaway"], ["核心教训", "Core Lesson"], ["历史阶段", "Historical Stage"], ["全部展开", "Expand All"], ["全部收起", "Collapse All"], ["加权总分", "Weighted Score"], ["综合得分", "Composite Score"], ["综合评分", "Composite Score"], ["综合排名", "Overall Rank"], ["数据来源", "Data Source"], ["第一板块", "Module I"], ["第二板块", "Module II"], ["第三板块", "Module III"], ["综合住宅", "All Dwellings"], ["新建住宅", "New Dwellings"], ["公寓市场", "Apartments"], ["对数坐标", "Log Scale"], ["统一基期", "Base Year"], ["细分市场", "Submarket"], ["排序指标", "Sort By"], ["普通食品", "Basic Food"], ["住房水电", "Housing & Utilities"], ["交通燃油", "Transport & Fuel"], ["医疗健康", "Healthcare"], ["教育服务", "Education"], ["餐饮娱乐", "Dining & Leisure"], ["雇员养老", "Emp Pension"], ["雇主养老", "Er Pension"], ["雇员医疗", "Emp Health"], ["雇主医疗", "Er Health"], ["雇员失业", "Emp Unemp"], ["雇主失业", "Er Unemp"], ["人均实际", "Real per Capita"], ["人口增长", "Pop Growth"], ["劳均产出", "Output/Worker"], ["不含社保", "Excl. SSC"], ["含公积金", "Incl. Provident Fund"], ["独立统计", "Tracked Independently"], ["新加坡", "Singapore"], ["菲律宾", "Philippines"], ["阿联酋", "UAE"], ["土耳其", "Turkey"], ["以色列", "Israel"], ["肯尼亚", "Kenya"], ["摩洛哥", "Morocco"], ["意大利", "Italy"], ["西班牙", "Spain"], ["比利时", "Belgium"], ["奥地利", "Austria"], ["爱尔兰", "Ireland"], ["葡萄牙", "Portugal"], ["匈牙利", "Hungary"], ["加拿大", "Canada"], ["墨西哥", "Mexico"], ["阿根廷", "Argentina"], ["新西兰", "New Zealand"], ["孟加拉", "Bangladesh"], ["俄罗斯", "Russia"], ["乌克兰", "Ukraine"], ["台北市", "Taipei"], ["新北市", "New Taipei"], ["台中市", "Taichung"], ["高雄市", "Kaohsiung"], ["香港岛", "HK Island"], ["东京圈", "Greater Tokyo"], ["名古屋", "Nagoya"], ["京畿道", "Gyeonggi"], ["新德里", "New Delhi"], ["雅加达", "Jakarta"], ["巴厘岛", "Bali"], ["吉隆坡", "Kuala Lumpur"], ["芭提雅", "Pattaya"], ["马尼拉", "Manila"], ["卡拉奇", "Karachi"], ["拉合尔", "Lahore"], ["吉大港", "Chittagong"], ["利雅得", "Riyadh"], ["安卡拉", "Ankara"], ["开普敦", "Cape Town"], ["北海岸", "North Coast"], ["阿布贾", "Abuja"], ["拉各斯", "Lagos"], ["内罗毕", "Nairobi"], ["蒙巴萨", "Mombasa"], ["拉巴特", "Rabat"], ["阿克拉", "Accra"], ["库马西", "Kumasi"], ["慕尼黑", "Munich"], ["爱丁堡", "Edinburgh"], ["伯明翰", "Birmingham"], ["马德里", "Madrid"], ["鹿特丹", "Rotterdam"], ["伯尔尼", "Bern"], ["苏黎世", "Zurich"], ["日内瓦", "Geneva"], ["维也纳", "Vienna"], ["格拉茨", "Graz"], ["哥德堡", "Gothenburg"], ["马尔默", "Malmo"], ["奥斯陆", "Oslo"], ["卑尔根", "Bergen"], ["奥胡斯", "Aarhus"], ["欧登塞", "Odense"], ["坦佩雷", "Tampere"], ["图尔库", "Turku"], ["都柏林", "Dublin"], ["戈尔韦", "Galway"], ["里斯本", "Lisbon"], ["波尔图", "Porto"], ["布拉格", "Prague"], ["布尔诺", "Brno"], ["塞格德", "Szeged"], ["曼哈顿", "Manhattan"], ["洛杉矶", "Los Angeles"], ["旧金山", "San Francisco"], ["迈阿密", "Miami"], ["达拉斯", "Dallas"], ["渥太华", "Ottawa"], ["多伦多", "Toronto"], ["温哥华", "Vancouver"], ["蒙特雷", "Monterrey"], ["圣保罗", "Sao Paulo"], ["波哥大", "Bogota"], ["麦德林", "Medellin"], ["堪培拉", "Canberra"], ["墨尔本", "Melbourne"], ["惠灵顿", "Wellington"], ["奥克兰", "Auckland"], ["基督城", "Christchurch"], ["大洋洲", "Oceania"], ["东南亚", "Southeast Asia"], ["中东欧", "Central & Eastern Europe"], ["欧元区", "Eurozone"], ["搜索:", "Search:"], ["单一制", "Unitary State"], ["房地产", "Real Estate"], ["空置率", "Vacancy Rate"], ["生育率", "Fertility Rate (TFR)"], ["不良率", "NPL Ratio"], ["失业率", "Unemployment Rate"], ["增值税", "Value-Added Tax (VAT)"], ["消费税", "Consumption/Excise Tax"], ["销售税", "Sales Tax"], ["营业税", "Business Tax"], ["公积金", "Provident Fund"], ["强积金", "MPF"], ["间接税", "Indirect Tax"], ["直接税", "Direct Tax"], ["财产税", "Property Tax"], ["房产税", "Property Tax"], ["遗产税", "Inheritance Tax"], ["赠与税", "Gift Tax"], ["印花税", "Stamp Duty"], ["制造业", "Manufacturing"], ["服务业", "Services"], ["建筑业", "Construction"], ["半导体", "Semiconductor"], ["锂电池", "Lithium Batteries"], ["去杠杆", "Deleveraging"], ["加杠杆", "Leveraging Up"], ["通胀率", "Inflation Rate"], ["负利率", "Negative Interest Rate"], ["保障房", "Social Housing"], ["内政部", "Ministry of the Interior"], ["联合国", "UN"], ["低收入", "Low Income"], ["高收入", "High Income"], ["中位数", "Median"], ["大都市", "Metropolis"], ["岁以上", "+"], ["平方米", "sqm"], ["百分点", "pp"], ["管辖区", "Jurisdiction"], ["经济体", "Economies"], ["总权重", "Total Weight"], ["次区域", "Subregion"], ["英文名", "English Name"], ["起始年", "Start Year"], ["第一层", "Layer 1"], ["第二层", "Layer 2"], ["第三层", "Layer 3"], ["第四层", "Layer 4"], ["第五层", "Layer 5"], ["第六层", "Layer 6"], ["日用品", "Daily Goods"], ["含公设", "Incl. Shared Area"], ["日本", "Japan"], ["韩国", "South Korea"], ["印度", "India"], ["泰国", "Thailand"], ["越南", "Vietnam"], ["南非", "South Africa"], ["埃及", "Egypt"], ["加纳", "Ghana"], ["德国", "Germany"], ["法国", "France"], ["英国", "United Kingdom"], ["荷兰", "Netherlands"], ["瑞士", "Switzerland"], ["瑞典", "Sweden"], ["挪威", "Norway"], ["丹麦", "Denmark"], ["芬兰", "Finland"], ["希腊", "Greece"], ["波兰", "Poland"], ["捷克", "Czechia"], ["美国", "United States"], ["巴西", "Brazil"], ["智利", "Chile"], ["秘鲁", "Peru"], ["印尼", "Indonesia"], ["北京", "Beijing"], ["上海", "Shanghai"], ["深圳", "Shenzhen"], ["广州", "Guangzhou"], ["杭州", "Hangzhou"], ["台北", "Taipei"], ["新竹", "Hsinchu"], ["香港", "Hong Kong"], ["九龙", "Kowloon"], ["新界", "New Territories"], ["澳门", "Macau"], ["氹仔", "Taipa"], ["路氹", "Cotai"], ["东京", "Tokyo"], ["大阪", "Osaka"], ["横滨", "Yokohama"], ["首尔", "Seoul"], ["釜山", "Busan"], ["仁川", "Incheon"], ["孟买", "Mumbai"], ["泗水", "Surabaya"], ["万隆", "Bandung"], ["槟城", "Penang"], ["新山", "Johor Bahru"], ["曼谷", "Bangkok"], ["普吉", "Phuket"], ["清迈", "Chiang Mai"], ["河内", "Hanoi"], ["岘港", "Da Nang"], ["宿务", "Cebu"], ["达沃", "Davao"], ["达卡", "Dhaka"], ["吉达", "Jeddah"], ["达曼", "Dammam"], ["迪拜", "Dubai"], ["德班", "Durban"], ["开罗", "Cairo"], ["莱基", "Lekki"], ["奥兰", "Oran"], ["柏林", "Berlin"], ["汉堡", "Hamburg"], ["巴黎", "Paris"], ["里昂", "Lyon"], ["尼斯", "Nice"], ["马赛", "Marseille"], ["伦敦", "London"], ["罗马", "Rome"], ["米兰", "Milan"], ["海牙", "The Hague"], ["根特", "Ghent"], ["科克", "Cork"], ["雅典", "Athens"], ["华沙", "Warsaw"], ["纽约", "New York"], ["硅谷", "Silicon Valley"], ["卡利", "Cali"], ["利马", "Lima"], ["悉尼", "Sydney"], ["珀斯", "Perth"], ["亚洲", "Asia"], ["欧洲", "Europe"], ["美洲", "Americas"], ["非洲", "Africa"], ["东亚", "East Asia"], ["南亚", "South Asia"], ["西欧", "Western Europe"], ["北欧", "Northern Europe"], ["南欧", "Southern Europe"], ["北美", "North America"], ["拉美", "Latin America"], ["北非", "North Africa"], ["西非", "West Africa"], ["东非", "East Africa"], ["东盟", "ASEAN"], ["欧盟", "EU"], ["发达", "Advanced"], ["新兴", "Emerging"], ["税楔", "Tax Wedge"], ["外债", "External Debt"], ["农业", "Agriculture"], ["工业", "Industry"], ["光伏", "Photovoltaics (Solar)"], ["通胀", "Inflation"], ["通缩", "Deflation"], ["加息", "Rate Hike"], ["降息", "Rate Cut"], ["首付", "Down Payment"], ["公寓", "Apartment"], ["展开", "Expand"], ["收起", "Collapse"], ["导出", "Export"], ["重置", "Reset"], ["恢复", "Restore"], ["搜索", "Search"], ["筛选", "Filter"], ["排序", "Sort"], ["对比", "Compare"], ["模拟", "Simulate"], ["计算", "Calculate"], ["评分", "Score"], ["排名", "Rank"], ["权重", "Weight"], ["合计", "Total"], ["平均", "Average"], ["全国", "National"], ["首都", "Capital"], ["万亿", " Trillion"], ["千亿", "00 Billion"], ["百亿", "0 Billion"], ["十亿", " Billion"], ["万套", "0k Units"], ["百万", " Million"], ["小时", "hr"], ["左轴", "L-Axis"], ["右轴", "R-Axis"], ["横轴", "X-Axis"], ["纵轴", "Y-Axis"], ["评级", "Grade"], ["大洲", "Continent"], ["分组", "Group"], ["代码", "Code"], ["名称", "Name"], ["货币", "Currency"], ["来源", "Source"], ["关闭", "Close"], ["图表", "Chart"], ["亿", "00M"], ["万", "0k"], ["倍", "x"], ["年", "Y"], ["月", "Mo"], ["岁", "yo"], ["是", "Yes"], ["否", "No"], ["或", "or"], ["与", "&"], ["及", "&"], ["至", "to"], ["国", " Economies"]];

const S2T_PHRASE_KEYS = Object.keys(S2T_PHRASES).sort((a, b) => b.length - a.length);

const EN_WORD_FALLBACK = [
  ["由于", " due to "], ["因此", " therefore "], ["此外", " moreover, "], ["同时", " meanwhile, "],
  ["然而", " however, "], ["但", " but "], ["以及", " and "], ["并且", " and "], ["或者", " or "],
  ["通过", " via "], ["基于", " based on "], ["采用", " using "], ["显示", " shows "], ["表明", " indicates "],
  ["反映", " reflects "], ["包含", " includes "], ["涵盖", " covers "], ["支持", " supports "],
  ["提供", " provides "], ["实现", " achieves "], ["推动", " drives "], ["导致", " leads to "],
  ["引发", " triggers "], ["面临", " faces "], ["经历", " experienced "], ["维持", " maintains "],
  ["保持", " keeps "], ["超过", " exceeds "], ["低于", " below "], ["高于", " above "],
  ["介于", " between "], ["达到", " reaches "], ["高达", " up to "], ["仅为", " only "],
  ["显著", " significantly "], ["严重", " severely "], ["大幅", " sharply "], ["持续", " continuously "],
  ["长期", " long-term "], ["短期", " short-term "], ["中期", " medium-term "], ["近年", " in recent years "],
  ["当前", " current "], ["目前", " currently "], ["未来", " future "], ["过去", " past "],
  ["全球", "Global "], ["全国", "National "], ["国际", "International "], ["本国", "Domestic "],
  ["当地", "Local "], ["政府", "Gov "], ["央行", "Central Bank "], ["银行", "Bank "],
  ["企业", "Corporate "], ["居民", "Household "], ["家庭", "Household "], ["个人", "Individual "],
  ["市场", "Market "], ["经济", "Economy "], ["金融", "Financial "], ["财政", "Fiscal "],
  ["政策", "Policy "], ["制度", "System "], ["改革", "Reform "], ["危机", "Crisis "],
  ["泡沫", "Bubble "], ["增长", "Growth "], ["上涨", "Rise "], ["下跌", "Decline "],
  ["回落", "Pullback "], ["反弹", "Rebound "], ["复苏", "Recovery "], ["停滞", "Stagnation "],
  ["萎缩", "Contraction "], ["扩张", "Expansion "], ["转型", "Transition "], ["升级", "Upgrading "],
  ["人口", "Population "], ["劳动力", "Labor Force "], ["就业", "Employment "], ["工资", "Wage "],
  ["收入", "Income "], ["消费", "Consumption "], ["储蓄", "Savings "], ["投资", "Investment "],
  ["出口", "Export "], ["进口", "Import "], ["贸易", "Trade "], ["顺差", "Surplus "], ["赤字", "Deficit "],
  ["房价", "House Price "], ["地价", "Land Price "], ["住宅", "Residential "], ["住房", "Housing "],
  ["租金", "Rent "], ["租房", "Rental "], ["购房", "Home Purchase "], ["置业", "Homebuying "],
  ["贷款", "Loan "], ["利率", "Interest Rate "], ["债务", "Debt "], ["杠杆", "Leverage "],
  ["税率", "Tax Rate "], ["税收", "Tax Revenue "], ["税负", "Tax Burden "], ["税制", "Tax System "],
  ["免税", "Tax-Exempt "], ["抵扣", "Deduction "], ["豁免", "Exemption "], ["津贴", "Allowance "],
  ["福利", "Welfare "], ["养老", "Pension "], ["医疗", "Healthcare "], ["教育", "Education "],
  ["数据", "Data "], ["统计", "Statistics "], ["指标", "Indicator "], ["指数", "Index "],
  ["比例", "Ratio "], ["比重", "Share "], ["占比", "Share "], ["均值", "Mean "],
  ["峰值", "Peak "], ["高点", "High "], ["低点", "Low "], ["区间", "Range "],
  ["水平", "Level "], ["结构", "Structure "], ["规模", "Scale "], ["质量", "Quality "],
  ["效率", "Efficiency "], ["风险", "Risk "], ["压力", "Pressure "], ["负担", "Burden "],
  ["优势", "Advantage "], ["挑战", "Challenge "], ["问题", "Issue "], ["分析", "Analysis "],
  ["研究", "Research "], ["比较", "Comparison "], ["评估", "Evaluation "], ["诊断", "Diagnosis "],
  ["说明", "Note "], ["注：", "Note: "], ["例如", "e.g. "], ["如", "e.g. "], ["约", "approx. "]
];

const FONT_STACKS = {
  'zh-CN': "'IBM Plex Sans', 'CustomEn', 'EldenSerifSC', 'Source Han Serif SC', 'Noto Serif SC', 'FZXiaoBiaoSong-B05S', 'Songti SC', 'SimSun', serif",
  'zh-TW': "'IBM Plex Sans', 'CustomEn', 'EldenSerifTC', 'Source Han Serif TC', 'Noto Serif TC', 'DFMing-W5-WIN-BF', 'DFMingStd-W5', 'Songti TC', 'PMingLiU', serif",
  'en': "'IBM Plex Sans', 'CustomEn', -apple-system, BlinkMacSystemFont, sans-serif"
};

let currentLang = 'zh-CN';
let isInternalMutating = false;

const origTextNodeMap = new WeakMap();
const origAttrMap = new WeakMap();
const origChartSnapshotMap = new WeakMap();

export function toTraditional(str) {
  if (!str || typeof str !== 'string') return str;
  let out = str;
  for (let i = 0; i < S2T_PHRASE_KEYS.length; i++) {
    const k = S2T_PHRASE_KEYS[i];
    if (out.includes(k)) {
      out = out.split(k).join(S2T_PHRASES[k]);
    }
  }
  let res = '';
  for (let i = 0; i < out.length; i++) {
    const ch = out[i];
    res += S2T_CHAR_MAP[ch] || ch;
  }
  return res;
}

export function toEnglish(str) {
  if (!str || typeof str !== 'string') return str;
  if (!/[一-鿿]/.test(str)) return str;

  let out = str;
  for (let i = 0; i < EN_PHRASE_ENTRIES.length; i++) {
    const [zh, en] = EN_PHRASE_ENTRIES[i];
    if (out.includes(zh)) {
      out = out.split(zh).join(' ' + en + ' ');
    }
  }

  if (/[一-鿿]/.test(out)) {
    for (let i = 0; i < EN_WORD_FALLBACK.length; i++) {
      const [zh, en] = EN_WORD_FALLBACK[i];
      if (out.includes(zh)) {
        out = out.split(zh).join(en);
      }
    }
  }

  out = out
    .replace(/：/g, ': ')
    .replace(/，/g, ', ')
    .replace(/、/g, ', ')
    .replace(/；/g, '; ')
    .replace(/。/g, '. ')
    .replace(/（/g, ' (')
    .replace(/）/g, ') ')
    .replace(/“|”|「|」|『|』/g, '"')
    .replace(/【/g, '[')
    .replace(/】/g, ']')
    .replace(/[一-鿿]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\s+([,.;:%])/g, '$1')
    .trim();

  return out || str;
}

const translationCache = new Map();

export function translateText(origStr, lang = currentLang) {
  if (!origStr || typeof origStr !== 'string') return origStr;
  if (lang === 'zh-CN') return origStr;
  const cacheKey = lang + '\u0000' + origStr;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }
  const res = lang === 'zh-TW' ? toTraditional(origStr) : (lang === 'en' ? toEnglish(origStr) : origStr);
  if (translationCache.size < 25000) {
    translationCache.set(cacheKey, res);
  }
  return res;
}

export function translateDOMTree(root = document.body, lang = currentLang) {
  if (!root) return;
  isInternalMutating = true;
  try {
    if (root.querySelectorAll) {
      const els = root.querySelectorAll('[placeholder], [title]');
      els.forEach(el => {
        if (el.closest && el.closest('[data-no-i18n="true"]')) return;
        let saved = origAttrMap.get(el);
        if (!saved) {
          saved = {};
          if (el.hasAttribute('placeholder')) saved.placeholder = el.getAttribute('placeholder');
          if (el.hasAttribute('title')) saved.title = el.getAttribute('title');
          origAttrMap.set(el, saved);
        }
        if (saved.placeholder !== undefined) {
          const nextPh = translateText(saved.placeholder, lang);
          if (el.getAttribute('placeholder') !== nextPh) el.setAttribute('placeholder', nextPh);
        }
        if (saved.title !== undefined) {
          const nextTitle = translateText(saved.title, lang);
          if (el.getAttribute('title') !== nextTitle) el.setAttribute('title', nextTitle);
        }
      });
    }

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') {
          return NodeFilter.FILTER_REJECT;
        }
        if (parent.closest && parent.closest('[data-no-i18n="true"]')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    let textNode = walker.nextNode();
    while (textNode) {
      const val = textNode.nodeValue;
      if (val && val.trim()) {
        if (!origTextNodeMap.has(textNode)) {
          origTextNodeMap.set(textNode, val);
        }
        const origVal = origTextNodeMap.get(textNode);
        const translated = translateText(origVal, lang);
        if (textNode.nodeValue !== translated) {
          textNode.nodeValue = translated;
        }
      }
      textNode = walker.nextNode();
    }
  } finally {
    isInternalMutating = false;
  }
}

export function localizeChartInstance(chartInstance, lang = currentLang) {
  if (!chartInstance || !chartInstance.data) return;

  if (!origChartSnapshotMap.has(chartInstance)) {
    const snap = {
      labels: Array.isArray(chartInstance.data.labels) ? [...chartInstance.data.labels] : null,
      datasetLabels: (chartInstance.data.datasets || []).map(ds => ds.label || ''),
      scaleTitles: {}
    };
    const scales = chartInstance.options?.scales || {};
    for (const [sKey, sObj] of Object.entries(scales)) {
      if (sObj?.title?.text) {
        snap.scaleTitles[sKey] = sObj.title.text;
      }
    }
    origChartSnapshotMap.set(chartInstance, snap);
  }

  const snap = origChartSnapshotMap.get(chartInstance);
  if (!snap) return;

  if (Array.isArray(snap.labels)) {
    chartInstance.data.labels = snap.labels.map(lbl =>
      typeof lbl === 'string' ? translateText(lbl, lang) : lbl
    );
  }

  if (Array.isArray(chartInstance.data.datasets)) {
    chartInstance.data.datasets.forEach((ds, idx) => {
      const origLbl = snap.datasetLabels[idx];
      if (origLbl) {
        ds.label = translateText(origLbl, lang);
      }
    });
  }

  const scales = chartInstance.options?.scales || {};
  for (const [sKey, origTitle] of Object.entries(snap.scaleTitles)) {
    if (scales[sKey]?.title) {
      scales[sKey].title.text = translateText(origTitle, lang);
    }
  }

  if (typeof chartInstance.update === 'function') {
    chartInstance.update('none');
  }
}

export function localizeAllCharts(lang = currentLang) {
  const fontStack = FONT_STACKS[lang] || FONT_STACKS['zh-CN'];
  if (typeof window !== 'undefined' && window.Chart && window.Chart.defaults) {
    if (window.Chart.defaults.font) {
      window.Chart.defaults.font.family = fontStack;
    }
  }

  for (const chart of chartManager.instances.values()) {
    localizeChartInstance(chart, lang);
  }
}

export function switchPlatformLanguage(lang) {
  if (!['zh-CN', 'zh-TW', 'en'].includes(lang)) return;
  currentLang = lang;

  document.documentElement.setAttribute('lang', lang);

  document.querySelectorAll('#langSwitcherGroup .lang-box-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
  });

  if (!document._origTitle) {
    document._origTitle = document.title;
  }
  document.title = translateText(document._origTitle, lang);

  translateDOMTree(document.body, lang);
  localizeAllCharts(lang);
  languageManager.setLanguage(lang);
}

export function getCurrentLanguage() {
  return currentLang;
}

export function initI18n() {
  window.switchPlatformLanguage = switchPlatformLanguage;
  window.__resetAndLocalizeChart = function(chartInstance) {
    if (!chartInstance) return;
    origChartSnapshotMap.delete(chartInstance);
    if (currentLang !== 'zh-CN') {
      localizeChartInstance(chartInstance, currentLang);
    } else if (typeof chartInstance.update === 'function') {
      chartInstance.update('none');
    }
  };

  if (typeof MutationObserver !== 'undefined' && document.body) {
    let pendingContainers = new Set();
    let rafScheduled = false;
    const observer = new MutationObserver((mutations) => {
      if (isInternalMutating || currentLang === 'zh-CN') return;
      for (const m of mutations) {
        if (m.type === 'childList' && m.addedNodes.length > 0 && m.target) {
          if (m.target.closest && m.target.closest('[data-no-i18n="true"]')) continue;
          pendingContainers.add(m.target);
        }
      }
      if (pendingContainers.size > 0 && !rafScheduled) {
        rafScheduled = true;
        requestAnimationFrame(() => {
          rafScheduled = false;
          if (currentLang === 'zh-CN') {
            pendingContainers.clear();
            return;
          }
          const targets = Array.from(pendingContainers);
          pendingContainers.clear();
          for (const el of targets) {
            if (el && el.isConnected) {
              translateDOMTree(el, currentLang);
            }
          }
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}
