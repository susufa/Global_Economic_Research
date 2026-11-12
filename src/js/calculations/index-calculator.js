/**
 * index-calculator.js — 独立指标计算引擎模块
 * --------------------------------------------------------------------------
 * 核心职责：
 * 1. 时间序列插值、定基指数重算、同比(YoY)/环比(QoQ)/区间累计增长率与复合年增长率(CAGR)计算
 * 2. 比例、份额占比与加权均值计算
 * 3. 房地产板块：子市场乘数计算、6维健康度综合评分计算、按揭购房压力模拟计算
 * 4. 综合税制板块：8步全链路收入与税负传导模拟计算、5维税制综合评估得分与聚类计算
 * 5. 经济发展轨迹板块：13维高质量增长加权综合得分与等级评定计算
 *
 * 严格约束：本模块为纯函数计算层，不直接依赖任何 DOM 元素或 Chart.js 实例，支持未来迁移至 Web Worker。
 */

/**
 * 1. 通用时间序列插值与基础增长率计算
 */

/**
 * 从稀疏或密集年份对象中获取指定年份数值（支持线性插值）
 * @param {Object} seriesObj - 形如 { 1985: 42.1, 1990: 55.4, ... } 的年份键值对象
 * @param {number} year - 目标年份
 * @returns {number} 插值或精确数值
 */
export function getSeriesValue(seriesObj, year) {
  if (!seriesObj) return 100;
  if (seriesObj[year] !== undefined && seriesObj[year] !== null) return seriesObj[year];
  const keys = Object.keys(seriesObj)
    .map(Number)
    .filter(k => !Number.isNaN(k) && seriesObj[k] !== null && seriesObj[k] !== undefined)
    .sort((a, b) => a - b);
  if (keys.length === 0) return 100;
  if (year <= keys[0]) return seriesObj[keys[0]];
  if (year >= keys[keys.length - 1]) return seriesObj[keys[keys.length - 1]];
  for (let i = 0; i < keys.length - 1; i++) {
    const y0 = keys[i];
    const y1 = keys[i + 1];
    if (year >= y0 && year <= y1) {
      const ratio = (year - y0) / (y1 - y0);
      return +(seriesObj[y0] + ratio * (seriesObj[y1] - seriesObj[y0])).toFixed(2);
    }
  }
  return 100;
}

/**
 * 计算同比增长率 (YoY Growth Rate %) 或相邻期增长率
 * @param {number} currentVal - 当期值
 * @param {number} previousVal - 上期/去年同期值
 * @returns {number|null} 增长率百分比
 */
export function computeYoYGrowth(currentVal, previousVal) {
  if (currentVal === null || currentVal === undefined || previousVal === null || previousVal === undefined || previousVal === 0) {
    return null;
  }
  return +(((currentVal - previousVal) / Math.abs(previousVal)) * 100).toFixed(2);
}

/**
 * 计算环比增长率 (QoQ / Sequential Growth Rate %)
 * @param {number} currentVal - 当前期数值
 * @param {number} prevPeriodVal - 前一期数值
 * @returns {number|null} 环比增长率百分比
 */
export function computeQoQGrowth(currentVal, prevPeriodVal) {
  return computeYoYGrowth(currentVal, prevPeriodVal);
}

/**
 * 计算比率与结构占比 (Ratio / Share %)
 * @param {number} part - 部分数值
 * @param {number} total - 总体数值
 * @param {number} decimals - 保留小数位
 * @returns {number} 占比百分比
 */
export function computeSharePct(part, total, decimals = 2) {
  if (!total || total === 0 || part === null || part === undefined) return 0;
  return +((part / total) * 100).toFixed(decimals);
}

/**
 * 将时间序列按指定基准年重新定基 (Base Year = 100)
 * @param {Array<number>} values - 原始序列值
 * @param {number} baseValue - 基准年数值
 * @returns {Array<number>} 定基指数序列
 */
