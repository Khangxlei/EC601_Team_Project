import React, { useState } from "react";
import axios from "axios";

function App() {
  const [ticker, setTicker] = useState("");
  const [period, setPeriod] = useState("1y");
  const [balance, setBalance] = useState(10000);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

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

    try {
      setError(null);
      const response = await axios.post("http://127.0.0.1:8000/api/predict", {
        ticker,
        period,
        initial_balance: parseFloat(balance), // Ensure balance is sent as a number
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
        <button type="submit">Predict</button>
      </form>

      {results && (
        <div>
          <h2>Results</h2>
          <p>Initial Balance: ${results.initial_balance}</p>
          <p>Final Balance: ${results.final_balance}</p>
          <p>Profit/Loss: ${results.profit_loss}</p>
          <p>RMSE: {results.rmse}</p>
          <h3>Predictions</h3>
          <ul>
            {results.predictions.map((pred, index) => (
              <li key={index}>
                {pred.date}: Predicted - {pred.predicted}, Actual - {pred.actual}
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
