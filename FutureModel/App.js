import React, { useState } from "react";
import axios from "axios";
import { Line } from "react-chartjs-2"; // Import Line chart

// Required Chart.js registration
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function App() {
  const [ticker, setTicker] = useState(""); // State for ticker symbol
  const [period, setPeriod] = useState("1y"); // State for historical data period
  const [balance, setBalance] = useState(10000); // State for initial balance
  const [futureDays, setFutureDays] = useState(0); // State for future prediction days
  const [results, setResults] = useState(null); // State for API results
  const [error, setError] = useState(null); // State for error messages

  // Form submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate inputs
    if (!ticker.trim()) {
      setError("Ticker symbol is required");
      return;
    }
    if (balance <= 0) {
      setError("Initial balance must be greater than zero");
      return;
    }
    if (futureDays < 0 || futureDays > 365) {
      setError("Future days must be between 0 and 365");
      return;
    }

    try {
      setError(null);
      const response = await axios.post("http://127.0.0.1:8000/api/predict", {
        ticker,
        period,
        initial_balance: parseFloat(balance),
        future_days: parseInt(futureDays), // Include future_days in the request payload
      });
      setResults(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "An error occurred");
    }
  };

  // Prepare chart data
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
          borderColor: "rgba(75, 192, 192, 1)", // Line color for predictions
          backgroundColor: "rgba(75, 192, 192, 0.2)", // Fill under line
          tension: 0.4,
        },
        {
          label: "Actual Prices",
          data: actualPrices,
          borderColor: "rgba(255, 99, 132, 1)", // Line color for actual prices
          backgroundColor: "rgba(255, 99, 132, 0.2)", // Fill under line
          tension: 0.4,
        },
      ],
    };
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Stock Predictor</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Ticker Symbol: </label>
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Period: </label>
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="5y">5 Years</option>
            <option value="1y">1 Year</option>
            <option value="6mo">6 Months</option>
          </select>
        </div>
        <div>
          <label>Initial Balance: </label>
          <input
            type="number"
            value={balance}
            onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <label>Future Days: </label>
          <input
            type="number"
            value={futureDays}
            onChange={(e) => setFutureDays(parseInt(e.target.value) || 0)} // Input for future_days
          />
        </div>
        <button type="submit">Predict</button>
      </form>

      {results && (
        <div>
          <h2>Results</h2>
          <p>Initial Balance: ${results.initial_balance}</p>
          <p>Final Balance: ${results.final_balance}</p>
          <p>Profit/Loss: ${results.profit_loss || "N/A"}</p>
          <p>RMSE: {results.rmse}</p>
          <h3>Graph of Predictions</h3>
          {/* Render the chart */}
          <Line data={getChartData()} />
        </div>
      )}

      {error && (
        <div style={{ color: "red" }}>
          <h3>Error</h3>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}

export default App;