export function rebaseIndexSeries(values, baseValue) {
  const safeBase = baseValue && baseValue > 0 ? baseValue : 100;
  return values.map(v => (v === null || v === undefined ? null : +((v / safeBase) * 100).toFixed(1)));
}

/**
 * 2. 房地产板块专用指标计算
 */

/**
 * 获取房地产子市场结构乘数（全部住宅 / 新建商品房 / 二手存量房 / 公寓 / 独栋住宅）
 * @param {string} code - 国家/地区代码
 * @param {string} submarket - 子市场类型 ('all' | 'new' | 'existing' | 'apartment' | 'house')
 * @param {number} year - 年份
 * @returns {number} 乘数系数
 */
export function getSubmarketMultiplier(code, submarket, year) {
  if (submarket === 'all') return 1.0;
  const t = (year - 2010) / 16;
  const seed = (code.charCodeAt(0) + code.charCodeAt(1)) % 7;
  if (submarket === 'new') return +(1 + t * (0.08 + seed * 0.01)).toFixed(3);
  if (submarket === 'existing') return +(1 - t * (0.04 + seed * 0.005)).toFixed(3);
  if (submarket === 'apartment') {
    const isAsian = ['HK', 'SG', 'TW', 'KR', 'CN', 'JP'].includes(code);
    return +(1 + t * (isAsian ? 0.07 : -0.05)).toFixed(3);
  }
  if (submarket === 'house') {
    const isWestern = ['US', 'CA', 'AU', 'NZ', 'GB', 'DE'].includes(code);
    return +(1 + t * (isWestern ? 0.09 : 0.02)).toFixed(3);
  }
  return 1.0;
}

/**
 * 计算房地产指定时间窗口的累计涨跌幅 (%)
 * @param {Object} country - 国家/地区数据对象
 * @param {string} windowKey - 时间窗口如 '1985_2026', '2000_2026', '2010_2026'
 * @param {string} mode - 价格口径 ('real' | 'nominal')
 * @returns {number} 累计涨跌幅百分比
 */
export function computePeriodGrowth(country, windowKey, mode) {
  const [yStartStr, yEndStr] = windowKey.split('_');
  const yStart = parseInt(yStartStr, 10);
  const yEnd = parseInt(yEndStr, 10);
  const ser = mode === 'real' ? country.realSeries : country.nomSeries;
  const vStart = getSeriesValue(ser, yStart);
  const vEnd = getSeriesValue(ser, yEnd);
  if (!vStart || vStart <= 0) return 0;
  return +(((vEnd - vStart) / vStart) * 100).toFixed(1);
}

/**
 * 计算房地产复合年均增长率 (CAGR %)
 * @param {Object} country - 国家/地区数据对象
 * @param {string} periodType - 周期类型 ('long' 1985-2026 | 'post2010' 2010-2026 | 'last10' 2016-2026)
 * @param {string} mode - 价格口径 ('real' | 'nominal')
 * @returns {number} 年化复合增长率百分比
 */
export function computeCAGR(country, periodType, mode) {
  const ser = mode === 'real' ? country.realSeries : country.nomSeries;
  let y0 = 1985;
  let y1 = 2026;
  if (periodType === 'post2010') {
    y0 = 2010;
    y1 = 2026;
  } else if (periodType === 'last10') {
    y0 = 2016;
    y1 = 2026;
  }
  const v0 = getSeriesValue(ser, y0);
  const v1 = getSeriesValue(ser, y1);
  const n = y1 - y0;
  if (!v0 || v0 <= 0 || n <= 0) return 0;
  return +((Math.pow(v1 / v0, 1 / n) - 1) * 100).toFixed(2);
}

/**
 * 计算房地产 6 维综合健康度评分
 * @param {Array<Object>} countries - 国家/地区数组
 * @param {Object} weights - 权重对象 { w1, w2, w3, w4, w5, w6 }
 * @returns {Array<Object>} 附加 scores 属性的评分结果列表
 */
