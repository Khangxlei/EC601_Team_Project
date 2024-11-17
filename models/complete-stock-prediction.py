from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import yfinance as yf
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from typing import List, Dict
import json

app = FastAPI()

class PredictionRequest(BaseModel):
    ticker: str
    period: str
    initial_balance: float

class Trade(BaseModel):
    date: str
    action: str
    shares: int
    price: float
    balance: float

class PredictionResponse(BaseModel):
    initial_balance: float
    final_balance: float
    profit_loss: float
    rmse: float
    trade_log: List[Trade]
    predictions: List[Dict[str, float]]

# Step 1: Download stock data from Yahoo Finance
def download_stock_data(ticker, period='5y'):
    stock_data = yf.download(ticker, period=period)
    return stock_data

# Step 2: Preprocess the data
def preprocess_data(data, feature_col='Close', seq_length=60):
    # Use 'Close' prices to predict trends
    data = data[[feature_col]]

    # Normalize the data using MinMaxScaler
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_data = scaler.fit_transform(data)

    # Create sequences of data points for LSTM input
    X, y = [], []
    for i in range(seq_length, len(scaled_data)):
        X.append(scaled_data[i-seq_length:i, 0])
        y.append(scaled_data[i, 0])

    X, y = np.array(X), np.array(y)

    # Reshape the data to be compatible with LSTM (samples, timesteps, features)
    X = np.reshape(X, (X.shape[0], X.shape[1], 1))

    return X, y, scaler

# Step 3: Build the LSTM model
def create_lstm_model(input_shape):
    model = Sequential()
    model.add(LSTM(units=50, return_sequences=True, input_shape=input_shape))
    model.add(Dropout(0.2))
    model.add(LSTM(units=50, return_sequences=False))
    model.add(Dropout(0.2))
    model.add(Dense(units=25))
    model.add(Dense(units=1))  # Predicting a single output value (next price)

    # Compile the model
    model.compile(optimizer='adam', loss='mean_squared_error')
    return model

# Step 4: Train the LSTM model
def train_lstm_model(model, X_train, y_train, epochs=50, batch_size=64):
    model.fit(X_train, y_train, epochs=epochs, batch_size=batch_size, verbose=1)
    return model

# Step 5: Make predictions and evaluate
def predict_and_evaluate(model, X_test, y_test, stock_scaler):
    predictions = model.predict(X_test)

    # Inverse transform only the stock price column
    predictions_stock_price = stock_scaler.inverse_transform(predictions)
    y_test_stock_price = stock_scaler.inverse_transform(y_test.reshape(-1, 1))

    # Calculate the Root Mean Squared Error (RMSE) on the stock prices
    rmse = np.sqrt(np.mean((predictions_stock_price - y_test_stock_price) ** 2))
    return predictions_stock_price, rmse

# Step 6: Trading simulation logic
def simulate_trading(predictions, actual_prices, dates, initial_balance=10000, shares=0):
    balance = initial_balance
    total_shares = shares
    trade_log = []

    for i in range(1, len(predictions)):
        predicted_price = predictions[i]
        actual_price = actual_prices[i]
        date = dates[i]

        if predicted_price > actual_prices[i-1] and balance > actual_price:
            shares_to_buy = balance // actual_price
            balance -= shares_to_buy * actual_price
            total_shares += shares_to_buy
            trade_log.append(f"Bought {shares_to_buy} shares at {actual_price} on {date}, Balance: {balance}, Shares: {total_shares}")

        elif predicted_price < actual_prices[i-1] and total_shares > 0:
            balance += total_shares * actual_price
            trade_log.append(f"Sold {total_shares} shares at {actual_price} on {date}, Balance: {balance}")
            total_shares = 0

    # Final balance after selling any remaining shares
    if total_shares > 0:
        balance += total_shares * actual_prices[-1]
        trade_log.append(f"Final Sale of {total_shares} shares at {actual_prices[-1]} on {dates[-1]}, Final Balance: {balance}")

    profit_loss = balance - initial_balance
    return trade_log, profit_loss

@app.post("/api/predict", response_model=PredictionResponse)
async def predict_stock(request: PredictionRequest):
    try:
        # Download and preprocess data
        stock_data = download_stock_data(request.ticker, request.period)
        X, y, scaler = preprocess_data(stock_data)
        
        # Split data and train model
        split_idx = int(len(X) * 0.8)
        X_train, X_test = X[:split_idx], X[split_idx:]
        y_train, y_test = y[:split_idx], y[split_idx:]
        
        # Create and train model
        model = create_lstm_model(input_shape=(X_train.shape[1], 1))
        model = train_lstm_model(model, X_train, y_train, epochs=10)  # Reduced epochs for API
        
        # Make predictions
        predictions, rmse = predict_and_evaluate(model, X_test, y_test, scaler)
        
        # Get dates for the test period
        test_dates = stock_data.index[split_idx + 60:].strftime('%Y-%m-%d').tolist()
        
        # Run trading simulation
        trade_log, profit_loss = simulate_trading(
            predictions.flatten(),
            scaler.inverse_transform(y_test.reshape(-1, 1)).flatten(),
            test_dates,
            initial_balance=request.initial_balance
        )
        
        # Format trade log for API response
        formatted_trades = []
        for trade in trade_log:
            parts = trade.split(", ")
            action = "Bought" if "Bought" in parts[0] else "Sold"
            shares = int(parts[0].split()[1])
            price = float(parts[0].split("at")[1].split("on")[0].strip())
            balance = float(parts[-1].split(": ")[-1])
            date = parts[0].split("on")[-1].strip()
            
            formatted_trades.append({
                "date": date,
                "action": action,
                "shares": shares,
                "price": price,
                "balance": balance
            })
        
        # Prepare prediction data for visualization
        prediction_data = []
        actual_prices = scaler.inverse_transform(y_test.reshape(-1, 1)).flatten()
        predicted_prices = predictions.flatten()
        
        for i in range(len(test_dates)):
            prediction_data.append({
                "date": test_dates[i],
                "actual": float(actual_prices[i]),
                "predicted": float(predicted_prices[i])
            })
        
        return {
            "initial_balance": request.initial_balance,
            "final_balance": formatted_trades[-1]["balance"] if formatted_trades else request.initial_balance,
            "profit_loss": formatted_trades[-1]["balance"] - request.initial_balance if formatted_trades else 0,
            "rmse": float(rmse),
            "trade_log": formatted_trades,
            "predictions": prediction_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Example usage if running as script
if __name__ == "__main__":
    ticker_symbol = 'GOOG'
    stock_data = download_stock_data(ticker_symbol)
    X, y, scaler = preprocess_data(stock_data)
    
    # Split data
    split_idx = int(len(X) * 0.8)
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]
    
    # Create and train model
    model = create_lstm_model(input_shape=(X_train.shape[1], 1))
    model = train_lstm_model(model, X_train, y_train)
    
    # Make predictions
    predictions, rmse = predict_and_evaluate(model, X_test, y_test, scaler)
    
    # Get dates for the test period
    test_dates = stock_data.index[split_idx + 60:].tolist()
    
    # Run trading simulation
    trade_log, profit_loss = simulate_trading(
        predictions.flatten(),
        scaler.inverse_transform(y_test.reshape(-1, 1)).flatten(),
        test_dates
    )
    
    print(f"Root Mean Squared Error: {rmse}")
    print(f"Final Profit/Loss: {profit_loss}")
    for log in trade_log:
        print(log)
