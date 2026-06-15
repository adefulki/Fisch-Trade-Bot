/**
 * Chart generation service using QuickChart.io API.
 * Uses POST endpoint to generate short URLs (avoids URL length limits).
 */

const axios = require("axios");

const API_URL = "https://quickchart.io/chart/create";

/**
 * Create a short chart URL via QuickChart POST API.
 * @param {object} chartConfig - Chart.js configuration object
 * @returns {string|null} Short URL to the chart image, or null on failure
 */
async function createChartUrl(chartConfig) {
  try {
    const response = await axios.post(API_URL, {
      chart: chartConfig,
      width: 600,
      height: 300,
      backgroundColor: "#232428",
      format: "png",
    }, { timeout: 10000 });

    if (response.data && response.data.url) {
      return response.data.url;
    }
    return null;
  } catch (error) {
    console.error("⚠️ Chart generation failed:", error.message);
    return null;
  }
}

/**
 * Build a dual-line chart showing TrueVal and Trade Hub over time.
 * @param {string} itemName - The item name (used as chart title)
 * @param {Array<{date: string, trueVal: number|null, tradeHub: number|null}>} dataPoints - Data points
 * @returns {Promise<string|null>} Short URL to the chart image
 */
async function buildValueChartUrl(itemName, dataPoints) {
  if (dataPoints.length === 0) return null;

  const labels = dataPoints.map((p) => p.date);
  const trueValData = dataPoints.map((p) => p.trueVal || null);
  const tradeHubData = dataPoints.map((p) => p.tradeHub || null);

  const chartConfig = {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "TrueVal",
          data: trueValData,
          borderColor: "#00ff88",
          backgroundColor: "rgba(0, 255, 136, 0.05)",
          fill: false,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: "#00ff88",
          spanGaps: true,
        },
        {
          label: "Trade Hub",
          data: tradeHubData,
          borderColor: "#ff6b6b",
          backgroundColor: "rgba(255, 107, 107, 0.05)",
          fill: false,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: "#ff6b6b",
          spanGaps: true,
        },
      ],
    },
    options: {
      title: { display: true, text: `${itemName} — TrueVal & Trade Hub`, fontSize: 14, fontColor: "#ffffff" },
      legend: { labels: { fontColor: "#cccccc" } },
      scales: {
        xAxes: [{ ticks: { fontColor: "#aaaaaa", maxTicksLimit: 10 }, gridLines: { color: "rgba(255,255,255,0.1)" } }],
        yAxes: [{ ticks: { fontColor: "#aaaaaa", callback: (val) => val >= 1000000 ? `${(val/1000000).toFixed(1)}M` : val >= 1000 ? `${(val/1000).toFixed(0)}K` : val }, gridLines: { color: "rgba(255,255,255,0.1)" } }],
      },
    },
  };

  return await createChartUrl(chartConfig);
}

/**
 * Build a single-line chart showing Proto value over time.
 * @param {string} itemName - The item name (used as chart title)
 * @param {Array<{date: string, proto: number|null}>} dataPoints - Data points
 * @returns {Promise<string|null>} Short URL to the chart image
 */
async function buildProtoChartUrl(itemName, dataPoints) {
  if (dataPoints.length === 0) return null;

  const labels = dataPoints.map((p) => p.date);
  const protoData = dataPoints.map((p) => p.proto || null);

  const chartConfig = {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Proto",
          data: protoData,
          borderColor: "#ffd700",
          backgroundColor: "rgba(255, 215, 0, 0.1)",
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: "#ffd700",
          spanGaps: true,
        },
      ],
    },
    options: {
      title: { display: true, text: `${itemName} — Proto Value`, fontSize: 14, fontColor: "#ffffff" },
      legend: { labels: { fontColor: "#cccccc" } },
      scales: {
        xAxes: [{ ticks: { fontColor: "#aaaaaa", maxTicksLimit: 10 }, gridLines: { color: "rgba(255,255,255,0.1)" } }],
        yAxes: [{ ticks: { fontColor: "#aaaaaa" }, gridLines: { color: "rgba(255,255,255,0.1)" } }],
      },
    },
  };

  return await createChartUrl(chartConfig);
}

module.exports = { buildValueChartUrl, buildProtoChartUrl };