export function computeMultiDimensionalScores(countries, weights) {
  const w = weights || { w1: 25, w2: 15, w3: 20, w4: 20, w5: 10, w6: 10 };
  const totalW = (w.w1 + w.w2 + w.w3 + w.w4 + w.w5 + w.w6) || 100;

  return countries.map(c => {
    // 1. 居民购房可负担度 (PIR与按揭收入比反向得分)
    const pirClamped = Math.min(Math.max(c.pirIntl, 3), 45);
    const mirClamped = Math.min(Math.max(c.mortgageIncomeRatio, 20), 180);
    const s1 = Math.max(5, Math.min(98, 100 - ((pirClamped - 3) / 42) * 60 - ((mirClamped - 20) / 160) * 40));

    // 2. 租售均衡与租赁成熟度
    const prrDev = Math.abs(c.prr - 18);
    const rentBurdenPenalty = Math.max(0, c.rentIncomeRatio - 20) * 1.5;
    const s2 = Math.max(10, Math.min(96, 95 - prrDev * 1.3 - rentBurdenPenalty));

    // 3. 住房供给与居住品质
    const sqmScore = Math.min(100, (c.perCapitaSqm / 65) * 100);
    const stockScore = Math.min(100, (c.dwellingsPer1k / 550) * 100);
    const s3 = Math.max(12, Math.min(96, sqmScore * 0.55 + stockScore * 0.45));

    // 4. 金融与财政稳健度
    const debtPenalty = Math.min(60, (c.hhDebtGdp2026 / 130) * 55);
    const bankPenalty = Math.min(35, (c.bankReShare / 60) * 25 + c.nplRate * 2.2);
    const s4 = Math.max(15, Math.min(96, 98 - debtPenalty - bankPenalty));

    // 5. 房价周期平稳度
    const realCagr = Math.abs(computeCAGR(c, 'post2010', 'real') - 1.5);
    const s5 = Math.max(15, Math.min(95, 92 - realCagr * 11));

    // 6. 收入与房价协同度 (2000-2026)
    const realPriceGrowth2000 = computePeriodGrowth(c, '2000_2026', 'real');
    const excessGrowth = Math.max(0, realPriceGrowth2000 - c.incomeRealGrowth2000_2026);
    const s6 = Math.max(10, Math.min(96, 92 - excessGrowth * 0.55));

    const c1 = (s1 * w.w1) / totalW;
    const c2 = (s2 * w.w2) / totalW;
    const c3 = (s3 * w.w3) / totalW;
    const c4 = (s4 * w.w4) / totalW;
    const c5 = (s5 * w.w5) / totalW;
    const c6 = (s6 * w.w6) / totalW;
    const totalScore = +(c1 + c2 + c3 + c4 + c5 + c6).toFixed(1);

    return {
      ...c,
      scores: {
        s1: +s1.toFixed(1), s2: +s2.toFixed(1), s3: +s3.toFixed(1),
        s4: +s4.toFixed(1), s5: +s5.toFixed(1), s6: +s6.toFixed(1),
        c1: +c1.toFixed(1), c2: +c2.toFixed(1), c3: +c3.toFixed(1),
        c4: +c4.toFixed(1), c5: +c5.toFixed(1), c6: +c6.toFixed(1),
        total: totalScore
      }
    };
  });
}

/**
 * 房地产按揭购房负担模拟器纯计算函数
 * @param {Object} country - 选定国家对象
 * @param {Object} params - { loc, incMultiplier, area, downPct, rateAnnual, termYears }
 * @returns {Object} 完整模拟计算结果与4档收入阶层测算明细
 */
