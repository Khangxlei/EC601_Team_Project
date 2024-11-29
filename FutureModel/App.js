import React, { useState } from "react";
import axios from "axios";

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
          <h3>Predictions</h3>
          <ul>
            {results.predictions.map((pred, index) => (
              <li key={index}>
                {pred.date}: Predicted - {pred.predicted}
                {pred.actual !== null ? `, Actual - ${pred.actual}` : ""}
              </li>
            ))}
          </ul>
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
