/**
 * search-index.js — 统一三语（简体中文 / 繁體中文 / English）多维实体与指标索引库
 * --------------------------------------------------------------------------
 * 核心职责（第二阶段 & 第三阶段 & 第五阶段）：
 * 1. 为全部 57 个国家/地区、核心城市都会区及三大研究板块（房地产、综合税制、经济发展轨迹）的全部核心指标建立稳定唯一的实体 ID
 * 2. 在应用初始化时一次性完成标准化倒排/词条索引构建，避免在每次用户输入时重复构建或全表扫描
 * 3. 严格保证一个国家/地区或指标只对应唯一实体 ID，支持简/繁/英全称、简称、ISO代码及常用别名检索
 */

import { normalizeSearchInput } from './search-normalizer.js';

/**
 * 57 个国家与地区权威三语实体主表
 * 每个实体具有唯一 id，并关联三大板块各自的数据主键 codes: { re, tax, econ }
 */
export const COUNTRY_ENTITIES = [
  {
    id: 'mainland-china',
    type: 'country',
    isoCode: 'CN',
    codes: { re: 'CN', tax: 'CN-ML', econ: 'CHN' },
    names: { 'zh-CN': '中国大陆', 'zh-TW': '中國大陸', 'en': 'Mainland China' },
    aliases: [
      '中国大陆', '中國大陸', '中国', '中國', '大陆', '大陸', '中国内地', '中國內地',
      'Mainland China', 'China', 'China (Mainland)', "People's Republic of China", 'PRC', 'P.R.C.',
      'CN', 'CHN', 'CN-ML', '北京', '上海', '深圳', '广州', '廣州', '杭州', 'Beijing', 'Shanghai', 'Shenzhen', 'Guangzhou', 'Hangzhou'
    ]
  },
  {
    id: 'taiwan',
    type: 'country',
    isoCode: 'TW',
    codes: { re: 'TW', tax: 'TW', econ: 'TWN' },
    names: { 'zh-CN': '台湾', 'zh-TW': '臺灣', 'en': 'Taiwan' },
    fullNames: { 'zh-CN': '中国台湾', 'zh-TW': '中國臺灣', 'en': 'Taiwan' },
    aliases: [
      '台湾', '臺灣', '台灣', '中国台湾', '中國臺灣', '中國台灣', '中华台北', '中華臺北',
      'Taiwan', 'TW', 'TWN', 'Chinese Taipei', 'Republic of China', 'ROC',
      '台北', '臺北', '台北市', '臺北市', '新北', '新北市', '台中', '臺中', '台中市', '臺中市', '高雄', '高雄市', '新竹',
      'Taipei', 'New Taipei', 'Taichung', 'Kaohsiung', 'Hsinchu'
    ]
  },
  {
    id: 'hong-kong',
    type: 'country',
    isoCode: 'HK',
    codes: { re: 'HK', tax: 'HK', econ: 'HKG' },
    names: { 'zh-CN': '香港', 'zh-TW': '香港', 'en': 'Hong Kong' },
    fullNames: { 'zh-CN': '中国香港', 'zh-TW': '中國香港', 'en': 'Hong Kong SAR' },
    aliases: [
      '香港', '中国香港', '中國香港', '香港特别行政区', '香港特別行政區',
      'Hong Kong', 'Hong Kong SAR', 'HKSAR', 'HK', 'HKG',
      '香港岛', '香港島', '九龙', '九龍', '新界', 'HK Island', 'Kowloon', 'New Territories'
    ]
  },
  {
    id: 'macau',
    type: 'country',
    isoCode: 'MO',
    codes: { re: 'MO', tax: 'MO', econ: 'MAC' },
    names: { 'zh-CN': '澳门', 'zh-TW': '澳門', 'en': 'Macau' },
    fullNames: { 'zh-CN': '中国澳门', 'zh-TW': '中國澳門', 'en': 'Macau SAR' },
    aliases: [
      '澳门', '澳門', '中国澳门', '中國澳門', '澳门特别行政区', '澳門特別行政區',
      'Macau', 'Macao', 'Macau SAR', 'Macao SAR', 'MO', 'MAC',
      '澳门半岛', '澳門半島', '氹仔', '路氹', 'Taipa', 'Cotai'
    ]
  },
  {
    id: 'united-states',
    type: 'country',
    isoCode: 'US',
    codes: { re: 'US', tax: 'US', econ: 'USA' },
    names: { 'zh-CN': '美国', 'zh-TW': '美國', 'en': 'United States' },
    aliases: [
      '美国', '美國', '美利坚合众国', '美利堅合眾國',
      'United States', 'United States of America', 'USA', 'U.S.A.', 'US', 'U.S.', 'America',
      '华盛顿', '華盛頓', '华盛顿特区', '華盛頓特區', '纽约', '紐約', '洛杉矶', '洛杉磯', '旧金山', '舊金山', '迈阿密', '邁阿密', '达拉斯', '達拉斯',
      'Washington', 'Washington D.C.', 'New York', 'NYC', 'Manhattan', 'Los Angeles', 'San Francisco', 'Miami', 'Dallas'
    ]
  },
  {
    id: 'united-kingdom',
    type: 'country',
    isoCode: 'GB',
    codes: { re: 'GB', tax: 'GB', econ: 'GBR' },
    names: { 'zh-CN': '英国', 'zh-TW': '英國', 'en': 'United Kingdom' },
    aliases: [
      '英国', '英國', '大不列颠', '大不列顛', '英格兰', '英格蘭',
      'United Kingdom', 'UK', 'U.K.', 'Great Britain', 'Britain', 'England', 'GB', 'GBR',
      '伦敦', '倫敦', '曼彻斯特', '曼徹斯特', '爱丁堡', '愛丁堡', '伯明翰', '伯明罕',
      'London', 'Manchester', 'Edinburgh', 'Birmingham'
    ]
  },
  {
    id: 'germany',
    type: 'country',
    isoCode: 'DE',
    codes: { re: 'DE', tax: 'DE', econ: 'DEU' },
    names: { 'zh-CN': '德国', 'zh-TW': '德國', 'en': 'Germany' },
    aliases: [
      '德国', '德國', '德意志', 'Germany', 'Federal Republic of Germany', 'Deutschland', 'DE', 'DEU',
      '柏林', '慕尼黑', '法兰克福', '法蘭克福', '汉堡', '漢堡', 'Berlin', 'Munich', 'Frankfurt', 'Hamburg'
    ]
  },
  {
    id: 'japan',
    type: 'country',
    isoCode: 'JP',
    codes: { re: 'JP', tax: 'JP', econ: 'JPN' },
    names: { 'zh-CN': '日本', 'zh-TW': '日本', 'en': 'Japan' },
    aliases: [
      '日本', 'Japan', 'Nippon', 'JP', 'JPN',
      '东京', '東京', '东京23区', '東京23區', '大阪', '横滨', '橫濱', '名古屋',
      'Tokyo', 'Osaka', 'Yokohama', 'Nagoya'
    ]
  },
  {
    id: 'france',
    type: 'country',
    isoCode: 'FR',
    codes: { re: 'FR', tax: 'FR', econ: 'FRA' },
    names: { 'zh-CN': '法国', 'zh-TW': '法國', 'en': 'France' },
    aliases: [
      '法国', '法國', '法兰西', '法蘭西', 'France', 'French Republic', 'FR', 'FRA',
      '巴黎', '里昂', '尼斯', '马赛', '馬賽', 'Paris', 'Lyon', 'Nice', 'Marseille'
    ]
  },
  {
    id: 'south-korea',
    type: 'country',
    isoCode: 'KR',
    codes: { re: 'KR', tax: 'KR', econ: 'KOR' },
    names: { 'zh-CN': '韩国', 'zh-TW': '韓國', 'en': 'South Korea' },
    aliases: [
      '韩国', '韓國', '南韩', '南韓', '大韩民国', '大韓民國',
      'South Korea', 'Korea', 'Republic of Korea', 'ROK', 'R.O.K.', 'KR', 'KOR',
      '首尔', '首爾', '釜山', '仁川', '京畿道', 'Seoul', 'Busan', 'Incheon', 'Gyeonggi'
    ]
  },
  {
    id: 'singapore',
    type: 'country',
    isoCode: 'SG',
    codes: { re: 'SG', tax: 'SG', econ: 'SGP' },
    names: { 'zh-CN': '新加坡', 'zh-TW': '新加坡', 'en': 'Singapore' },
    aliases: [
      '新加坡', '星洲', '狮城', '獅城', 'Singapore', 'Republic of Singapore', 'SG', 'SGP'
    ]
  },
  {
    id: 'australia',
    type: 'country',
    isoCode: 'AU',
    codes: { re: 'AU', tax: null, econ: null },
    names: { 'zh-CN': '澳大利亚', 'zh-TW': '澳大利亞', 'en': 'Australia' },
    aliases: [
      '澳大利亚', '澳大利亞', '澳大利亚 (参照)', '澳大利亞 (參照)', '澳洲',
      'Australia', 'Commonwealth of Australia', 'AU', 'AUS',
      '堪培拉', '坎培拉', '悉尼', '雪梨', '墨尔本', '墨爾本', '布里斯班', '珀斯', '伯斯',
      'Canberra', 'Sydney', 'Melbourne', 'Brisbane', 'Perth'
    ]
  },
  {
    id: 'new-zealand',
    type: 'country',
    isoCode: 'NZ',
    codes: { re: 'NZ', tax: null, econ: null },
    names: { 'zh-CN': '新西兰', 'zh-TW': '紐西蘭', 'en': 'New Zealand' },
    aliases: [
      '新西兰', '紐西蘭', '新西蘭', '新西兰 (参照)', '紐西蘭 (參照)',
      'New Zealand', 'NZ', 'NZL', '惠灵顿', '威靈頓', '奥克兰', '奧克蘭', '基督城',
      'Wellington', 'Auckland', 'Christchurch'
    ]
  },
  {
    id: 'canada',
    type: 'country',
    isoCode: 'CA',
    codes: { re: 'CA', tax: 'CA', econ: 'CAN' },
    names: { 'zh-CN': '加拿大', 'zh-TW': '加拿大', 'en': 'Canada' },
    aliases: [
      '加拿大', 'Canada', 'CA', 'CAN',
      '渥太华', '渥太華', '多伦多', '多倫多', '温哥华', '溫哥華', '蒙特利尔', '蒙特婁',
      'Ottawa', 'Toronto', 'Vancouver', 'Montreal'
    ]
  },
  {
    id: 'india',
    type: 'country',
    isoCode: 'IN',
    codes: { re: 'IN', tax: 'IN', econ: 'IND' },
    names: { 'zh-CN': '印度', 'zh-TW': '印度', 'en': 'India' },
    aliases: [
      '印度', 'India', 'Republic of India', 'IN', 'IND',
      '新德里', '孟买', '孟買', '班加罗尔', '班加羅爾', 'New Delhi', 'Delhi', 'Mumbai', 'Bengaluru', 'Bangalore'
    ]
  },
  {
    id: 'indonesia',
    type: 'country',
    isoCode: 'ID',
    codes: { re: 'ID', tax: 'ID', econ: 'IDN' },
    names: { 'zh-CN': '印度尼西亚', 'zh-TW': '印度尼西亞', 'en': 'Indonesia' },
    aliases: [
      '印度尼西亚', '印度尼西亞', '印尼', 'Indonesia', 'ID', 'IDN',
      '雅加达', '雅加達', '泗水', '万隆', '萬隆', '巴厘岛', '峇里島', 'Jakarta', 'Surabaya', 'Bandung', 'Bali'
    ]
  },
  {
    id: 'malaysia',
    type: 'country',
    isoCode: 'MY',
    codes: { re: 'MY', tax: 'MY', econ: 'MYS' },
    names: { 'zh-CN': '马来西亚', 'zh-TW': '馬來西亞', 'en': 'Malaysia' },
    aliases: [
      '马来西亚', '馬來西亞', '大马', '大馬', 'Malaysia', 'MY', 'MYS',
      '吉隆坡', '槟城', '檳城', '新山', 'Kuala Lumpur', 'Penang', 'Johor Bahru'
    ]
  },
  {
    id: 'thailand',
    type: 'country',
    isoCode: 'TH',
    codes: { re: 'TH', tax: 'TH', econ: 'THA' },
    names: { 'zh-CN': '泰国', 'zh-TW': '泰國', 'en': 'Thailand' },
    aliases: [
      '泰国', '泰國', 'Thailand', 'TH', 'THA',
      '曼谷', '普吉', '清迈', '清邁', '芭提雅', '芭達雅', 'Bangkok', 'Phuket', 'Chiang Mai', 'Pattaya'
    ]
  },
  {
    id: 'vietnam',
    type: 'country',
    isoCode: 'VN',
    codes: { re: 'VN', tax: 'VN', econ: 'VNM' },
    names: { 'zh-CN': '越南', 'zh-TW': '越南', 'en': 'Vietnam' },
    aliases: [
      '越南', 'Vietnam', 'Viet Nam', 'VN', 'VNM',
      '河内', '河內', '胡志明市', '西贡', '西貢', '岘港', '峴港', 'Hanoi', 'Ho Chi Minh City', 'HCMC', 'Da Nang'
    ]
  },
  {
    id: 'philippines',
    type: 'country',
    isoCode: 'PH',
    codes: { re: 'PH', tax: 'PH', econ: 'PHL' },
    names: { 'zh-CN': '菲律宾', 'zh-TW': '菲律賓', 'en': 'Philippines' },
    aliases: [
      '菲律宾', '菲律賓', 'Philippines', 'PH', 'PHL',
      '马尼拉', '馬尼拉', '宿务', '宿霧', '达沃', '達沃', 'Manila', 'Metro Manila', 'Cebu', 'Davao'
    ]
  },
  {
    id: 'pakistan',
    type: 'country',
    isoCode: 'PK',
    codes: { re: 'PK', tax: 'PK', econ: 'PAK' },
    names: { 'zh-CN': '巴基斯坦', 'zh-TW': '巴基斯坦', 'en': 'Pakistan' },
    aliases: [
      '巴基斯坦', 'Pakistan', 'PK', 'PAK',
      '伊斯兰堡', '伊斯蘭堡', '卡拉奇', '拉合尔', '拉合爾', 'Islamabad', 'Karachi', 'Lahore'
    ]
  },
  {
    id: 'bangladesh',
    type: 'country',
    isoCode: 'BD',
    codes: { re: 'BD', tax: 'BD', econ: 'BGD' },
    names: { 'zh-CN': '孟加拉国', 'zh-TW': '孟加拉國', 'en': 'Bangladesh' },
    aliases: [
      '孟加拉国', '孟加拉國', '孟加拉', 'Bangladesh', 'BD', 'BGD', '达卡', '達卡', '吉大港', 'Dhaka', 'Chittagong'
    ]
  },
  {
    id: 'saudi-arabia',
    type: 'country',
    isoCode: 'SA',
    codes: { re: 'SA', tax: 'SA', econ: 'SAU' },
    names: { 'zh-CN': '沙特阿拉伯', 'zh-TW': '沙烏地阿拉伯', 'en': 'Saudi Arabia' },
    aliases: [
      '沙特阿拉伯', '沙特', '沙烏地阿拉伯', '沙地阿拉伯', 'Saudi Arabia', 'KSA', 'SA', 'SAU',
      '利雅得', '利雅德', '吉达', '吉達', '达曼', '達曼', 'Riyadh', 'Jeddah', 'Dammam'
    ]
  },
  {
    id: 'uae',
    type: 'country',
    isoCode: 'AE',
    codes: { re: 'AE', tax: 'AE', econ: 'ARE' },
    names: { 'zh-CN': '阿联酋', 'zh-TW': '阿聯酋', 'en': 'United Arab Emirates' },
    aliases: [
      '阿联酋', '阿聯酋', '阿拉伯联合酋长国', '阿拉伯聯合大公國', '阿拉伯聯合酋長國',
      'United Arab Emirates', 'UAE', 'U.A.E.', 'AE', 'ARE',
      '阿布扎比', '阿布達比', '迪拜', '杜拜', 'Abu Dhabi', 'Dubai'
    ]
  },
  {
    id: 'turkey',
    type: 'country',
    isoCode: 'TR',
    codes: { re: 'TR', tax: 'TR', econ: 'TUR' },
    names: { 'zh-CN': '土耳其', 'zh-TW': '土耳其', 'en': 'Turkey' },
    aliases: [
      '土耳其', 'Turkey', 'Türkiye', 'Turkiye', 'TR', 'TUR',
      '安卡拉', '伊斯坦布尔', '伊斯坦堡', '安塔利亚', '安塔利亞', 'Ankara', 'Istanbul', 'Antalya'
    ]
  },
  {
    id: 'israel',
    type: 'country',
    isoCode: 'IL',
    codes: { re: 'IL', tax: 'IL', econ: 'ISR' },
    names: { 'zh-CN': '以色列', 'zh-TW': '以色列', 'en': 'Israel' },
    aliases: [
      '以色列', 'Israel', 'IL', 'ISR', '耶路撒冷', '特拉维夫', '特拉維夫', 'Jerusalem', 'Tel Aviv'
    ]
  },
  {
    id: 'south-africa',
    type: 'country',
    isoCode: 'ZA',
    codes: { re: 'ZA', tax: 'ZA', econ: 'ZAF' },
    names: { 'zh-CN': '南非', 'zh-TW': '南非', 'en': 'South Africa' },
    aliases: [
      '南非', 'South Africa', 'RSA', 'ZA', 'ZAF',
      '比勒陀利亚', '普勒托利亞', '开普敦', '開普敦', '约翰内斯堡', '約翰尼斯堡', '德班',
      'Pretoria', 'Cape Town', 'Johannesburg', 'Durban'
    ]
  },
  {
    id: 'egypt',
    type: 'country',
    isoCode: 'EG',
    codes: { re: 'EG', tax: 'EG', econ: 'EGY' },
    names: { 'zh-CN': '埃及', 'zh-TW': '埃及', 'en': 'Egypt' },
    aliases: [
      '埃及', 'Egypt', 'EG', 'EGY', '开罗', '開羅', '亚历山大', '亞歷山大', 'Cairo', 'Alexandria'
    ]
  },
  {
    id: 'nigeria',
    type: 'country',
    isoCode: 'NG',
    codes: { re: 'NG', tax: 'NG', econ: 'NGA' },
    names: { 'zh-CN': '尼日利亚', 'zh-TW': '奈及利亞', 'en': 'Nigeria' },
    aliases: [
      '尼日利亚', '尼日利亞', '奈及利亞', 'Nigeria', 'NG', 'NGA', '阿布贾', '阿布賈', '拉各斯', '拉哥斯', 'Abuja', 'Lagos'
    ]
  },
  {
    id: 'kenya',
    type: 'country',
    isoCode: 'KE',
    codes: { re: 'KE', tax: 'KE', econ: 'KEN' },
    names: { 'zh-CN': '肯尼亚', 'zh-TW': '肯亞', 'en': 'Kenya' },
    aliases: [
      '肯尼亚', '肯尼亞', '肯亞', 'Kenya', 'KE', 'KEN', '内罗毕', '奈洛比', '蒙巴萨', '蒙巴薩', 'Nairobi', 'Mombasa'
    ]
  },
  {
    id: 'morocco',
    type: 'country',
    isoCode: 'MA',
    codes: { re: 'MA', tax: 'MA', econ: 'MAR' },
    names: { 'zh-CN': '摩洛哥', 'zh-TW': '摩洛哥', 'en': 'Morocco' },
    aliases: [
      '摩洛哥', 'Morocco', 'MA', 'MAR', '拉巴特', '卡萨布兰卡', '卡薩布蘭卡', '马拉喀什', '馬拉喀什', 'Rabat', 'Casablanca', 'Marrakech'
    ]
  },
  {
    id: 'algeria',
    type: 'country',
    isoCode: 'DZ',
    codes: { re: 'DZ', tax: 'DZ', econ: 'DZA' },
    names: { 'zh-CN': '阿尔及利亚', 'zh-TW': '阿爾及利亞', 'en': 'Algeria' },
    aliases: [
      '阿尔及利亚', '阿爾及利亞', 'Algeria', 'DZ', 'DZA', '阿尔及尔', '阿爾及爾', '奥兰', '奧蘭', 'Algiers', 'Oran'
    ]
  },
  {
    id: 'ghana',
    type: 'country',
    isoCode: 'GH',
    codes: { re: 'GH', tax: 'GH', econ: 'GHA' },
    names: { 'zh-CN': '加纳', 'zh-TW': '迦納', 'en': 'Ghana' },
    aliases: [
      '加纳', '加納', '迦納', 'Ghana', 'GH', 'GHA', '阿克拉', '库马西', '庫馬西', 'Accra', 'Kumasi'
    ]
  },
  {
    id: 'ethiopia',
    type: 'country',
    isoCode: 'ET',
    codes: { re: 'ET', tax: 'ET', econ: 'ETH' },
    names: { 'zh-CN': '埃塞俄比亚', 'zh-TW': '衣索比亞', 'en': 'Ethiopia' },
    aliases: [
      '埃塞俄比亚', '埃塞俄比亞', '衣索比亞', 'Ethiopia', 'ET', 'ETH', '亚的斯亚贝巴', '阿迪斯阿貝巴', 'Addis Ababa'
    ]
  },
  {
    id: 'italy',
    type: 'country',
    isoCode: 'IT',
    codes: { re: 'IT', tax: 'IT', econ: 'ITA' },
    names: { 'zh-CN': '意大利', 'zh-TW': '義大利', 'en': 'Italy' },
    aliases: [
      '意大利', '義大利', 'Italy', 'IT', 'ITA', '罗马', '羅馬', '米兰', '米蘭', '佛罗伦萨', '佛羅倫斯', 'Rome', 'Milan', 'Florence'
    ]
  },
  {
    id: 'spain',
    type: 'country',
    isoCode: 'ES',
    codes: { re: 'ES', tax: 'ES', econ: 'ESP' },
    names: { 'zh-CN': '西班牙', 'zh-TW': '西班牙', 'en': 'Spain' },
    aliases: [
      '西班牙', 'Spain', 'ES', 'ESP', '马德里', '馬德里', '巴塞罗那', '巴塞隆納', '瓦伦西亚', '瓦倫西亞', 'Madrid', 'Barcelona', 'Valencia'
    ]
  },
  {
    id: 'netherlands',
    type: 'country',
    isoCode: 'NL',
    codes: { re: 'NL', tax: 'NL', econ: 'NLD' },
    names: { 'zh-CN': '荷兰', 'zh-TW': '荷蘭', 'en': 'Netherlands' },
    aliases: [
      '荷兰', '荷蘭', '尼德兰', '尼德蘭', 'Netherlands', 'The Netherlands', 'Holland', 'NL', 'NLD',
      '阿姆斯特丹', '鹿特丹', '海牙', '乌得勒支', '烏特勒支', 'Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht'
    ]
  },
  {
    id: 'belgium',
    type: 'country',
    isoCode: 'BE',
    codes: { re: 'BE', tax: 'BE', econ: 'BEL' },
    names: { 'zh-CN': '比利时', 'zh-TW': '比利時', 'en': 'Belgium' },
    aliases: [
      '比利时', '比利時', 'Belgium', 'BE', 'BEL', '布鲁塞尔', '布魯塞爾', '安特卫普', '安特衛普', '根特', 'Brussels', 'Antwerp', 'Ghent'
    ]
  },
  {
    id: 'switzerland',
    type: 'country',
    isoCode: 'CH',
    codes: { re: 'CH', tax: 'CH', econ: 'CHE' },
    names: { 'zh-CN': '瑞士', 'zh-TW': '瑞士', 'en': 'Switzerland' },
    aliases: [
      '瑞士', 'Switzerland', 'Swiss Confederation', 'CH', 'CHE', '伯尔尼', '伯恩', '苏黎世', '蘇黎世', '日内瓦', '日內瓦', 'Bern', 'Zurich', 'Geneva'
    ]
  },
  {
    id: 'austria',
    type: 'country',
    isoCode: 'AT',
    codes: { re: 'AT', tax: 'AT', econ: 'AUT' },
    names: { 'zh-CN': '奥地利', 'zh-TW': '奧地利', 'en': 'Austria' },
    aliases: [
      '奥地利', '奧地利', 'Austria', 'AT', 'AUT', '维也纳', '維也納', '格拉茨', '萨尔茨堡', '薩爾茨堡', 'Vienna', 'Graz', 'Salzburg'
    ]
  },
  {
    id: 'sweden',
    type: 'country',
    isoCode: 'SE',
    codes: { re: 'SE', tax: 'SE', econ: 'SWE' },
    names: { 'zh-CN': '瑞典', 'zh-TW': '瑞典', 'en': 'Sweden' },
    aliases: [
      '瑞典', 'Sweden', 'SE', 'SWE', '斯德哥尔摩', '斯德哥爾摩', '哥德堡', '马尔默', '馬爾默', 'Stockholm', 'Gothenburg', 'Malmo'
    ]
  },
  {
    id: 'norway',
    type: 'country',
    isoCode: 'NO',
    codes: { re: 'NO', tax: 'NO', econ: 'NOR' },
    names: { 'zh-CN': '挪威', 'zh-TW': '挪威', 'en': 'Norway' },
    aliases: [
      '挪威', 'Norway', 'NO', 'NOR', '奥斯陆', '奧斯陸', '卑尔根', '卑爾根', '斯塔万格', 'Oslo', 'Bergen', 'Stavanger'
    ]
  },
  {
    id: 'denmark',
    type: 'country',
    isoCode: 'DK',
    codes: { re: 'DK', tax: 'DK', econ: 'DNK' },
    names: { 'zh-CN': '丹麦', 'zh-TW': '丹麥', 'en': 'Denmark' },
    aliases: [
      '丹麦', '丹麥', 'Denmark', 'DK', 'DNK', '哥本哈根', '奥胡斯', '奧胡斯', '欧登塞', '歐登塞', 'Copenhagen', 'Aarhus', 'Odense'
    ]
  },
  {
    id: 'finland',
    type: 'country',
    isoCode: 'FI',
    codes: { re: 'FI', tax: 'FI', econ: 'FIN' },
    names: { 'zh-CN': '芬兰', 'zh-TW': '芬蘭', 'en': 'Finland' },
    aliases: [
      '芬兰', '芬蘭', 'Finland', 'FI', 'FIN', '赫尔辛基', '赫爾辛基', '坦佩雷', '图尔库', '圖爾庫', 'Helsinki', 'Tampere', 'Turku'
    ]
  },
  {
    id: 'ireland',
    type: 'country',
    isoCode: 'IE',
    codes: { re: 'IE', tax: 'IE', econ: 'IRL' },
    names: { 'zh-CN': '爱尔兰', 'zh-TW': '愛爾蘭', 'en': 'Ireland' },
    aliases: [
      '爱尔兰', '愛爾蘭', 'Ireland', 'Republic of Ireland', 'IE', 'IRL', '都柏林', '科克', '戈尔韦', '戈爾韋', 'Dublin', 'Cork', 'Galway'
    ]
  },
  {
    id: 'portugal',
    type: 'country',
    isoCode: 'PT',
    codes: { re: 'PT', tax: 'PT', econ: 'PRT' },
    names: { 'zh-CN': '葡萄牙', 'zh-TW': '葡萄牙', 'en': 'Portugal' },
    aliases: [
      '葡萄牙', 'Portugal', 'PT', 'PRT', '里斯本', '波尔图', '波爾圖', '阿尔加维', '阿爾加維', 'Lisbon', 'Porto', 'Algarve'
    ]
  },
  {
    id: 'greece',
    type: 'country',
    isoCode: 'GR',
    codes: { re: 'GR', tax: 'GR', econ: 'GRC' },
    names: { 'zh-CN': '希腊', 'zh-TW': '希臘', 'en': 'Greece' },
    aliases: [
      '希腊', '希臘', 'Greece', 'Hellenic Republic', 'GR', 'GRC', '雅典', '塞萨洛尼基', '塞薩洛尼基', 'Athens', 'Thessaloniki'
    ]
  },
  {
    id: 'poland',
    type: 'country',
    isoCode: 'PL',
    codes: { re: 'PL', tax: 'PL', econ: 'POL' },
    names: { 'zh-CN': '波兰', 'zh-TW': '波蘭', 'en': 'Poland' },
    aliases: [
      '波兰', '波蘭', 'Poland', 'PL', 'POL', '华沙', '華沙', '克拉科夫', '弗罗茨瓦夫', '弗羅茨瓦夫', 'Warsaw', 'Krakow', 'Wroclaw'
    ]
  },
  {
    id: 'czechia',
    type: 'country',
    isoCode: 'CZ',
    codes: { re: 'CZ', tax: 'CZ', econ: 'CZE' },
    names: { 'zh-CN': '捷克', 'zh-TW': '捷克', 'en': 'Czechia' },
    aliases: [
      '捷克', '捷克共和国', '捷克共和國', 'Czechia', 'Czech Republic', 'CZ', 'CZE', '布拉格', '布尔诺', '布爾諾', 'Prague', 'Brno'
    ]
  },
  {
    id: 'hungary',
    type: 'country',
    isoCode: 'HU',
    codes: { re: 'HU', tax: 'HU', econ: 'HUN' },
    names: { 'zh-CN': '匈牙利', 'zh-TW': '匈牙利', 'en': 'Hungary' },
    aliases: [
      '匈牙利', 'Hungary', 'HU', 'HUN', '布达佩斯', '布達佩斯', '德布勒森', '塞格德', 'Budapest', 'Debrecen', 'Szeged'
    ]
  },
  {
    id: 'romania',
    type: 'country',
    isoCode: 'RO',
    codes: { re: 'RO', tax: 'RO', econ: 'ROU' },
    names: { 'zh-CN': '罗马尼亚', 'zh-TW': '羅馬尼亞', 'en': 'Romania' },
    aliases: [
      '罗马尼亚', '羅馬尼亞', 'Romania', 'RO', 'ROU', '布加勒斯特', '克卢日-纳波卡', '蒂米什瓦拉', 'Bucharest', 'Cluj-Napoca', 'Timisoara'
    ]
  },
  {
    id: 'mexico',
    type: 'country',
    isoCode: 'MX',
    codes: { re: 'MX', tax: 'MX', econ: 'MEX' },
    names: { 'zh-CN': '墨西哥', 'zh-TW': '墨西哥', 'en': 'Mexico' },
    aliases: [
      '墨西哥', 'Mexico', 'MX', 'MEX', '墨西哥城', '蒙特雷', '瓜达拉哈拉', '瓜達拉哈拉', 'Mexico City', 'CDMX', 'Monterrey', 'Guadalajara'
    ]
  },
  {
    id: 'brazil',
    type: 'country',
    isoCode: 'BR',
    codes: { re: 'BR', tax: 'BR', econ: 'BRA' },
    names: { 'zh-CN': '巴西', 'zh-TW': '巴西', 'en': 'Brazil' },
    aliases: [
      '巴西', 'Brazil', 'BR', 'BRA', '巴西利亚', '巴西利亞', '圣保罗', '聖保羅', '里约热内卢', '里約熱內盧', 'Brasilia', 'Sao Paulo', 'Rio de Janeiro'
    ]
  },
  {
    id: 'argentina',
    type: 'country',
    isoCode: 'AR',
    codes: { re: 'AR', tax: 'AR', econ: 'ARG' },
    names: { 'zh-CN': '阿根廷', 'zh-TW': '阿根廷', 'en': 'Argentina' },
    aliases: [
      '阿根廷', 'Argentina', 'AR', 'ARG', '布宜诺斯艾利斯', '布宜諾斯艾利斯', '科尔多瓦', '罗萨里奥', 'Buenos Aires', 'CABA', 'Cordoba', 'Rosario'
    ]
  },
  {
    id: 'chile',
    type: 'country',
    isoCode: 'CL',
    codes: { re: 'CL', tax: 'CL', econ: 'CHL' },
    names: { 'zh-CN': '智利', 'zh-TW': '智利', 'en': 'Chile' },
    aliases: [
      '智利', 'Chile', 'CL', 'CHL', '圣地亚哥', '聖地亞哥', '瓦尔帕莱索', '康塞普西翁', 'Santiago', 'Valparaiso', 'Concepcion'
    ]
  },
  {
    id: 'colombia',
    type: 'country',
    isoCode: 'CO',
    codes: { re: 'CO', tax: 'CO', econ: 'COL' },
    names: { 'zh-CN': '哥伦比亚', 'zh-TW': '哥倫比亞', 'en': 'Colombia' },
    aliases: [
      '哥伦比亚', '哥倫比亞', 'Colombia', 'CO', 'COL', '波哥大', '麦德林', '麥德林', '卡利', 'Bogota', 'Medellin', 'Cali'
    ]
  },
  {
    id: 'peru',
    type: 'country',
    isoCode: 'PE',
    codes: { re: 'PE', tax: 'PE', econ: 'PER' },
    names: { 'zh-CN': '秘鲁', 'zh-TW': '秘魯', 'en': 'Peru' },
    aliases: [
      '秘鲁', '秘魯', 'Peru', 'PE', 'PER', '利马', '利馬', '阿雷基帕', 'Lima', 'Arequipa'
    ]
  }
];

