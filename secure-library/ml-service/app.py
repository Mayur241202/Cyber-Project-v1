#!/usr/bin/env python3
"""
ml-service/app.py
─────────────────
ML Anomaly Detection Service for Login Activity
Uses: Isolation Forest (unsupervised) + feature engineering
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from datetime import datetime, timedelta
import ipaddress
import json
import os
import logging
from collections import defaultdict
import threading

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# ─── IN-MEMORY STORAGE (use Redis in production) ─────────────────────────────
login_events = []
anomaly_cache = []
user_profiles = defaultdict(lambda: {
    'login_hours': [],
    'ips': set(),
    'total_logins': 0,
    'last_login': None,
})
lock = threading.Lock()

# ─── ISOLATION FOREST MODEL ──────────────────────────────────────────────────
model = IsolationForest(
    n_estimators=100,
    contamination=0.1,   # Expect ~10% anomalies
    random_state=42,
    n_jobs=-1,
)
scaler = StandardScaler()
model_trained = False


def extract_features(event: dict, user_profile: dict) -> list:
    """
    Feature engineering for login events.
    Returns a feature vector for anomaly detection.
    """
    now = datetime.fromisoformat(event.get('timestamp', datetime.utcnow().isoformat()))
    hour = now.hour                          # 0-23
    day_of_week = now.weekday()             # 0=Monday, 6=Sunday
    is_weekend = 1 if day_of_week >= 5 else 0

    # IP features
    ip = event.get('ip', '127.0.0.1')
    try:
        ip_obj = ipaddress.ip_address(ip)
        is_private_ip = 1 if ip_obj.is_private else 0
    except ValueError:
        is_private_ip = 0

    # New IP? (first time this IP seen for this user)
    known_ips = user_profile.get('ips', set())
    is_new_ip = 0 if ip in known_ips else 1

    # Time since last login (hours)
    last_login = user_profile.get('last_login')
    if last_login:
        hours_since_last = (now - last_login).total_seconds() / 3600
        hours_since_last = min(hours_since_last, 720)  # Cap at 30 days
    else:
        hours_since_last = 0

    # Login frequency (logins in last 24 hours from events)
    user_id = event.get('userId', '')
    recent_logins = sum(
        1 for e in login_events[-500:]  # Check last 500 events for performance
        if e.get('userId') == user_id and
        (now - datetime.fromisoformat(e.get('timestamp', now.isoformat()))).total_seconds() < 86400
    )

    # User-Agent analysis
    user_agent = event.get('userAgent', '')
    is_bot = 1 if any(b in user_agent.lower() for b in ['bot', 'crawler', 'spider', 'curl', 'wget', 'python-requests']) else 0

    # Off-hours login (between 11pm and 5am)
    is_off_hours = 1 if (hour >= 23 or hour <= 5) else 0

    features = [
        hour,
        day_of_week,
        is_weekend,
        is_private_ip,
        is_new_ip,
        hours_since_last,
        recent_logins,
        is_bot,
        is_off_hours,
        len(known_ips),     # Total unique IPs used by this user
        user_profile.get('total_logins', 0),
    ]
    return features


def retrain_model():
    """Retrain Isolation Forest when we have enough data."""
    global model_trained, model, scaler

    if len(login_events) < 10:
        logger.info(f"Not enough data to train ({len(login_events)} events). Need 10.")
        return False

    feature_matrix = []
    for event in login_events:
        uid = event.get('userId', '')
        features = extract_features(event, user_profiles[uid])
        feature_matrix.append(features)

    X = np.array(feature_matrix)
    X_scaled = scaler.fit_transform(X)
    model.fit(X_scaled)
    model_trained = True
    logger.info(f"Model retrained on {len(feature_matrix)} events.")
    return True


# ─── ROUTES ──────────────────────────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'model_trained': model_trained,
        'total_events': len(login_events),
        'total_anomalies': len(anomaly_cache),
    })


@app.route('/api/log-login', methods=['POST'])
def log_login():
    """Receive a login event from the Node.js backend."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    required = ['userId', 'ip', 'timestamp']
    if not all(k in data for k in required):
        return jsonify({'error': 'Missing required fields'}), 400

    with lock:
        user_id = data['userId']

        # Extract features BEFORE updating profile
        features = extract_features(data, user_profiles[user_id])

        # Update user profile
        profile = user_profiles[user_id]
        ts = datetime.fromisoformat(data['timestamp'])
        profile['login_hours'].append(ts.hour)
        profile['ips'].add(data['ip'])
        profile['total_logins'] += 1
        profile['last_login'] = ts

        # Add event to history (keep last 1000)
        event_record = {**data, 'features': features}
        login_events.append(event_record)
        if len(login_events) > 1000:
            login_events.pop(0)

        # Detect anomaly if model is trained
        is_anomaly = False
        anomaly_score = 0.0

        if model_trained:
            X = scaler.transform([features])
            prediction = model.predict(X)[0]         # -1=anomaly, 1=normal
            anomaly_score = float(model.score_samples(X)[0])
            is_anomaly = prediction == -1

            if is_anomaly:
                anomaly_record = {
                    **data,
                    'anomaly_score': anomaly_score,
                    'features': {
                        'hour': features[0],
                        'is_new_ip': bool(features[4]),
                        'hours_since_last': features[5],
                        'recent_logins_24h': features[6],
                        'is_bot': bool(features[7]),
                        'is_off_hours': bool(features[8]),
                    },
                    'detected_at': datetime.utcnow().isoformat(),
                }
                anomaly_cache.append(anomaly_record)
                if len(anomaly_cache) > 100:
                    anomaly_cache.pop(0)

                logger.warning(f"⚠️  ANOMALY DETECTED: user={user_id} ip={data['ip']} score={anomaly_score:.3f}")

        # Retrain periodically
        if len(login_events) % 20 == 0:
            retrain_model()

    return jsonify({
        'logged': True,
        'is_anomaly': is_anomaly,
        'anomaly_score': anomaly_score,
    })


@app.route('/api/anomalies', methods=['GET'])
def get_anomalies():
    """Return detected anomalies."""
    limit = min(int(request.args.get('limit', 50)), 100)
    return jsonify({
        'total': len(anomaly_cache),
        'anomalies': anomaly_cache[-limit:],
        'model_trained': model_trained,
        'total_events_seen': len(login_events),
    })


@app.route('/api/train', methods=['POST'])
def force_train():
    """Force model retraining (admin endpoint)."""
    success = retrain_model()
    return jsonify({'success': success, 'events': len(login_events)})


@app.route('/api/user-profile/<user_id>', methods=['GET'])
def get_user_profile(user_id):
    """Get ML profile for a specific user."""
    profile = user_profiles.get(user_id, {})
    # Convert set to list for JSON serialization
    serializable = {
        'total_logins': profile.get('total_logins', 0),
        'unique_ips': list(profile.get('ips', set())),
        'last_login': profile.get('last_login').isoformat() if profile.get('last_login') else None,
        'typical_hours': profile.get('login_hours', []),
    }
    return jsonify(serializable)


if __name__ == '__main__':
    logger.info("Starting ML Anomaly Detection Service on port 8000")
    app.run(host='0.0.0.0', port=8000, debug=False)
