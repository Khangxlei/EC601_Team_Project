import React, { useState } from "react";
import axios from "axios";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  annotationPlugin
);

const App = () => {
  const [ticker, setTicker] = useState("");
  const [period, setPeriod] = useState("1y");
  const [balance, setBalance] = useState(10000);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ticker.trim()) {
      setError("Ticker symbol is required");
      return;
    }
    try {
      setError(null);
      setLoading(true);
      const response = await axios.post("http://127.0.0.1:8000/api/predict", {
        ticker,
        period,
        initial_balance: parseFloat(balance),
      });
      setResults(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getChartData = () => {
    if (!results) return null;

    const dates = results.predictions_basic.map((pred) => pred.date);
    const actualPrices = results.predictions_basic.map((pred) =>
      pred.actual !== null ? pred.actual : null
    );
    const basicPredictions = results.predictions_basic.map((pred) => pred.predicted);
    const enhancedPredictions = results.predictions_enhanced.map((pred) => pred.predicted);

    const basicTradingPoints = results.trade_log_basic.map(trade => ({
      x: trade.date,
      y: trade.price,
      action: trade.action
    }));

    const enhancedTradingPoints = results.trade_log_enhanced.map(trade => ({
      x: trade.date,
      y: trade.price,
      action: trade.action
    }));

    return {
      labels: dates,
      datasets: [
        {
          label: "Basic Model Predictions",
          data: basicPredictions,
          borderColor: "#4F46E5",
          backgroundColor: "rgba(79, 70, 229, 0.1)",
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5,
        },
        {
          label: "Basic Model Trades",
          data: basicTradingPoints,
          borderColor: "transparent",
          pointStyle: 'circle',
          pointRadius: 6,
          pointBackgroundColor: (context) => {
            const point = basicTradingPoints[context.dataIndex];
            return point?.action === "Bought" ? "#22C55E" : "#EF4444";
          },
          pointBorderColor: "white",
          pointBorderWidth: 2,
          showLine: false,
        },
        {
          label: "Enhanced Model Predictions",
          data: enhancedPredictions,
          borderColor: "#7C3AED",
          backgroundColor: "rgba(124, 58, 237, 0.1)",
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5,
        },
        {
          label: "Enhanced Model Trades",
          data: enhancedTradingPoints,
          borderColor: "transparent",
          pointStyle: 'circle',
          pointRadius: 4,
          pointBackgroundColor: (context) => {
            const point = enhancedTradingPoints[context.dataIndex];
            return point?.action === "Bought" ? "#15803D" : "#B91C1C";
          },
          pointBorderColor: "white",
          pointBorderWidth: 2,
          showLine: false,
        },
        {
          label: "Actual Prices",
          data: actualPrices,
          borderColor: "#EF4444",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
        labels: {
          filter: function(item) {
            return ["Basic Model Predictions", "Enhanced Model Predictions", "Actual Prices"].includes(item.text);
          }
        }
      },
      title: {
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      }
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto", backgroundColor: "#F3F4F6" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "2rem", color: "#1F2937" }}>
        Stock Predictor
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "2rem" }}>
        <div style={{ 
          padding: "1.5rem", 
          backgroundColor: "white", 
          borderRadius: "8px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)" 
        }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", color: "#4B5563" }}>
                Ticker Symbol
              </label>
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid #D1D5DB",
                  borderRadius: "4px"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", color: "#4B5563" }}>
                Period
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid #D1D5DB",
                  borderRadius: "4px"
                }}
              >
                <option value="6mo">6 Months</option>
                <option value="1y">1 Year</option>
                <option value="2y">2 Years</option>
                <option value="5y">5 Years</option>
                <option value="10y">10 Years</option>
                <option value="ytd">Year to Date</option>
                <option value="max">Maximum</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", color: "#4B5563" }}>
                Initial Balance ($)
              </label>
              <input
                type="number"
                value={balance}
                onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid #D1D5DB",
                  borderRadius: "4px"
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "0.75rem",
                backgroundColor: loading ? "#9CA3AF" : "#4F46E5",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: loading ? "not-allowed" : "pointer"
              }}
            >
              {loading ? "Processing..." : "Generate Prediction"}
            </button>
          </form>
        </div>

        <div>
          {error && (
            <div style={{ 
              padding: "1rem", 
              backgroundColor: "#FEE2E2",
              color: "#DC2626",
              borderRadius: "8px",
              marginBottom: "1rem" 
            }}>
              {error}
            </div>
          )}

          {results && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={{ 
                padding: "1.5rem",
                backgroundColor: "white",
                borderRadius: "8px",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
              }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
                  <div>
                    <h3 style={{ fontSize: "1.25rem", color: "#4F46E5", marginBottom: "1rem" }}>Basic Model</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      <div>
                        <div style={{ color: "#6B7280", fontSize: "0.875rem" }}>Final Balance</div>
                        <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1F2937" }}>
                          ${results.final_balance_basic.toLocaleString()}
                        </div>
                        <div style={{ color: "#059669", fontSize: "0.875rem" }}>
                          {((results.final_balance_basic - results.initial_balance) / results.initial_balance * 100).toFixed(2)}% return
                        </div>
                      </div>
                      <div>
                        <div style={{ color: "#6B7280", fontSize: "0.875rem" }}>RMSE</div>
                        <div style={{ fontSize: "1.25rem", color: "#1F2937" }}>
                          {results.rmse_basic.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 style={{ fontSize: "1.25rem", color: "#7C3AED", marginBottom: "1rem" }}>Enhanced Model</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      <div>
                        <div style={{ color: "#6B7280", fontSize: "0.875rem" }}>Final Balance</div>
                        <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1F2937" }}>
                          ${results.final_balance_enhanced.toLocaleString()}
                        </div>
                        <div style={{ color: "#059669", fontSize: "0.875rem" }}>
                          {((results.final_balance_enhanced - results.initial_balance) / results.initial_balance * 100).toFixed(2)}% return
                        </div>
                      </div>
                      <div>
                        <div style={{ color: "#6B7280", fontSize: "0.875rem" }}>RMSE</div>
                        <div style={{ fontSize: "1.25rem", color: "#1F2937" }}>
                          {results.rmse_enhanced.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ 
                padding: "1.5rem",
                backgroundColor: "white",
                borderRadius: "8px",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
              }}>
                <h2 style={{ marginBottom: "1rem", fontSize: "1.25rem", color: "#1F2937" }}>
                  Price Predictions
                </h2>
                <div style={{ height: "400px" }}>
                  <Line data={getChartData()} options={chartOptions} />
                </div>
                <div style={{ 
                  marginTop: "1rem", 
                  display: "flex", 
                  gap: "1.5rem", 
                  justifyContent: "center",
                  padding: "1rem",
                  borderTop: "1px solid #E5E7EB"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ width: "12px", height: "12px", backgroundColor: "#22C55E", borderRadius: "50%" }}></div>
                    <span style={{ fontSize: "0.875rem", color: "#4B5563" }}>Basic Buy</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ width: "12px", height: "12px", backgroundColor: "#EF4444", borderRadius: "50%" }}></div>
                    <span style={{ fontSize: "0.875rem", color: "#4B5563" }}>Basic Sell</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ width: "12px", height: "12px", backgroundColor: "#15803D", borderRadius: "50%" }}></div>
                    <span style={{ fontSize: "0.875rem", color: "#4B5563" }}>Enhanced Buy</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ width: "12px", height: "12px", backgroundColor: "#B91C1C", borderRadius: "50%" }}></div>
                    <span style={{ fontSize: "0.875rem", color: "#4B5563" }}>Enhanced Sell</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;