export function calculateMortgageSimulation(country, params) {
  const { loc, incMultiplier, area, downPct, rateAnnual, termYears } = params;
  const sqmPrice = loc === 'capital' ? country.capSqmUsd : (loc === 'major' ? country.majSqmUsd : country.natSqmUsd);
  const locIncomeFactor = loc === 'capital' ? 1.38 : (loc === 'major' ? 1.18 : 1.0);
  const baseAnnualIncomeUsd = ((country.natSqmUsd * 90) / country.pirIntl) * locIncomeFactor;

  const totalPrice = sqmPrice * area;
  const downPayment = totalPrice * (downPct / 100);
  const loanPrincipal = totalPrice - downPayment;

  const rMonthly = (rateAnnual / 100) / 12;
  const nMonths = termYears * 12;
  const monthlyPay = rMonthly > 0
    ? (loanPrincipal * rMonthly * Math.pow(1 + rMonthly, nMonths)) / (Math.pow(1 + rMonthly, nMonths) - 1)
    : loanPrincipal / nMonths;

  const selectedIncomeAnnual = baseAnnualIncomeUsd * incMultiplier;
  const selectedIncomeMonthly = selectedIncomeAnnual / 12;
  const pir = totalPrice / selectedIncomeAnnual;
  const saveYears = downPayment / (selectedIncomeAnnual * 0.30);
  const payToIncomePct = (monthlyPay / selectedIncomeMonthly) * 100;
  const estMonthlyRent = (totalPrice * (country.rentalYield / 100)) / 12;
  const payToRentRatio = monthlyPay / (estMonthlyRent || 1);

  let difficultyLabel = '极度困难 (需代际支持)';
  let difficultyClass = 'serif-title text-base font-bold mt-0.5 text-[#9E4B32]';
  if (payToIncomePct <= 30 && pir <= 7) {
    difficultyLabel = '轻松可负担';
    difficultyClass = 'serif-title text-base font-bold mt-0.5 text-[#466652]';
  } else if (payToIncomePct <= 45 && pir <= 12) {
    difficultyLabel = '中等偏紧压力';
    difficultyClass = 'serif-title text-base font-bold mt-0.5 text-[#96651B]';
  } else if (payToIncomePct <= 70) {
    difficultyLabel = '沉重购房负担';
    difficultyClass = 'serif-title text-base font-bold mt-0.5 text-[#C86D51]';
  }

  const tierDefs = [
    { name: '低收入家庭 (P25, 55%基准)', mult: 0.55 },
    { name: '中位标准家庭 (P50, 100%基准)', mult: 1.00 },
    { name: '中高收入家庭 (P75, 145%基准)', mult: 1.45 },
    { name: '高收入精英家庭 (P90, 210%基准)', mult: 2.10 }
  ];

  const incomeTiers = tierDefs.map(t => {
    const incA = baseAnnualIncomeUsd * t.mult;
    const incM = incA / 12;
    const tPir = totalPrice / incA;
    const tSave = downPayment / (incA * 0.30);
    const tMti = (monthlyPay / incM) * 100;
    const tRti = (estMonthlyRent / incM) * 100;
    return {
      name: t.name,
      incA,
      tPir,
      tSave,
      tMti,
      tRti
    };
  });

  return {
    totalPrice,
    downPayment,
    loanPrincipal,
    monthlyPay,
    pir,
    saveYears,
    payToIncomePct,
    estMonthlyRent,
    payToRentRatio,
    difficultyLabel,
    difficultyClass,
    incomeTiers
  };
}

/**
 * 3. 综合税制板块专用指标计算
 */

/**
 * 税制 8 步收入与税负全链路模拟器计算函数
 * @param {Object} country - 税收管辖区数据对象
 * @param {string} householdType - 家庭类型 ('single' | 'dual' | 'kids' | 'self' | 'high')
 * @param {number} incomeTierIdx - 收入档位索引 (0..4 对应 50%, 67%, 100%, 167%, 300% AW)
 * @param {string} currencyMode - 计价模式 ('ppp' | 'local')
 * @param {string} wedgeMode - 税楔口径 ('broad' | 'narrow')
 * @returns {Object} 8步详细拆解结果
 */
