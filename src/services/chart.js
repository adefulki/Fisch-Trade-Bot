/**
 * Chart generation service using QuickChart.io API.
 * Generates chart image URLs for Discord embeds.
 */

const BASE_URL = "https://quickchart.io/chart";

/**
 * Build a QuickChart URL for a line chart showing price history over time.
 * @param {string} itemName - The item name (used as chart title)
 * @param {Array<{date: string, value: number}>} dataPoints - Array of {date, value} points
 * @param {string} [valueLabel="TrueVal"] - Label for the value axis
 * @returns {string} URL to the rendered chart image
 */
function buildPriceChartUrl(itemName, dataPoints, valueLabel = "TrueVal") {
  if (dataPoints.length === 0) return null;

  const labels = dataPoints.map((p) => p.date);
  const values = dataPoints.map((p) => p.value);

  const chartConfig = {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: `${itemName} (${valueLabel})`,
          data: values,
          borderColor: "#1e90ff",
          backgroundColor: "rgba(30, 144, 255, 0.1)",
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: "#1e90ff",
        },
      ],
    },
    options: {
      title: {
        display: true,
        text: `${itemName} — Price History`,
        fontSize: 16,
        fontColor: "#ffffff",
      },
      legend: {
        labels: { fontColor: "#cccccc" },
      },
      scales: {
        xAxes: [{
          ticks: { fontColor: "#aaaaaa", maxTicksLimit: 10 },
          gridLines: { color: "rgba(255,255,255,0.1)" },
        }],
        yAxes: [{
          ticks: {
            fontColor: "#aaaaaa",
            callback: (val) => {
              if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
              if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
              return val;
            },
          },
          gridLines: { color: "rgba(255,255,255,0.1)" },
        }],
      },
    },
  };

  // Encode chart config as URL
  const chartJson = encodeURIComponent(JSON.stringify(chartConfig));
  return `${BASE_URL}?c=${chartJson}&w=600&h=300&bkg=%23232428&f=png`;
}

/**
 * Build a QuickChart URL for a comparison bar chart (e.g. trade sides).
 * @param {Array<{name: string, value: number}>} leftItems - User's items
 * @param {Array<{name: string, value: number}>} rightItems - Their items
 * @returns {string} URL to the rendered chart image
 */
function buildTradeComparisonUrl(leftItems, rightItems) {
  const allNames = [
    ...leftItems.map((i) => i.name),
    ...rightItems.map((i) => i.name),
  ];

  const leftValues = allNames.map((name) => {
    const item = leftItems.find((i) => i.name === name);
    return item ? item.value : 0;
  });

  const rightValues = allNames.map((name) => {
    const item = rightItems.find((i) => i.name === name);
    return item ? item.value : 0;
  });

  const chartConfig = {
    type: "bar",
    data: {
      labels: allNames,
      datasets: [
        {
          label: "Your Offer",
          data: leftValues,
          backgroundColor: "rgba(255, 99, 132, 0.7)",
        },
        {
          label: "Their Offer",
          data: rightValues,
          backgroundColor: "rgba(75, 192, 192, 0.7)",
        },
      ],
    },
    options: {
      title: { display: true, text: "Trade Comparison", fontSize: 14, fontColor: "#ffffff" },
      legend: { labels: { fontColor: "#cccccc" } },
      scales: {
        xAxes: [{ ticks: { fontColor: "#aaaaaa" }, gridLines: { color: "rgba(255,255,255,0.1)" } }],
        yAxes: [{
          ticks: {
            fontColor: "#aaaaaa",
            callback: (val) => {
              if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
              if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
              return val;
            },
          },
          gridLines: { color: "rgba(255,255,255,0.1)" },
        }],
      },
    },
  };

  const chartJson = encodeURIComponent(JSON.stringify(chartConfig));
  return `${BASE_URL}?c=${chartJson}&w=600&h=300&bkg=%23232428&f=png`;
}

module.exports = { buildPriceChartUrl, buildTradeComparisonUrl };
