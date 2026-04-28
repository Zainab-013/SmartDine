"""
JWT Authentication Middleware for SmartDine.

Usage:
    from auth_middleware import token_required

    @app.route('/protected')
    @token_required
    def protected_route():
        user_id = g.user_id  # set by the decorator
        ...
"""

import jwt
import os
from functools import wraps
from flask import request, jsonify, g


def token_required(f):
    """Decorator that enforces a valid JWT Bearer token on a route."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        # Read token from Authorization header
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ', 1)[1]

        if not token:
            return jsonify({"error": "Authentication required. Please log in."}), 401

        try:
            secret_key = os.getenv('SECRET_KEY', 'fallback-secret-key')
            payload = jwt.decode(token, secret_key, algorithms=['HS256'])
            g.user_id = payload['user_id']
            g.user_email = payload.get('email', '')
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired. Please log in again."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token. Please log in again."}), 401

        return f(*args, **kwargs)
    return decorated