/**
 * 重点核心城市与都会区独立检索实体（指向其所属的经济体数据集代码，并在结果中按当前界面语言独立显示城市名）
 */
export const REGION_CITY_ENTITIES = [
  {
    id: 'taipei',
    type: 'region',
    parentCountryId: 'taiwan',
    isoCode: 'TPE',
    codes: { re: 'TW', tax: 'TW', econ: 'TWN' },
    names: { 'zh-CN': '台北', 'zh-TW': '臺北', 'en': 'Taipei' },
    subtitles: {
      'zh-CN': '中国台湾核心都会区 · Taipei (TW)',
      'zh-TW': '中國臺灣核心都會區 · Taipei (TW)',
      'en': 'Core Metropolis of Taiwan · TW / TWN'
    },
    aliases: ['台北', '臺北', '台北市', '臺北市', 'Taipei', 'Taipei City', 'TPE']
  },
  {
    id: 'new-york',
    type: 'region',
    parentCountryId: 'united-states',
    isoCode: 'NYC',
    codes: { re: 'US', tax: 'US', econ: 'USA' },
    names: { 'zh-CN': '纽约', 'zh-TW': '紐約', 'en': 'New York' },
    subtitles: {
      'zh-CN': '美国核心金融都会区 · New York (US)',
      'zh-TW': '美國核心金融都會區 · New York (US)',
      'en': 'Core Financial Metropolis of United States · US / USA'
    },
    aliases: ['纽约', '紐約', '纽约市', '紐約市', '曼哈顿', '曼哈頓', 'New York', 'New York City', 'NYC', 'Manhattan']
  },
  {
    id: 'london',
    type: 'region',
    parentCountryId: 'united-kingdom',
    isoCode: 'LON',
    codes: { re: 'GB', tax: 'GB', econ: 'GBR' },
    names: { 'zh-CN': '伦敦', 'zh-TW': '倫敦', 'en': 'London' },
    subtitles: {
      'zh-CN': '英国首都核心都会区 · London (UK)',
      'zh-TW': '英國首都核心都會區 · London (UK)',
      'en': 'Capital Metropolis of United Kingdom · UK / GB'
    },
    aliases: ['伦敦', '倫敦', '大伦敦', '大倫敦', 'London', 'Greater London', 'LON']
  },
  {
    id: 'tokyo',
    type: 'region',
    parentCountryId: 'japan',
    isoCode: 'TYO',
    codes: { re: 'JP', tax: 'JP', econ: 'JPN' },
    names: { 'zh-CN': '东京', 'zh-TW': '東京', 'en': 'Tokyo' },
    subtitles: {
      'zh-CN': '日本首都圈 · Tokyo (JP)',
      'zh-TW': '日本首都圈 · Tokyo (JP)',
      'en': 'Capital Metropolis of Japan · JP / JPN'
    },
    aliases: ['东京', '東京', '东京23区', '東京23區', '东京圈', '東京圈', 'Tokyo', 'Tokyo 23 Wards', 'Greater Tokyo']
  },
  {
    id: 'berlin',
    type: 'region',
    parentCountryId: 'germany',
    isoCode: 'BER',
    codes: { re: 'DE', tax: 'DE', econ: 'DEU' },
    names: { 'zh-CN': '柏林', 'zh-TW': '柏林', 'en': 'Berlin' },
    subtitles: {
      'zh-CN': '德国首都 · Berlin (DE)',
      'zh-TW': '德國首都 · Berlin (DE)',
      'en': 'Capital of Germany · DE / DEU'
    },
    aliases: ['柏林', 'Berlin', 'BER']
  },
  {
    id: 'paris',
    type: 'region',
    parentCountryId: 'france',
    isoCode: 'PAR',
    codes: { re: 'FR', tax: 'FR', econ: 'FRA' },
    names: { 'zh-CN': '巴黎', 'zh-TW': '巴黎', 'en': 'Paris' },
    subtitles: {
      'zh-CN': '法国首都都会区 · Paris (FR)',
      'zh-TW': '法國首都都會區 · Paris (FR)',
      'en': 'Capital Metropolis of France · FR / FRA'
    },
    aliases: ['巴黎', 'Paris', 'PAR']
  },
  {
    id: 'seoul',
    type: 'region',
    parentCountryId: 'south-korea',
    isoCode: 'SEL',
    codes: { re: 'KR', tax: 'KR', econ: 'KOR' },
    names: { 'zh-CN': '首尔', 'zh-TW': '首爾', 'en': 'Seoul' },
    subtitles: {
      'zh-CN': '韩国首都圈 · Seoul (KR)',
      'zh-TW': '韓國首都圈 · Seoul (KR)',
      'en': 'Capital Metropolis of South Korea · KR / KOR'
    },
    aliases: ['首尔', '首爾', '汉城', '漢城', 'Seoul', 'SEL']
  },
  {
    id: 'beijing',
    type: 'region',
    parentCountryId: 'mainland-china',
    isoCode: 'BJS',
    codes: { re: 'CN', tax: 'CN-ML', econ: 'CHN' },
    names: { 'zh-CN': '北京', 'zh-TW': '北京', 'en': 'Beijing' },
    subtitles: {
      'zh-CN': '中国大陆首都一线城市 · Beijing (CN)',
      'zh-TW': '中國大陸首都一線城市 · Beijing (CN)',
      'en': 'Capital Tier-1 City of Mainland China · CN / CHN'
    },
    aliases: ['北京', '北京市', 'Beijing', 'Peking', 'BJS']
  },
  {
    id: 'shanghai',
    type: 'region',
    parentCountryId: 'mainland-china',
    isoCode: 'SHA',
    codes: { re: 'CN', tax: 'CN-ML', econ: 'CHN' },
    names: { 'zh-CN': '上海', 'zh-TW': '上海', 'en': 'Shanghai' },
    subtitles: {
      'zh-CN': '中国大陆核心经济中心 · Shanghai (CN)',
      'zh-TW': '中國大陸核心經濟中心 · Shanghai (CN)',
      'en': 'Core Financial Hub of Mainland China · CN / CHN'
    },
    aliases: ['上海', '上海市', 'Shanghai', 'SHA']
  },
  {
    id: 'sydney',
    type: 'region',
    parentCountryId: 'australia',
    isoCode: 'SYD',
    codes: { re: 'AU', tax: null, econ: null },
    names: { 'zh-CN': '悉尼', 'zh-TW': '雪梨', 'en': 'Sydney' },
    subtitles: {
      'zh-CN': '澳大利亚第一大城市 · Sydney (AU)',
      'zh-TW': '澳大利亞第一大城市 · Sydney (AU)',
      'en': 'Largest Metropolis of Australia · AU'
    },
    aliases: ['悉尼', '雪梨', 'Sydney', 'SYD']
  }
];

