import os
import joblib
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

# Configure Flask to serve frontend
app = Flask(__name__, 
            static_folder=os.path.join(os.path.dirname(__file__), '..', 'frontend'),
            static_url_path='')
CORS(app)

@app.before_request
def log_request_info():
    if request.path == '/predict':
        data = request.get_json(silent=True)
        print(f">>> Predict Request: {data}")
    else:
        print(f">>> Request: {request.method} {request.path} from {request.remote_addr}")

@app.route('/')
def index():
    print("Serving index.html")
    return app.send_static_file('index.html')

@app.route('/<path:path>')
def serve_static(path):
    print(f"Serving static: {path}")
    return app.send_static_file(path)

# Load the model
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model', 'aqi_model.pkl')

def load_model():
    if not os.path.exists(MODEL_PATH):
        return None
    try:
        return joblib.load(MODEL_PATH)
    except Exception:
        return None

model = load_model()

def get_aqi_category(aqi):
    if aqi <= 50:
        return "Good", "Air quality is considered satisfactory, and air pollution poses little or no risk."
    elif aqi <= 100:
        return "Satisfactory", "Air quality is acceptable; however, for some pollutants there may be a moderate health concern for a very small number of people who are unusually sensitive to air pollution."
    elif aqi <= 200:
        return "Moderate", "Members of sensitive groups may experience health effects. The general public is not likely to be affected."
    elif aqi <= 300:
        return "Poor", "Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects."
    elif aqi <= 400:
        return "Very Poor", "Health alert: everyone may experience more serious health effects."
    else:
        return "Severe", "Health warnings of emergency conditions. The entire population is more likely to be affected."

@app.route('/', methods=['GET'])
def status():
    return jsonify({
        "status": "online",
        "message": "AtmosAI API is running",
        "model_loaded": model is not None
    })

@app.route('/predict', methods=['POST'])
def predict():
    if model is None:
        return jsonify({"error": "ML model (aqi_model.pkl) is missing or could not be loaded"}), 500

    try:
        data = request.get_json()
        
        # Validation
        required_fields = ["pm25", "pm10", "no2", "so2", "co", "o3"]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
            if data[field] < 0:
                return jsonify({"error": f"Field {field} cannot be negative"}), 400

        # Prepare input for model
        input_data = np.array([[
            data["pm25"], data["pm10"], data["no2"], 
            data["so2"], data["co"], data["o3"]
        ]])

        # Prediction
        prediction = model.predict(input_data)[0]
        aqi_value = round(max(0, float(prediction)), 2)
        
        category, advice = get_aqi_category(aqi_value)
        
        print(f"Prediction: {aqi_value} ({category})")

        return jsonify({
            "aqi": aqi_value,
            "category": category,
            "health_advice": advice
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
