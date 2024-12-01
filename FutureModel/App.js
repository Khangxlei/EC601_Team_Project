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
  const [futureDays, setFutureDays] = useState(0);
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
        future_days: parseInt(futureDays),
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

    const dates = results.predictions.map((pred) => pred.date);
    const predictedPrices = results.predictions.map((pred) => pred.predicted);
    const actualPrices = results.predictions.map((pred) =>
      pred.actual !== null ? pred.actual : null
    );

    return {
      labels: dates,
      datasets: [
        {
          label: "Predicted Prices",
          data: predictedPrices,
          borderColor: "#4F46E5",
          backgroundColor: "rgba(79, 70, 229, 0.1)",
          tension: 0.4,
        },
        {
          label: "Actual Prices",
          data: actualPrices,
          borderColor: "#EF4444",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          tension: 0.4,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      annotation: {
        annotations: results?.trade_log?.map((trade) => ({
          type: "point",
          xValue: trade.date,
          yValue: trade.price,
          backgroundColor: trade.action === "Bought" ? "#22C55E" : "#EF4444",
          radius: 5,
          borderColor: "white",
          borderWidth: 2,
        })) || [],
      },
    },
  };

  return (
    <div className="app" style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "2rem", color: "#1F2937" }}>
        Stock Predictor
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "2rem" }}>
        <div style={{ 
          padding: "1.5rem", 
          backgroundColor: "white", 
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)" 
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
                  borderRadius: "4px",
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
                  borderRadius: "4px",
                }}
              >
                <option value="5y">5 Years</option>
                <option value="1y">1 Year</option>
                <option value="6mo">6 Months</option>
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
                  borderRadius: "4px",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", color: "#4B5563" }}>
                Future Days
              </label>
              <input
                type="number"
                value={futureDays}
                onChange={(e) => setFutureDays(parseInt(e.target.value) || 0)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid #D1D5DB",
                  borderRadius: "4px",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "0.75rem",
                backgroundColor: "#4F46E5",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
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
              borderRadius: "4px",
              marginBottom: "1rem" 
            }}>
              {error}
            </div>
          )}

          {results && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(4, 1fr)", 
                gap: "1rem" 
              }}>
                <div style={{ 
                  padding: "1rem", 
                  backgroundColor: "white", 
                  borderRadius: "8px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)" 
                }}>
                  <div style={{ color: "#6B7280", fontSize: "0.875rem" }}>Initial Balance</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
                    ${results.initial_balance.toLocaleString()}
                  </div>
                </div>
                <div style={{ 
                  padding: "1rem", 
                  backgroundColor: "white", 
                  borderRadius: "8px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)" 
                }}>
                  <div style={{ color: "#6B7280", fontSize: "0.875rem" }}>Final Balance</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
                    ${results.final_balance.toLocaleString()}
                  </div>
                </div>
                <div style={{ 
                  padding: "1rem", 
                  backgroundColor: "white", 
                  borderRadius: "8px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)" 
                }}>
                  <div style={{ color: "#6B7280", fontSize: "0.875rem" }}>Profit/Loss</div>
                  <div style={{ 
                    fontSize: "1.5rem", 
                    fontWeight: "bold",
                    color: results.profit_loss >= 0 ? "#059669" : "#DC2626"
                  }}>
                    ${results.profit_loss?.toLocaleString() || "N/A"}
                  </div>
                </div>
                <div style={{ 
                  padding: "1rem", 
                  backgroundColor: "white", 
                  borderRadius: "8px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)" 
                }}>
                  <div style={{ color: "#6B7280", fontSize: "0.875rem" }}>RMSE</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
                    {results.rmse.toFixed(2)}
                  </div>
                </div>
              </div>

              <div style={{ 
                padding: "1.5rem",
                backgroundColor: "white",
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}>
                <h2 style={{ marginBottom: "1rem", fontSize: "1.25rem", color: "#1F2937" }}>
                  Price Predictions
                </h2>
                <div style={{ height: "400px" }}>
                  <Line data={getChartData()} options={chartOptions} />
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