export function calculate8StepSim(country, householdType, incomeTierIdx, currencyMode, wedgeMode = 'broad') {
  const tierMultipliers = [0.50, 0.67, 1.00, 1.67, 3.00];
  let mult = tierMultipliers[incomeTierIdx] || 1.0;
  if (householdType === 'high' && incomeTierIdx === 2) {
    mult = 3.00;
  } else if (householdType === 'dual' || householdType === 'kids') {
    mult = mult * 1.67;
  }

  const baseWage = currencyMode === 'ppp' ? country.avgWagePPP : country.avgWageLocal;
  const grossIncome = baseWage * mult;

  let effPitPct = country.pitEff[incomeTierIdx];
  if (householdType === 'high' && incomeTierIdx === 2) {
    effPitPct = country.pitEff[4];
  } else if (householdType === 'dual') {
    effPitPct = Math.max(0, effPitPct * 0.88);
  } else if (householdType === 'kids') {
    let childRelief = 3.2;
    if (['DE', 'FR', 'BE', 'AT', 'PL', 'HU', 'CA', 'US', 'IL', 'CZ', 'IE'].includes(country.id)) {
      childRelief = 7.8;
    } else if (['CN-ML', 'TW', 'HK', 'MO', 'SG', 'JP', 'KR', 'SE', 'DK', 'FI', 'NO'].includes(country.id)) {
      childRelief = 4.5;
    }
    effPitPct = Math.max(0, effPitPct * 0.85 - childRelief);
  } else if (householdType === 'self') {
    effPitPct = Math.max(0, effPitPct * 0.82);
  }

  const useBroad = wedgeMode === 'broad';
  let empSscPct = useBroad ? country.sscEmpBroad : country.sscEmp;
  let erSscPct = useBroad ? country.sscErBroad : country.sscEr;

  if (mult >= 2.5) {
    if (['HK', 'MO', 'TH', 'TW', 'SG', 'CA', 'US', 'DE', 'AT', 'NL', 'ES', 'CN-ML', 'ID', 'EG'].includes(country.id)) {
      empSscPct = empSscPct * 0.58;
      erSscPct = erSscPct * 0.62;
    }
  }

  if (householdType === 'self') {
    erSscPct = 0.0;
    empSscPct = Math.min(28.0, (useBroad ? country.sscEmpBroad : country.sscEmp) * 1.35);
  }

  const step1Gross = grossIncome;
  const step2Pit = step1Gross * (effPitPct / 100);
  const step3EmpSsc = step1Gross * (empSscPct / 100);
  const step4ErSsc = step1Gross * (erSscPct / 100);
  const step5TotalLaborCost = step1Gross + step4ErSsc;
  const step6Disposable = Math.max(0, step1Gross - step2Pit - step3EmpSsc);

  const mpcByTier = [0.92, 0.86, 0.78, 0.68, 0.54];
  let mpc = mpcByTier[incomeTierIdx] || 0.78;
  if (householdType === 'kids') mpc = Math.min(0.95, mpc + 0.08);
  if (householdType === 'high' && incomeTierIdx === 2) mpc = 0.54;

  const basketTaxRateOnSpend = (country.effConsRate / 0.78) / 100;
  const step7ConsTax = step6Disposable * mpc * basketTaxRateOnSpend;
  const step8RealPurchasingPower = Math.max(0, step6Disposable - step7ConsTax);

  const totalTaxBurden = step2Pit + step3EmpSsc + step4ErSsc + step7ConsTax;
  const totalComprehensiveWedgePct = (totalTaxBurden / step5TotalLaborCost) * 100;
  const laborWedgePct = ((step2Pit + step3EmpSsc + step4ErSsc) / step5TotalLaborCost) * 100;
  const disposablePctOfGross = (step6Disposable / step1Gross) * 100;

  return {
    step1Gross,
    step2Pit,
    step3EmpSsc,
    step4ErSsc,
    step5TotalLaborCost,
    step6Disposable,
    step7ConsTax,
    step8RealPurchasingPower,
    effPitPct,
    empSscPct,
    erSscPct,
    mpc,
    effConsPctOfDisp: (step7ConsTax / (step6Disposable || 1)) * 100,
    laborWedgePct,
    totalComprehensiveWedgePct,
    disposablePctOfGross
  };
}

