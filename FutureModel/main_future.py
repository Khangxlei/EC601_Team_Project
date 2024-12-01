# -*- coding: utf-8 -*-
"""main

Automatically generated by Colab.

Original file is located at
    https://colab.research.google.com/drive/17gI4wt6P3diFw8_M_dSedXwNwRCCUfnn
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import yfinance as yf
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from typing import List, Dict, Optional
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define valid periods
valid_periods = ["6mo", "1y", "2y", "5y", "10y", "ytd", "max"]

# Define models
class Trade(BaseModel):
    date: str
    action: str
    shares: int
    price: float
    balance: float

class PredictionItem(BaseModel):
    date: str
    actual: Optional[float] = None
    predicted: float

class PredictionRequest(BaseModel):
    ticker: str
    period: str
    initial_balance: float
    future_days: int = 0

class PredictionResponse(BaseModel):
    initial_balance: float
    final_balance: float
    profit_loss: Optional[float] = None
    rmse: float
    trade_log: List[Trade]
    predictions: List[PredictionItem]

# Utility functions
def download_stock_data(ticker, period="5y"):
    if period not in valid_periods:
        raise HTTPException(status_code=400, detail=f"Invalid period. Must be one of: {', '.join(valid_periods)}")
    stock_data = yf.download(ticker, period=period)
    return stock_data

def preprocess_data(data, feature_col="Close", seq_length=60):
    try:
        seq_length = int(float(seq_length))
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail=f"Invalid sequence length: {seq_length}")
    data = data[[feature_col]]
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_data = scaler.fit_transform(data)

    X, y = [], []
    for i in range(seq_length, len(scaled_data)):
        X.append(scaled_data[i - seq_length : i, 0])
        y.append(scaled_data[i, 0])
    X, y = np.array(X), np.array(y)
    X = np.reshape(X, (X.shape[0], X.shape[1], 1))
    return X, y, scaler

def create_lstm_model(input_shape):
    model = Sequential()
    model.add(LSTM(units=50, return_sequences=True, input_shape=input_shape))
    model.add(Dropout(0.2))
    model.add(LSTM(units=50, return_sequences=False))
    model.add(Dropout(0.2))
    model.add(Dense(units=25))
    model.add(Dense(units=1))
    model.compile(optimizer="adam", loss="mean_squared_error")
    return model

def train_lstm_model(model, X_train, y_train, epochs=10, batch_size=64):
    model.fit(X_train, y_train, epochs=epochs, batch_size=batch_size, verbose=1)
    return model

def predict_and_evaluate(model, X_test, y_test, scaler):
    predictions = model.predict(X_test)
    predictions_stock_price = scaler.inverse_transform(predictions)
    y_test_stock_price = scaler.inverse_transform(y_test.reshape(-1, 1))
    rmse = np.sqrt(np.mean((predictions_stock_price - y_test_stock_price) ** 2))
    return predictions_stock_price, rmse

def predict_future(model, last_sequence, days, scaler):
    future_predictions = []
    current_sequence = last_sequence.copy()

    for _ in range(days):
        pred = model.predict(current_sequence.reshape(1, -1, 1))
        future_predictions.append(scaler.inverse_transform(pred)[0][0])
        current_sequence = np.append(current_sequence[1:], pred)
    return future_predictions

def simulate_trading(predictions, actual_prices, dates, initial_balance=10000, shares=0):
    balance = initial_balance
    total_shares = shares
    trade_log = []

    for i in range(1, len(predictions)):
        predicted_price = predictions[i]
        actual_price = actual_prices[i]
        date = dates[i]

        if predicted_price > actual_prices[i - 1] and balance > actual_price:
            shares_to_buy = balance // actual_price
            balance -= shares_to_buy * actual_price
            total_shares += shares_to_buy
            trade_log.append({"date": date, "action": "Bought", "shares": shares_to_buy, "price": actual_price, "balance": balance})
        elif predicted_price < actual_prices[i - 1] and total_shares > 0:
            balance += total_shares * actual_price
            trade_log.append({"date": date, "action": "Sold", "shares": total_shares, "price": actual_price, "balance": balance})
            total_shares = 0

    if total_shares > 0:
        balance += total_shares * actual_prices[-1]
        trade_log.append({"date": dates[-1], "action": "Sold", "shares": total_shares, "price": actual_prices[-1], "balance": balance})

    profit_loss = balance - initial_balance
    return trade_log, profit_loss

@app.post("/api/predict", response_model=PredictionResponse)
async def predict_stock(request: PredictionRequest):
    try:
        # Validate period
        if request.period not in valid_periods:
            raise HTTPException(status_code=400, detail=f"Invalid period. Must be one of: {', '.join(valid_periods)}")

        # Validate future_days
        if request.future_days < 0 or request.future_days > 365:
            raise HTTPException(status_code=400, detail="Future days must be between 0 and 365")

        # Download and preprocess stock data
        stock_data = download_stock_data(request.ticker, request.period)
        X, y, scaler = preprocess_data(stock_data)

        # Split data
        split_idx = int(len(X) * 0.8)
        X_train, X_test = X[:split_idx], X[split_idx:]
        y_train, y_test = y[:split_idx], y[split_idx:]

        # Train model
        model = create_lstm_model((X_train.shape[1], 1))
        train_lstm_model(model, X_train, y_train)

        # Predict test data
        predictions, rmse = predict_and_evaluate(model, X_test, y_test, scaler)

        # Generate future predictions
        last_sequence = X_test[-1]
        future_predictions = predict_future(model, last_sequence, request.future_days, scaler)

        # Generate future dates
        future_dates = pd.date_range(stock_data.index[-1], periods=request.future_days + 1, freq="B")[1:]

        # Combine predictions
        test_dates = stock_data.index[split_idx + 60:].strftime("%Y-%m-%d").tolist()
        actual_prices = scaler.inverse_transform(y_test.reshape(-1, 1)).flatten()
        predictions = predictions.flatten()

        all_predictions = [
            {"date": test_dates[i], "actual": float(actual_prices[i]), "predicted": float(predictions[i])}
            for i in range(len(test_dates))
        ]
        all_predictions.extend(
            [{"date": str(future_dates[i].date()), "actual": None, "predicted": float(future_predictions[i])}
             for i in range(request.future_days)]
        )

        # Calculate profit_loss
        trade_log, profit_loss = simulate_trading(predictions, actual_prices, test_dates, request.initial_balance)

        return {
            "initial_balance": request.initial_balance,
            "final_balance": trade_log[-1]["balance"] if trade_log else request.initial_balance,
            "profit_loss": profit_loss,
            "rmse": float(rmse),
            "trade_log": trade_log,
            "predictions": all_predictions,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

