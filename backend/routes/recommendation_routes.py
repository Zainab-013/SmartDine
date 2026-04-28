import traceback
import logging
from time import time

from flask import Blueprint, jsonify, g, request
from database import db
from ml_model import generate_recommendations
from auth_middleware import token_required

logger = logging.getLogger(__name__)

recommendation_bp = Blueprint('recommendation', __name__)
recommendation_bp.strict_slashes = False

# ── Per-user recommendation cache (5-minute TTL) ──────────────────────────────
_cache = {}
_CACHE_TTL = 300  # seconds


def _get_cached_recommendations(user_id, db_session):
    """Return cached recs if fresh, otherwise regenerate and cache."""
    now = time()
    if user_id in _cache and now - _cache[user_id]["ts"] < _CACHE_TTL:
        return _cache[user_id]["data"]

    recs = generate_recommendations(db_session, user_id)
    _cache[user_id] = {"data": recs, "ts": now}
    return recs


@recommendation_bp.route('', methods=['GET'])
@recommendation_bp.route('/', methods=['GET'])
@token_required
def get_recommendations():
    """Return AI-powered recommendations based on current user data."""
    try:
        # Optional limit param (default: all)
        limit = request.args.get('limit', default=None, type=int)

        recs = _get_cached_recommendations(g.user_id, db.session)

        if limit and limit > 0:
            recs = recs[:limit]

        return jsonify({
            "status": "success",
            "count": len(recs),
            "recommendations": recs
        })
    except Exception as e:
        logger.error("Recommendation generation failed: %s", e, exc_info=True)
        return jsonify({
            "status": "error",
            "message": "Failed to generate recommendations. Please try again.",
            "recommendations": []
        }), 500


@recommendation_bp.route('/refresh', methods=['POST'])
@token_required
def refresh_recommendations():
    """Force-refresh the recommendation cache for this user."""
    _cache.pop(g.user_id, None)
    return jsonify({"status": "success", "message": "Cache cleared"}), 200