/**
 * 三大研究板块全部核心指标、图表与专题的三语索引库
 */
export const INDICATOR_ENTITIES = [
  // ==================== 板块一：全球房地产研究 (Real Estate) ====================
  {
    id: 'ind-re-market',
    type: 'indicator-re',
    module: 'real-estate',
    targetId: 'section-real-estate',
    names: {
      'zh-CN': '房地产市场总览',
      'zh-TW': '房地產市場總覽',
      'en': 'Real Estate Market Overview'
    },
    subtitles: {
      'zh-CN': '第一板块：全球57国房地产市场、房价周期与可负担性 (1985–2026)',
      'zh-TW': '第一板塊：全球57國房地產市場、房價週期與可負擔性 (1985–2026)',
      'en': 'Module I: 57-Economy Housing Markets, Cycles & Affordability (1985–2026)'
    },
    aliases: [
      '房地产市场', '房地產市場', '房地产', '房地產', '楼市', '樓市', '房市',
      'Real Estate Market', 'Real Estate', 'Property Market', 'Housing Market'
    ]
  },
  {
    id: 'ind-re-price-index',
    type: 'indicator-re',
    module: 'real-estate',
    targetId: 're-layer-2',
    chartId: 'chart1',
    names: {
      'zh-CN': '房价指数与长期走势 (Housing Price Index)',
      'zh-TW': '房價指數與長期走勢 (Housing Price Index)',
      'en': 'Housing Price Index & Long-Term Trends'
    },
    subtitles: {
      'zh-CN': '第一板块 · 图1–图4：1985–2026名义/实际房价指数、累计涨幅与CAGR',
      'zh-TW': '第一板塊 · 圖1–圖4：1985–2026名義/實際房價指數、累計漲幅與CAGR',
      'en': 'Module I · Charts 1–4: 1985–2026 Nominal/Real House Price Indices & CAGR'
    },
    aliases: [
      '房价指数', '房價指數', '房价', '房價', '住宅价格', '住宅價格', '实际房价', '實際房價', '名义房价', '名義房價', '楼价', '樓價', '房价涨幅', '房價漲幅',
      'Housing Price', 'House Price', 'Housing Price Index', 'House Price Index', 'Property Price', 'Real House Price', 'Nominal House Price', 'RPP'
    ]
  },
  {
    id: 'ind-re-affordability',
    type: 'indicator-re',
    module: 'real-estate',
    targetId: 're-layer-1',
    chartId: 'chart6',
    names: {
      'zh-CN': '住房负担能力与房价收入比 (PIR)',
      'zh-TW': '住房負擔能力與房價收入比 (PIR)',
      'en': 'Housing Affordability & Price-to-Income Ratio (PIR)'
    },
    subtitles: {
      'zh-CN': '第一板块 · 第一层：房价收入比(PIR)、月供收入比与按揭负担模拟',
      'zh-TW': '第一板塊 · 第一層：房價收入比(PIR)、月供收入比與按揭負擔模擬',
      'en': 'Module I · Layer 1: Price-to-Income Ratio (PIR), Mortgage Burden & Simulator'
    },
    aliases: [
      '住房负担能力', '住房負擔能力', '住房可负担性', '住房可負擔性', '可负担性', '可負擔性', '房价收入比', '房價收入比', '房价所得比', '房價所得比', '购房负担', '購房負擔',
      'Housing Affordability', 'Affordability', 'Price to Income Ratio', 'Price-to-Income Ratio', 'PIR', 'Mortgage to Income'
    ]
  },
  {
    id: 'ind-re-rent',
    type: 'indicator-re',
    module: 'real-estate',
    targetId: 're-layer-3',
    chartId: 'chart7',
    names: {
      'zh-CN': '房屋租金、房价租金比与租金回报率 (PRR & Yield)',
      'zh-TW': '房屋租金、房價租金比與租金回報率 (PRR & Yield)',
      'en': 'Housing Rent, Price-to-Rent Ratio (PRR) & Rental Yield'
    },
    subtitles: {
      'zh-CN': '第一板块 · 第三层（图7–图8）：房价租金比(PRR)、毛租金收益率与租金占收入比',
      'zh-TW': '第一板塊 · 第三層（圖7–圖8）：房價租金比(PRR)、毛租金收益率與租金佔收入比',
      'en': 'Module I · Layer 3 (Charts 7–8): Price-to-Rent Ratio, Gross Rental Yield & Rent-to-Income'
    },
    aliases: [
      '房屋租金', '租金', '房租', '房价租金比', '房價租金比', '租售比', '租金回报率', '租金回報率', '租金收益率', '毛租金回报率', '租金收入比',
      'Housing Rent', 'Rent', 'Rental Yield', 'Gross Rental Yield', 'Price to Rent Ratio', 'Price-to-Rent Ratio', 'PRR', 'Rent to Income'
    ]
  },
  {
    id: 'ind-re-sales-supply',
    type: 'indicator-re',
    module: 'real-estate',
    targetId: 're-layer-3',
    chartId: 'chart9',
    names: {
      'zh-CN': '房屋销售、新建竣工、住房自有率与空置率',
      'zh-TW': '房屋銷售、新建竣工、住房自有率與空置率',
      'en': 'Housing Sales, Completions, Homeownership & Vacancy Rate'
    },
    subtitles: {
      'zh-CN': '第一板块 · 第三层（图9–图10）：住房存量、新开工/竣工、人均面积与空置率',
      'zh-TW': '第一板塊 · 第三層（圖9–圖10）：住房存量、新開工/竣工、人均面積與空置率',
      'en': 'Module I · Layer 3 (Charts 9–10): Housing Stock, Starts/Completions, Floor Space & Vacancy'
    },
    aliases: [
      '房屋销售', '房屋銷售', '住房供给', '住房供給', '新建住宅', '新开工', '新開工', '竣工', '住房自有率', '空置率', '人均住房面积', '人均面積',
      'Housing Sales', 'Home Sales', 'Housing Supply', 'Housing Starts', 'Completions', 'Homeownership', 'Homeownership Rate', 'Vacancy Rate', 'Floor Area per Capita'
    ]
  },
  {
    id: 'ind-re-investment',
    type: 'indicator-re',
    module: 'real-estate',
    targetId: 're-layer-4',
    chartId: 'chart13',
    names: {
      'zh-CN': '房地产投资占GDP比重与土地财政依赖度',
      'zh-TW': '房地產投資佔GDP比重與土地財政依賴度',
      'en': 'Real Estate Investment to GDP & Land Fiscal Reliance'
    },
    subtitles: {
      'zh-CN': '第一板块 · 第四层（图13）：各国房地产开发投资/GDP峰值对比与银行敞口',
      'zh-TW': '第一板塊 · 第四層（圖13）：各國房地產開發投資/GDP峰值對比與銀行敞口',
      'en': 'Module I · Layer 4 (Chart 13): Real Estate Investment Share of GDP & Bank Exposure'
    },
    aliases: [
      '房地产投资', '房地產投資', '地产投资', '地產投資', '土地财政', '土地財政', '房地产开发投资',
      'Real Estate Investment', 'Property Investment', 'Residential Investment', 'Land Finance', 'Land Fiscal Reliance'
    ]
  },
  {
    id: 'ind-re-mortgage-rate',
    type: 'indicator-re',
    module: 'real-estate',
    targetId: 're-layer-4',
    chartId: 'chart14',
    names: {
      'zh-CN': '房贷利率、按揭贷款与家庭部门债务杠杆',
      'zh-TW': '房貸利率、按揭貸款與家庭部門債務槓桿',
      'en': 'Mortgage Rate, Mortgage Loans & Household Debt Leverage'
    },
    subtitles: {
      'zh-CN': '第一板块 · 第四层（图11–图14）：房贷利率周期、按揭/GDP与居民债务/GDP',
      'zh-TW': '第一板塊 · 第四層（圖11–圖14）：房貸利率週期、按揭/GDP與居民債務/GDP',
      'en': 'Module I · Layer 4 (Charts 11–14): Mortgage Interest Rates, Mortgage/GDP & Household Debt/GDP'
    },
    aliases: [
      '房贷利率', '房貸利率', '按揭利率', '按揭贷款', '按揭貸款', '房贷', '房貸', '住房按揭', '居民债务', '居民債務', '家庭债务', '家庭債務', '涉房不良率',
      'Mortgage Rate', 'Mortgage Interest Rate', 'Mortgage Loan', 'Mortgage Debt', 'Household Debt', 'LTV'
    ]
  },

  // ==================== 板块二：全球综合税制研究 (Taxation) ====================
  {
    id: 'ind-tax-pit',
    type: 'indicator-tax',
    module: 'taxation',
    targetId: 'tax-layer-2',
    chartId: 'chart1PitTop',
    names: {
      'zh-CN': '个人所得税 (Personal Income Tax / PIT)',
      'zh-TW': '個人所得稅 (Personal Income Tax / PIT)',
      'en': 'Personal Income Tax (Income Tax / PIT)'
    },
    subtitles: {
      'zh-CN': '第二板块 · 图1–图2：最高法定边际税率 vs 5档收入实际有效个税率',
      'zh-TW': '第二板塊 · 圖1–圖2：最高法定邊際稅率 vs 5檔收入實際有效個稅率',
      'en': 'Module II · Charts 1–2: Top Statutory Marginal Rate vs 5-Tier Effective PIT Rate'
    },
    aliases: [
      '个人所得税', '個人所得稅', '所得税', '所得稅', '个税', '個稅', '综合所得税', '綜合所得稅', '综所税', '綜所稅', '边际税率', '邊際稅率',
      'Income Tax', 'Personal Income Tax', 'Individual Income Tax', 'PIT', 'Marginal Tax Rate', 'Effective Tax Rate'
    ]
  },
  {
    id: 'ind-tax-cit',
    type: 'indicator-tax',
    module: 'taxation',
    targetId: 'tax-layer-2',
    chartId: 'chartCorpIncidence',
    names: {
      'zh-CN': '企业所得税与税负转嫁 (Corporate Income Tax / CIT)',
      'zh-TW': '企業所得稅與稅負轉嫁 (Corporate Income Tax / CIT)',
      'en': 'Corporate Income Tax (Corporate Tax / CIT) & Incidence'
    },
    subtitles: {
      'zh-CN': '第二板块 · 第二层：法定企业所得税率、企业综合税负率与三方转嫁归宿',
      'zh-TW': '第二板塊 · 第二層：法定企業所得稅率、企業綜合稅負率與三方轉嫁歸宿',
      'en': 'Module II · Layer 2: Statutory CIT Rate, Total Corporate Tax Rate & Economic Incidence'
    },
    aliases: [
      '企业所得税', '企業所得稅', '公司税', '公司稅', '企业税', '企業稅', '营所税', '營所稅', '营利事业所得税', '營利事業所得稅',
      'Corporate Tax', 'Corporate Income Tax', 'Company Tax', 'Business Tax', 'CIT', 'Corporate Tax Rate'
    ]
  },
  {
    id: 'ind-tax-vat',
    type: 'indicator-tax',
    module: 'taxation',
    targetId: 'tax-layer-2',
    chartId: 'chart4VatEff',
    names: {
      'zh-CN': '增值税与商品服务税 (VAT / GST / Sales Tax)',
      'zh-TW': '增值稅與加值型營業稅 (VAT / GST / Sales Tax)',
      'en': 'Value-Added Tax (VAT / GST / Sales Tax)'
    },
    subtitles: {
      'zh-CN': '第二板块 · 图4：标准VAT/GST税率 vs 计入食品医疗豁免后的实际有效税率',
      'zh-TW': '第二板塊 · 圖4：標準VAT/GST稅率 vs 計入食品醫療豁免後的實際有效稅率',
      'en': 'Module II · Chart 4: Standard VAT/GST Rate vs Household Effective Consumption Tax Rate'
    },
    aliases: [
      '增值税', '增值稅', '加值税', '加值稅', '加值型营业税', '加值型營業稅', '商品及服务税', '商品及服務稅', '销售税', '銷售稅',
      'Value Added Tax', 'Value-Added Tax', 'VAT', 'GST', 'Sales Tax', 'Goods and Services Tax'
    ]
  },
  {
    id: 'ind-tax-consumption',
    type: 'indicator-tax',
    module: 'taxation',
    targetId: 'tax-layer-2',
    chartId: 'chartConsCategories',
    names: {
      'zh-CN': '消费税与7大日常消费场景税负 (Consumption & Excise Tax)',
      'zh-TW': '消費稅與7大日常消費場景稅負 (Consumption & Excise Tax)',
      'en': 'Consumption Tax, Excise Tax & 7 Daily Category Rates'
    },
    subtitles: {
      'zh-CN': '第二板块 · 第二层：食品、日用品、水电、燃油、医疗、教育、餐饮7类税率矩阵',
      'zh-TW': '第二板塊 · 第二層：食品、日用品、水電、燃油、醫療、教育、餐飲7類稅率矩陣',
      'en': 'Module II · Layer 2: Indirect Tax Rates Across Food, Utilities, Fuel, Healthcare & Dining'
    },
    aliases: [
      '消费税', '消費稅', '间接税', '間接稅', '特种消费税', '特種消費稅', '燃油税', '食品税率',
      'Consumption Tax', 'Excise Tax', 'Indirect Tax', 'Effective Consumption Rate'
    ]
  },
  {
    id: 'ind-tax-ssc',
    type: 'indicator-tax',
    module: 'taxation',
    targetId: 'tax-layer-2',
    chartId: 'chart3Ssc',
    names: {
      'zh-CN': '社会保险缴费与五险一金 (Social Security Contributions)',
      'zh-TW': '社會保險繳費與五險一金/公積金 (Social Security Contributions)',
      'en': 'Social Security Contributions (SSC / Provident Funds)'
    },
    subtitles: {
      'zh-CN': '第二板块 · 图3：雇员与雇主社保、养老医疗失业及住房公积金/CPF/MPF全拆解',
      'zh-TW': '第二板塊 · 圖3：僱員與僱主社保、養老醫療失業及住房公積金/CPF/MPF全拆解',
      'en': 'Module II · Chart 3: Employee & Employer Social Security, Pension, Health & Provident Funds'
    },
    aliases: [
      '社会保险缴费', '社會保險繳費', '社会保险', '社會保險', '社会保障', '社會保障', '社保', '五险一金', '五險一金', '住房公积金', '住房公積金', '公积金', '公積金', '强积金', '強積金', '劳保', '勞保', '健保',
      'Social Security', 'Social Security Contributions', 'SSC', 'Payroll Tax', 'Provident Fund', 'CPF', 'MPF'
    ]
  },
  {
    id: 'ind-tax-revenue',
    type: 'indicator-tax',
    module: 'taxation',
    targetId: 'tax-layer-1',
    chartId: 'chart6TaxGdpTrend',
    names: {
      'zh-CN': '税收收入与宏观税负 (Tax Revenue & Tax-to-GDP)',
      'zh-TW': '稅收收入與宏觀稅負 (Tax Revenue & Tax-to-GDP)',
      'en': 'Tax Revenue & Macro Tax-to-GDP Ratio (2000–2026)'
    },
    subtitles: {
      'zh-CN': '第二板块 · 图6–图7 & 第五层：2000–2026税收占GDP比重历史序列与结构堆叠',
      'zh-TW': '第二板塊 · 圖6–圖7 & 第五層：2000–2026稅收佔GDP比重歷史序列與結構堆疊',
      'en': 'Module II · Charts 6–7 & Layer 5: 2000–2026 Tax-to-GDP Historical Series & Structure Stack'
    },
    aliases: [
      '税收收入', '稅收收入', '宏观税负', '宏觀稅負', '税收占GDP', '稅收佔GDP', '财政收入', '財政收入',
      'Tax Revenue', 'Tax to GDP', 'Tax-to-GDP', 'Macro Tax Burden', 'Fiscal Revenue'
    ]
  },
  {
    id: 'ind-tax-wedge',
    type: 'indicator-tax',
    module: 'taxation',
    targetId: 'tax-layer-1',
    chartId: 'chart5Wedge',
    names: {
      'zh-CN': '税负指标与综合劳动税楔 (Labor Tax Wedge)',
      'zh-TW': '稅負指標與綜合勞動稅楔 (Labor Tax Wedge)',
      'en': 'Tax Burden Indicators & Labor Tax Wedge'
    },
    subtitles: {
      'zh-CN': '第二板块 · 图5 & 图8 & 第三层：OECD狭义/广义劳动税楔与8步购买力模拟',
      'zh-TW': '第二板塊 · 圖5 & 圖8 & 第三層：OECD狹義/廣義勞動稅楔與8步購買力模擬',
      'en': 'Module II · Charts 5 & 8 & Layer 3: OECD Narrow/Broad Labor Tax Wedge & 8-Step Simulator'
    },
    aliases: [
      '税负指标', '稅負指標', '综合劳动税楔', '綜合勞動稅楔', '劳动税楔', '勞動稅楔', '税楔', '稅楔', '税负', '稅負', '购买力模拟', '購買力模擬',
      'Tax Burden', 'Tax Wedge', 'Labor Tax Wedge', 'Total Tax Burden', 'After-Tax Purchasing Power'
    ]
  },

  // ==================== 板块三：全球经济发展轨迹 (Economic Development) ====================
  {
    id: 'ind-econ-gdp',
    type: 'indicator-econ',
    module: 'economy',
    targetId: 'econ-layer-1',
    chartId: 'chartMainTimeSeries',
    names: {
      'zh-CN': '国内生产总值与40年增长轨迹 (GDP / Real Growth)',
      'zh-TW': '國內生產總值與40年增長軌跡 (GDP / Real Growth)',
      'en': 'Gross Domestic Product (GDP) & 40-Year Growth Trajectory'
    },
    subtitles: {
      'zh-CN': '第三板块 · 第一层：1985–2026名义GDP、PPP GDP、实际增长倍数与全球份额',
      'zh-TW': '第三板塊 · 第一層：1985–2026名義GDP、PPP GDP、實際增長倍數與全球份額',
      'en': 'Module III · Layer 1: 1985–2026 Nominal GDP, PPP GDP, Real Growth Multipliers & Global Shares'
    },
    aliases: [
      'GDP', '国内生产总值', '國內生產總值', '名义GDP', '名義GDP', '实际GDP', '實際GDP', '经济总量', '經濟總量', '经济增长率', '經濟增長率',
      'Gross Domestic Product', 'Nominal GDP', 'Real GDP', 'PPP GDP', 'Economic Growth', 'GDP Growth'
    ]
  },
  {
    id: 'ind-econ-gdp-pc',
    type: 'indicator-econ',
    module: 'economy',
    targetId: 'econ-layer-1',
    chartId: 'chartPopVsPcScatter',
    names: {
      'zh-CN': '人均国内生产总值 (GDP per capita — Nominal & PPP)',
      'zh-TW': '人均國內生產總值 (GDP per capita — Nominal & PPP)',
      'en': 'GDP per Capita (Nominal US$ & PPP Intl$)'
    },
    subtitles: {
      'zh-CN': '第三板块 · 第一层：1985–2026名义人均GDP、PPP人均产出与排名跃迁榜',
      'zh-TW': '第三板塊 · 第一層：1985–2026名義人均GDP、PPP人均產出與排名躍遷榜',
      'en': 'Module III · Layer 1: 1985–2026 Nominal & PPP GDP per Capita & Global Ranking Shifts'
    },
    aliases: [
      'GDP per capita', '人均GDP', '人均国内生产总值', '人均國內生產總值', '人均经济产出', '人均經濟產出', '人均产出', '人均產出',
      'Per Capita GDP', 'GDP per person', 'Output per capita', 'PPP per capita'
    ]
  },
  {
    id: 'ind-econ-cpi-inflation',
    type: 'indicator-econ',
    module: 'economy',
    targetId: 'econ-layer-4',
    chartId: 'chartInflationHistory',
    names: {
      'zh-CN': '通货膨胀与消费者物价指数 (CPI & Inflation)',
      'zh-TW': '通貨膨脹與消費者物價指數 (CPI & Inflation)',
      'en': 'CPI & Inflation Long-Term Trajectory (1985–2026)'
    },
    subtitles: {
      'zh-CN': '第三板块 · 第四层：1985–2026年CPI通胀率轨迹与重大通胀/通缩事件',
      'zh-TW': '第三板塊 · 第四層：1985–2026年CPI通膨率軌跡與重大通膨/通縮事件',
      'en': 'Module III · Layer 4: 1985–2026 Annual CPI Inflation (%) Trajectory & Price Shocks'
    },
    aliases: [
      'CPI', 'Inflation', '通货膨胀', '通貨膨脹', '通胀', '通膨', '通胀率', '通膨率', '消费者物价指数', '消費者物價指數', '物价指数', '物價指數', '通缩', '通縮',
      'Consumer Price Index', 'Inflation Rate', 'Deflation', 'Price Level'
    ]
  },
  {
    id: 'ind-econ-unemployment',
    type: 'indicator-econ',
    module: 'economy',
    targetId: 'econ-layer-2',
    chartId: 'chartLaborScatter',
    names: {
      'zh-CN': '失业率、青年失业率与就业质量 (Unemployment & Labor)',
      'zh-TW': '失業率、青年失業率與就業質量 (Unemployment & Labor)',
      'en': 'Unemployment Rate, Youth Unemployment & Employment Quality'
    },
    subtitles: {
      'zh-CN': '第三板块 · 第二层：每小时劳动生产率 vs 总失业率、青年失业率与劳动参与率',
      'zh-TW': '第三板塊 · 第二層：每小時勞動生產率 vs 總失業率、青年失業率與勞動參與率',
      'en': 'Module III · Layer 2: Labor Productivity vs Total/Youth Unemployment & Participation Rate'
    },
    aliases: [
      'Unemployment', '失业率', '失業率', '青年失业率', '青年失業率', '失业', '失業', '就业率', '就業率', '就业质量', '就業質量', '劳动参与率', '勞動參與率',
      'Unemployment Rate', 'Youth Unemployment', 'Jobless Rate', 'Employment Rate', 'Labor Force Participation'
    ]
  },
  {
    id: 'ind-econ-gov-debt',
    type: 'indicator-econ',
    module: 'economy',
    targetId: 'econ-layer-4',
    chartId: 'chartDebtStacked',
    names: {
      'zh-CN': '政府债务与三部门宏观杠杆率 (Government & Macro Debt)',
      'zh-TW': '政府債務與三部門宏觀槓桿率 (Government & Macro Debt)',
      'en': 'Government Debt & 3-Sector Macro Leverage (% of GDP)'
    },
    subtitles: {
      'zh-CN': '第三板块 · 第四层：政府债务 + 居民债务 + 非金融企业债务占GDP比重与财政赤字',
      'zh-TW': '第三板塊 · 第四層：政府債務 + 居民債務 + 非金融企業債務佔GDP比重與財政赤字',
      'en': 'Module III · Layer 4: Government + Household + Corporate Debt to GDP & Fiscal Sustainability'
    },
    aliases: [
      'Government Debt', '政府债务', '政府債務', '公共债务', '公共債務', '主权债务', '主權債務', '国债', '國債', '宏观杠杆率', '宏觀槓桿率', '企业债务', '企業債務', '财政赤字', '財政赤字',
      'Public Debt', 'Sovereign Debt', 'National Debt', 'Debt to GDP', 'Debt-to-GDP', 'Macro Leverage', 'Fiscal Deficit'
    ]
  },
  {
    id: 'ind-econ-trade',
    type: 'indicator-econ',
    module: 'economy',
    targetId: 'econ-layer-3',
    chartId: 'chartMfgComparison',
    names: {
      'zh-CN': '国际贸易、高技术出口与经常账户 (International Trade)',
      'zh-TW': '國際貿易、高技術出口與經常帳戶 (International Trade)',
      'en': 'International Trade, High-Tech Exports & Current Account'
    },
    subtitles: {
      'zh-CN': '第三板块 · 第三层 & 第四层：出口依赖度、高技术制成品出口占比、经常账户与外汇储备',
      'zh-TW': '第三板塊 · 第三層 & 第四層：出口依賴度、高技術製成品出口佔比、經常帳戶與外匯儲備',
      'en': 'Module III · Layers 3 & 4: Export Share, High-Tech Exports, Current Account & FX Reserves'
    },
    aliases: [
      'International Trade', '国际贸易', '國際貿易', '贸易', '貿易', '出口', '进口', '進口', '高技术出口', '高技術出口', '经常账户', '經常帳戶', '外汇储备', '外匯儲備',
      'Trade', 'Exports', 'Imports', 'High-Tech Exports', 'Current Account', 'Foreign Exchange Reserves', 'FX Reserves'
    ]
  },
  {
    id: 'ind-econ-population',
    type: 'indicator-econ',
    module: 'economy',
    targetId: 'econ-layer-4',
    chartId: 'chartDemoScatter',
    names: {
      'zh-CN': '人口结构、生育率与老龄化 (Population & Demographics)',
      'zh-TW': '人口結構、生育率與老齡化 (Population & Demographics)',
      'en': 'Population, Total Fertility Rate (TFR) & Aging Structure'
    },
    subtitles: {
      'zh-CN': '第三板块 · 第四层：总人口、2026生育率(TFR)、65岁+老龄化率、劳动年龄人口与潜在增速',
      'zh-TW': '第三板塊 · 第四層：總人口、2026生育率(TFR)、65歲+老齡化率、勞動年齡人口與潛在增速',
      'en': 'Module III · Layer 4: Total Population, TFR, 65+ Aging Rate, Working-Age Share & Potential Growth'
    },
    aliases: [
      'Population', '人口', '总人口', '總人口', '人口结构', '人口結構', '生育率', '总和生育率', '總和生育率', '老龄化', '老齡化', '劳动年龄人口', '勞動年齡人口',
      'Demographics', 'Fertility Rate', 'TFR', 'Aging Rate', 'Working-Age Population'
    ]
  },
  {
    id: 'ind-econ-income-productivity',
    type: 'indicator-econ',
    module: 'economy',
    targetId: 'econ-layer-2',
    chartId: 'chartWagesComparison',
    names: {
      'zh-CN': '居民可支配收入、工资中位数与劳动生产率',
      'zh-TW': '居民可支配收入、工資中位數與勞動生產率',
      'en': 'Disposable Income, Mean/Median Wages & Labor Productivity'
    },
    subtitles: {
      'zh-CN': '第三板块 · 第二层：平均工资 vs 中位数工资、人均可支配收入、基尼系数与每小时产出',
      'zh-TW': '第三板塊 · 第二層：平均工資 vs 中位數工資、人均可支配收入、基尼係數與每小時產出',
      'en': 'Module III · Layer 2: Mean vs Median Wage, Disposable Income, Gini & Output per Hour'
    },
    aliases: [
      '人均可支配收入', '可支配收入', '平均工资', '平均工資', '中位数工资', '中位數工資', '劳动生产率', '勞動生產率', '每小时产出', '基尼系数', '基尼係數',
      'Disposable Income', 'Mean Wage', 'Median Wage', 'Wages', 'Labor Productivity', 'Productivity', 'Gini Coefficient', 'Gini'
    ]
  },
  {
    id: 'ind-econ-sectors',
    type: 'indicator-econ',
    module: 'economy',
    targetId: 'econ-layer-3',
    chartId: 'chartSectorAreaPrimary',
    names: {
      'zh-CN': '三次产业结构演进与制造业占比 (Industrial Structure)',
      'zh-TW': '三次產業結構演進與製造業佔比 (Industrial Structure)',
      'en': 'Three-Sector Evolution & Manufacturing Share of GDP'
    },
    subtitles: {
      'zh-CN': '第三板块 · 第三层：1985–2026第一/二/三产业占GDP堆叠面积图与工业化/去工业化诊断',
      'zh-TW': '第三板塊 · 第三層：1985–2026第一/二/三產業佔GDP堆疊面積圖與工業化/去工業化診斷',
      'en': 'Module III · Layer 3: 1985–2026 Primary/Secondary/Tertiary Sector Area Charts & Manufacturing'
    },
    aliases: [
      '三次产业结构', '三次產業結構', '产业结构', '產業結構', '制造业', '製造業', '服务业', '服務業', '工业化', '工業化', '去工业化', '去工業化',
      'Industrial Structure', 'Three-Sector Structure', 'Manufacturing', 'Services Sector', 'Industrialization', 'Deindustrialization'
    ]
  }
];

