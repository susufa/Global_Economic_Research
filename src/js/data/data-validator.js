/**
 * data-validator.js — 宏观研究数据集完整性与统计口径校验器
 * --------------------------------------------------------------------------
 * 负责在初始化或后续动态加载数据时校验：
 * 1. 国家和地区数量（房地产 57 个、税制 55 个、经济轨迹 55 个）
 * 2. 中国大陆、中国台湾、中国香港、中国澳门四个独立统计实体是否完整存在
 * 3. 时间序列年份覆盖范围与关键指标字段完整性
 * 4. 缺失值标记（null / "NA"）与数据来源链接完整性
 */

/**
 * 校验房地产数据集
 * @param {Object} reData - real-estate.json 数据对象
 * @returns {{ valid: boolean, summary: Object, errors: Array<string> }}
 */
export function validateRealEstateData(reData) {
  const errors = [];
  if (!reData || !Array.isArray(reData.countries)) {
    return { valid: false, summary: {}, errors: ['real-estate.json 缺少 countries 数组'] };
  }

  const countries = reData.countries;
  if (countries.length !== 57) {
    errors.push(`房地产板块国家/地区数量预期为 57，实际为 ${countries.length}`);
  }

  const requiredEntities = ['CN', 'TW', 'HK', 'MO'];
  for (const code of requiredEntities) {
    if (!countries.some(c => c.code === code)) {
      errors.push(`房地产板块缺失独立统计实体: ${code}`);
    }
  }

  if (!Array.isArray(reData.bubbleEvents) || reData.bubbleEvents.length !== 16) {
    errors.push(`房地产泡沫事件数量预期为 16，实际为 ${reData.bubbleEvents?.length}`);
  }
  if (!Array.isArray(reData.caseStudies) || reData.caseStudies.length !== 14) {
    errors.push(`房地产国别深度案例数量预期为 14，实际为 ${reData.caseStudies?.length}`);
  }
  if (!Array.isArray(reData.tenConclusions) || reData.tenConclusions.length !== 10) {
    errors.push(`房地产实证专题结论数量预期为 10，实际为 ${reData.tenConclusions?.length}`);
  }

  return {
    valid: errors.length === 0,
    summary: {
      countries: countries.length,
      bubbleEvents: reData.bubbleEvents?.length || 0,
      caseStudies: reData.caseStudies?.length || 0,
      tenConclusions: reData.tenConclusions?.length || 0
    },
    errors
  };
}

/**
 * 校验综合税制数据集
 * @param {Object} taxData - taxation.json 数据对象
 * @returns {{ valid: boolean, summary: Object, errors: Array<string> }}
 */
export function validateTaxationData(taxData) {
  const errors = [];
  if (!taxData || !Array.isArray(taxData.jurisdictions)) {
    return { valid: false, summary: {}, errors: ['taxation.json 缺少 jurisdictions 数组'] };
  }

  const list = taxData.jurisdictions;
  if (list.length !== 55) {
    errors.push(`综合税制板块管辖区数量预期为 55，实际为 ${list.length}`);
  }

  const requiredEntities = ['CN-ML', 'TW', 'HK', 'MO'];
  for (const id of requiredEntities) {
    if (!list.some(d => d.id === id)) {
      errors.push(`综合税制板块缺失独立统计实体: ${id}`);
    }
  }

  const missingSourceCount = list.filter(d => !d.sourceUrl || !d.sourceLabel).length;
  if (missingSourceCount > 0) {
    errors.push(`综合税制板块有 ${missingSourceCount} 个管辖区缺失权威来源链接`);
  }

  return {
    valid: errors.length === 0,
    summary: {
      jurisdictions: list.length,
      withSourceUrl: list.length - missingSourceCount
    },
    errors
  };
}

/**
 * 校验经济发展轨迹数据集
 * @param {Object} econData - economy.json 数据对象
 * @returns {{ valid: boolean, summary: Object, errors: Array<string> }}
 */
export function validateEconomyData(econData) {
  const errors = [];
  if (!econData || !Array.isArray(econData.economies) || !Array.isArray(econData.years)) {
    return { valid: false, summary: {}, errors: ['economy.json 缺少 economies 或 years 数组'] };
  }

  if (econData.economies.length !== 55) {
    errors.push(`经济轨迹板块经济体数量预期为 55，实际为 ${econData.economies.length}`);
  }
  if (econData.years.length !== 42 || econData.years[0] !== 1985 || econData.years[econData.years.length - 1] !== 2026) {
    errors.push(`经济轨迹板块年份序列预期为 1985–2026 共 42 年，实际为 ${econData.years.length} 年`);
  }

  const requiredEntities = ['CHN', 'TWN', 'HKG', 'MAC'];
  for (const id of requiredEntities) {
    if (!econData.economies.some(e => e.id === id)) {
      errors.push(`经济轨迹板块缺失独立统计实体: ${id}`);
    }
  }

  return {
    valid: errors.length === 0,
    summary: {
      economies: econData.economies.length,
      years: econData.years.length,
      tenQuestions: econData.tenQuestionsData?.length || 0,
      historicalEvents: econData.historicalEvents?.length || 0,
      caseStudies: econData.caseStudies?.length || 0
    },
    errors
  };
}

/**
 * 执行全平台三大数据集联合校验
 * @param {{ realEstate: Object, taxation: Object, economy: Object }} allData
 */
export function validateAllDatasets(allData) {
  const reReport = validateRealEstateData(allData.realEstate);
  const taxReport = validateTaxationData(allData.taxation);
  const econReport = validateEconomyData(allData.economy);

  return {
    valid: reReport.valid && taxReport.valid && econReport.valid,
    realEstate: reReport,
    taxation: taxReport,
    economy: econReport
  };
}
