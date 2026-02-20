import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
import joblib
import os

# Create dummy data
# PM2.5, PM10, NO2, SO2, CO, O3
np.random.seed(42)
X = np.random.rand(100, 6) * 500  # Random values between 0 and 500
# Simple linear combination for target AQI with some noise
y = X[:, 0] * 0.4 + X[:, 1] * 0.3 + X[:, 2] * 0.1 + X[:, 3] * 0.1 + X[:, 4] * 0.05 + X[:, 5] * 0.05 + np.random.normal(0, 10, 100)

# Train model
model = RandomForestRegressor(n_estimators=10, random_state=42)
model.fit(X, y)

# Save model
model_path = 'backend/model/aqi_model.pkl'
os.makedirs(os.path.dirname(model_path), exist_ok=True)
joblib.dump(model, model_path)

print(f"Model saved to {model_path}")
