/**
 * 数据获取模块
 * 获取携程(TCOM)和Booking(BKNG)的财务数据
 */

import fetch from 'node-fetch';

const TICKERS = {
  CTRIP: 'TCOM',    // 携程
  BOOKING: 'BKNG'   // Booking Holdings
};

/**
 * 获取股票历史价格数据
 */
async function fetchHistoricalPrices(ticker, years = 10) {
  const endDate = Math.floor(Date.now() / 1000);
  const startDate = Math.floor(Date.now() / 1000) - (years * 365 * 24 * 60 * 60);
  
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${startDate}&period2=${endDate}&interval=1mo&events=history`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.chart?.result?.[0]) {
      console.error(`无法获取 ${ticker} 的价格数据`);
      return null;
    }
    
    const result = data.chart.result[0];
    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    
    const prices = timestamps.map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      year: new Date(ts * 1000).getFullYear(),
      open: quotes.open?.[i] || null,
      high: quotes.high?.[i] || null,
      low: quotes.low?.[i] || null,
      close: quotes.close?.[i] || null,
      volume: quotes.volume?.[i] || null
    })).filter(p => p.close !== null);
    
    return prices;
  } catch (error) {
    console.error(`获取 ${ticker} 价格数据失败:`, error.message);
    return null;
  }
}

/**
 * 获取财务数据（营收、利润等）
 * Yahoo Finance API的财务数据端点
 */
async function fetchFinancialData(ticker) {
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=incomeStatementHistory,earningsTrend,defaultKeyStatistics,financialData`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.quoteSummary?.result?.[0]) {
      console.error(`无法获取 ${ticker} 的财务数据`);
      return null;
    }
    
    const result = data.quoteSummary.result[0];
    
    return {
      incomeHistory: result.incomeStatementHistory?.incomeStatementHistory || [],
      earningsTrend: result.earningsTrend?.trend || [],
      keyStats: result.defaultKeyStatistics || {},
      financialData: result.financialData || {}
    };
  } catch (error) {
    console.error(`获取 ${ticker} 财务数据失败:`, error.message);
    return null;
  }
}

/**
 * 计算年度数据汇总
 */
function calculateYearlyData(prices, financialData) {
  const yearlyMap = new Map();
  
  // 按年份汇总价格数据
  prices.forEach(p => {
    if (!yearlyMap.has(p.year)) {
      yearlyMap.set(p.year, {
        year: p.year,
        prices: [],
        volumes: []
      });
    }
    const yearData = yearlyMap.get(p.year);
    yearData.prices.push(p.close);
    yearData.volumes.push(p.volume);
  });
  
  // 计算年度统计
  const yearlyStats = [];
  for (const [year, data] of yearlyMap) {
    const prices = data.prices.filter(p => p !== null);
    if (prices.length === 0) continue;
    
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const startPrice = prices[0];
    const endPrice = prices[prices.length - 1];
    const highPrice = Math.max(...prices);
    const lowPrice = Math.min(...prices);
    
    // 计算年化波动率（基于月度数据）
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      if (prices[i - 1] && prices[i]) {
        returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
      }
    }
    
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance * 12); // 年化波动率
    
    yearlyStats.push({
      year,
      startPrice,
      endPrice,
      avgPrice,
      highPrice,
      lowPrice,
      yearlyReturn: startPrice ? ((endPrice - startPrice) / startPrice) : null,
      volatility: volatility || 0
    });
  }
  
  return yearlyStats.sort((a, b) => a.year - b.year);
}

/**
 * 从财务数据中提取年度财务指标
 */
function extractFinancialMetrics(financialData) {
  if (!financialData?.incomeHistory) return [];
  
  const metrics = [];
  
  financialData.incomeHistory.forEach(statement => {
    const endDate = statement.endDate;
    if (!endDate) return;
    
    const year = new Date(endDate * 1000).getFullYear();
    const revenue = statement.totalRevenue?.raw || null;
    const netIncome = statement.netIncome?.raw || null;
    const grossProfit = statement.grossProfit?.raw || null;
    const operatingIncome = statement.operatingIncome?.raw || null;
    
    // 计算利润率
    const netMargin = revenue && netIncome ? netIncome / revenue : null;
    const grossMargin = revenue && grossProfit ? grossProfit / revenue : null;
    const operatingMargin = revenue && operatingIncome ? operatingIncome / revenue : null;
    
    metrics.push({
      year,
      revenue,
      netIncome,
      grossProfit,
      operatingIncome,
      netMargin,
      grossMargin,
      operatingMargin
    });
  });
  
  return metrics.sort((a, b) => a.year - b.year);
}

/**
 * 获取完整的股票数据
 */
export async function fetchStockData(ticker, years = 10) {
  console.log(`正在获取 ${ticker} 的数据...`);
  
  const [prices, financialData] = await Promise.all([
    fetchHistoricalPrices(ticker, years),
    fetchFinancialData(ticker)
  ]);
  
  if (!prices) {
    throw new Error(`无法获取 ${ticker} 的价格数据`);
  }
  
  const yearlyPriceStats = calculateYearlyData(prices, financialData);
  const financialMetrics = extractFinancialMetrics(financialData);
  
  // 获取当前市盈率
  const currentPE = financialData?.keyStats?.trailingPE?.raw || null;
  const forwardPE = financialData?.keyStats?.forwardPE?.raw || null;
  const marketCap = financialData?.keyStats?.marketCap?.raw || null;
  const eps = financialData?.keyStats?.trailingEps?.raw || null;
  
  return {
    ticker,
    currentPE,
    forwardPE,
    marketCap,
    eps,
    yearlyPriceStats,
    financialMetrics,
    monthlyPrices: prices
  };
}

/**
 * 获取携程和Booking的所有数据
 */
export async function fetchAllData() {
  console.log('开始获取携程和Booking的数据...\n');
  
  const [ctripData, bookingData] = await Promise.all([
    fetchStockData(TICKERS.CTRIP, 10),
    fetchStockData(TICKERS.BOOKING, 10)
  ]);
  
  console.log('\n数据获取完成！');
  console.log(`携程: ${ctripData.yearlyPriceStats.length} 年价格数据, ${ctripData.financialMetrics.length} 年财务数据`);
  console.log(`Booking: ${bookingData.yearlyPriceStats.length} 年价格数据, ${bookingData.financialMetrics.length} 年财务数据`);
  
  return { ctripData, bookingData };
}

export { TICKERS };