/**
 * 计算税制 5 维综合评分与制度聚类
 * @param {Array<Object>} jurisdictions - 管辖区数组
 * @param {Object} weights - { w1, w2, w3, w4, w5 }
 * @param {string} wedgeMode - 'broad' | 'narrow'
 * @returns {Array<Object>} 排序后的评分对象列表
 */
export function computeTaxEvalScores(jurisdictions, weights, wedgeMode = 'broad') {
  const { w1 = 25, w2 = 20, w3 = 20, w4 = 20, w5 = 15 } = weights || {};
  const totalW = (w1 + w2 + w3 + w4 + w5) || 1;

  const scored = jurisdictions.map(d => {
    const s1 = Math.max(0, Math.min(100, ((55 - d.taxWedgeBroad) / 55) * 100));
    const s2 = Math.max(0, Math.min(100, 100 - (d.effConsRate * 4.2 + d.catRates.food * 1.2)));
    const progGap = d.pitEff[4] - d.pitEff[0];
    const lowBurden = d.pitEff[0] + d.sscEmp * 0.6;
    const s3 = Math.max(0, Math.min(100, 50 + progGap * 1.4 - lowBurden * 1.5));
    const welfareRatio = (d.socialExpGdp / Math.max(8, d.taxToGdp)) * 100;
    const s4 = Math.max(0, Math.min(100, welfareRatio * 0.65 + d.giniReduction * 3.8));
    const sim = calculate8StepSim(d, 'single', 2, 'ppp', wedgeMode);
    const ppScore = Math.min(100, (sim.step8RealPurchasingPower / 55000) * 100);
    const bizScore = Math.max(0, 100 - d.corpTotalTaxRate);
    const s5 = ppScore * 0.65 + bizScore * 0.35;

    const totalScore = (s1 * w1 + s2 * w2 + s3 * w3 + s4 * w4 + s5 * w5) / totalW;

    let cluster = '均衡温和型税制';
    if (d.taxToGdp >= 36 && d.giniReduction >= 9) cluster = '高税负·高福利再分配型';
    else if (d.taxToGdp <= 16 && d.pitTop <= 24) cluster = '低税率·自由港/个人账户型';
    else if (d.pitEff[4] - d.pitEff[0] >= 22) cluster = '强累进·中低收入保护型';
    else if (d.macroBreakdown.cons / d.taxToGdp >= 0.45) cluster = '间接税主导·发展中转型税制';

    return { d, s1, s2, s3, s4, s5, totalScore, cluster };
  });

  return scored.sort((a, b) => b.totalScore - a.totalScore);
}

/**
 * 4. 经济发展轨迹板块专用指标计算
 */

/**
 * 计算经济体 13 维加权综合得分
 * @param {Object} econ - 经济体对象（含 scores13 数组）
 * @param {Array<number>} weights13 - 长度为 13 的权重数组
 * @returns {number} 归一化加权得分
 */
export function computeEconomyWeightedScore(econ, weights13) {
  if (!econ || !Array.isArray(econ.scores13)) return 0;
  const sumW = (weights13 || []).reduce((a, b) => a + b, 0) || 1;
  let total = 0;
  for (let i = 0; i < 13; i++) {
    total += (econ.scores13[i] || 0) * (weights13[i] ?? 1);
  }
  return +(total / sumW).toFixed(1);
}

/**
 * 根据 13 维综合得分评定发展等级与样式类
 * @param {number} weightedScore - 综合得分
 * @returns {{ grade: string, gradeCls: string }}
 */
export function evaluateEconomyGrade(weightedScore) {
  if (weightedScore >= 82) return { grade: 'S (顶尖)', gradeCls: 'badge-sage' };
  if (weightedScore >= 72) return { grade: 'A (优秀)', gradeCls: 'badge-terracotta' };
  if (weightedScore >= 60) return { grade: 'B (良好)', gradeCls: 'badge-ochre' };
  if (weightedScore < 48) return { grade: 'D (脆弱)', gradeCls: 'badge-terracotta' };
  return { grade: 'C', gradeCls: 'bg-[#EFECE4] text-[#5C554E]' };
}
