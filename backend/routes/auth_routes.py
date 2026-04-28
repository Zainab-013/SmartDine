import jwt
import os
import re
from collections import defaultdict
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, g
from database import db
from models import User
from auth_middleware import token_required

auth_bp = Blueprint('auth', __name__)

# ─── Validation helpers ───────────────────────────────────────────────────────

EMAIL_RE = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
MAX_EMAIL_LEN = 254
MIN_PASSWORD_LEN = 8
MAX_PASSWORD_LEN = 128

def _validate_email(email: str):
    """Return an error string if the email is invalid, else None."""
    if not email or not isinstance(email, str):
        return "Email is required"
    if len(email) > MAX_EMAIL_LEN:
        return f"Email must be at most {MAX_EMAIL_LEN} characters"
    if not EMAIL_RE.match(email):
        return "Invalid email format"
    return None

def _validate_password(password: str):
    """Return an error string if the password is weak, else None."""
    if not password or not isinstance(password, str):
        return "Password is required"
    if len(password) < MIN_PASSWORD_LEN:
        return f"Password must be at least {MIN_PASSWORD_LEN} characters"
    if len(password) > MAX_PASSWORD_LEN:
        return f"Password must be at most {MAX_PASSWORD_LEN} characters"
    if not re.search(r'[A-Z]', password):
        return "Password must contain at least one uppercase letter"
    if not re.search(r'[a-z]', password):
        return "Password must contain at least one lowercase letter"
    if not re.search(r'[0-9]', password):
        return "Password must contain at least one digit"
    return None

# ─── Simple in-memory rate limiter ────────────────────────────────────────────

LOGIN_RATE_LIMIT   = 5     # max attempts
LOGIN_RATE_WINDOW  = 60    # seconds
_login_attempts: dict[str, list[float]] = defaultdict(list)

def _is_rate_limited(ip: str) -> bool:
    """Return True if this IP has exceeded the login rate limit."""
    now = datetime.utcnow().timestamp()
    window_start = now - LOGIN_RATE_WINDOW
    # Prune old entries
    _login_attempts[ip] = [t for t in _login_attempts[ip] if t > window_start]
    return len(_login_attempts[ip]) >= LOGIN_RATE_LIMIT

def _record_attempt(ip: str):
    _login_attempts[ip].append(datetime.utcnow().timestamp())

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    email = (data.get('email') or '').strip()
    password = data.get('password') or ''
    restaurant_name = (data.get('restaurant_name') or 'My Restaurant').strip()

    # Validate email
    email_err = _validate_email(email)
    if email_err:
        return jsonify({"error": email_err}), 400

    # Validate password strength
    pwd_err = _validate_password(password)
    if pwd_err:
        return jsonify({"error": pwd_err}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already exists"}), 400

    new_user = User(email=email, restaurant_name=restaurant_name)
    new_user.set_password(password)

    db.session.add(new_user)
    db.session.commit()
    return jsonify({"message": "User registered successfully"}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    # Rate limiting
    client_ip = request.remote_addr or 'unknown'
    if _is_rate_limited(client_ip):
        return jsonify({"error": "Too many login attempts. Please try again later."}), 429

    data = request.json
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    email = (data.get('email') or '').strip()
    password = data.get('password') or ''

    # Basic validation (not full strength check — user may have old password)
    email_err = _validate_email(email)
    if email_err:
        return jsonify({"error": email_err}), 400
    if not password:
        return jsonify({"error": "Password is required"}), 400

    user = User.query.filter_by(email=email).first()

    if user and user.check_password(password):
        # Generate JWT token (expires in 24 hours)
        secret_key = os.getenv('SECRET_KEY', 'fallback-secret-key')
        token = jwt.encode(
            {
                'user_id': user.id,
                'email': user.email,
                'exp': datetime.utcnow() + timedelta(hours=24)
            },
            secret_key,
            algorithm='HS256'
        )
        return jsonify({
            "message": "Login successful",
            "token": token,
            "user": {
                "id": user.id,
                "email": user.email,
                "restaurant": user.restaurant_name
            }
        }), 200

    # Record failed attempt for rate limiting
    _record_attempt(client_ip)
    return jsonify({"error": "Invalid email or password"}), 401

@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user():
    """Return the current authenticated user's info from the JWT token."""
    user = User.query.get(g.user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({
        "id": user.id,
        "email": user.email,
        "restaurant": user.restaurant_name
    }), 200