/**
 * 构建预处理后的内存搜索索引类（仅在启动时构建一次）
 */
class SearchIndex {
  constructor() {
    this._built = false;
    /** @type {Array<Object>} */
    this.entities = [];
    /** @type {Map<string, Object>} */
    this.byId = new Map();
    /** @type {Map<string, Object>} */
    this.byReCode = new Map();
    /** @type {Map<string, Object>} */
    this.byTaxId = new Map();
    /** @type {Map<string, Object>} */
    this.byEconId = new Map();
  }

  /**
   * 结合静态实体主表与三大板块 JSON 数据构建预标准化索引（幂等，只执行一次）
   * @param {{ realEstate?: Object, taxation?: Object, economy?: Object }} [datasets]
   */
  build(datasets = {}) {
    if (this._built && this.entities.length > 0) {
      return this;
    }

    this.entities = [];
    this.byId.clear();
    this.byReCode.clear();
    this.byTaxId.clear();
    this.byEconId.clear();

    // 1. 收集来自 JSON 数据的额外城市/区域别名补充到对应国家实体
    const extraReAliasesByCode = new Map();
    if (datasets.realEstate && Array.isArray(datasets.realEstate.countries)) {
      for (const c of datasets.realEstate.countries) {
        const list = [];
        if (c.name) list.push(c.name);
        if (c.capital) {
          c.capital.split('/').forEach(s => list.push(s.trim()));
        }
        if (c.majorCity) {
          c.majorCity.split('/').forEach(s => list.push(s.trim()));
        }
        extraReAliasesByCode.set(c.code, list);
      }
    }

    // 2. 索引 57 个国家与地区实体
    for (const raw of COUNTRY_ENTITIES) {
      const extra = raw.codes?.re ? (extraReAliasesByCode.get(raw.codes.re) || []) : [];
      const mergedAliases = Array.from(new Set([
        raw.names['zh-CN'],
        raw.names['zh-TW'],
        raw.names.en,
        ...(raw.fullNames ? Object.values(raw.fullNames) : []),
        ...(raw.aliases || []),
        ...extra
      ].filter(Boolean)));

      const prepared = this._prepareEntity({
        ...raw,
        aliases: mergedAliases
      });

      this.entities.push(prepared);
      this.byId.set(prepared.id, prepared);
      if (prepared.codes?.re) this.byReCode.set(prepared.codes.re, prepared);
      if (prepared.codes?.tax) this.byTaxId.set(prepared.codes.tax, prepared);
      if (prepared.codes?.econ) this.byEconId.set(prepared.codes.econ, prepared);
    }

    // 3. 索引重点核心城市与都会区实体
    for (const rawCity of REGION_CITY_ENTITIES) {
      const mergedAliases = Array.from(new Set([
        rawCity.names['zh-CN'],
        rawCity.names['zh-TW'],
        rawCity.names.en,
        ...(rawCity.aliases || [])
      ].filter(Boolean)));

      const prepared = this._prepareEntity({
        ...rawCity,
        aliases: mergedAliases
      });
      this.entities.push(prepared);
      this.byId.set(prepared.id, prepared);
    }

    // 4. 索引三大研究板块核心指标与专题
    for (const rawInd of INDICATOR_ENTITIES) {
      const mergedAliases = Array.from(new Set([
        rawInd.names['zh-CN'],
        rawInd.names['zh-TW'],
        rawInd.names.en,
        ...(rawInd.aliases || [])
      ].filter(Boolean)));

      const prepared = this._prepareEntity({
        ...rawInd,
        aliases: mergedAliases
      });
      this.entities.push(prepared);
      this.byId.set(prepared.id, prepared);
    }

    this._built = true;
    return this;
  }

  /**
   * 预计算实体的所有标准化词条以加速实时匹配
   */
  _prepareEntity(entity) {
    const primaryNorms = [
      normalizeSearchInput(entity.names['zh-CN']),
      normalizeSearchInput(entity.names['zh-TW']),
      normalizeSearchInput(entity.names.en)
    ];

    if (entity.fullNames) {
      for (const fn of Object.values(entity.fullNames)) {
        primaryNorms.push(normalizeSearchInput(fn));
      }
    }

    const aliasNorms = (entity.aliases || []).map(a => normalizeSearchInput(a)).filter(n => !n.isEmpty);

    return {
      ...entity,
      _primaryNorms: primaryNorms,
      _aliasNorms: aliasNorms
    };
  }
}

export const searchIndex = new SearchIndex();
export default searchIndex;
