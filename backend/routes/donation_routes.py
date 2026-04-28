# backend/routes/donation_routes.py
from flask import Blueprint, request, jsonify, g
from database import db
from models import Ngo, Donation, Dish
from datetime import datetime
from auth_middleware import token_required
import random

donation_bp = Blueprint('donations', __name__)


@donation_bp.route('/ngos', methods=['GET'])
@token_required
def get_ngos():
    """Return all registered NGOs."""
    ngos = Ngo.query.all()
    return jsonify([ngo.to_dict() for ngo in ngos]), 200


@donation_bp.route('/leftovers', methods=['GET'])
@token_required
def get_leftovers():
    """
    Return dishes belonging to the user as potential leftovers.
    In a real system, this could track prepared quantities and expiry.
    For now, we pull from the dishes table and simulate leftover data.
    """
    dishes = Dish.query.filter_by(user_id=g.user_id).all()
    
    leftovers = []
    for dish in dishes:
        # Simulate leftover quantities based on the dish
        hours_left = round(random.uniform(1, 6), 1)
        qty = round(random.uniform(0.5, 5.0), 1)
        
        leftovers.append({
            "name": dish.name,
            "image": dish.image_url if dish.image_url else "/images/placeholder.jpg",
            "qty": f"{qty} kg",
            "prepTime": datetime.now().strftime("%-I:%M %p") if hasattr(datetime, 'now') else "12:00 PM",
            "hoursLeft": hours_left,
            "safe": hours_left > 1.5
        })
    
    # If user has no dishes yet, return some defaults so the page isn't empty
    if not leftovers:
        leftovers = [
            {"name": "Butter Chicken", "image": "/images/butter-chicken.jpg", "qty": "3.5 kg", "prepTime": "11:30 AM", "hoursLeft": 4, "safe": True},
            {"name": "Biryani", "image": "/images/biryani.jpg", "qty": "2.8 kg", "prepTime": "12:00 PM", "hoursLeft": 3.5, "safe": True},
            {"name": "Paneer Tikka", "image": "/images/paneer-tikka.jpg", "qty": "1.2 kg", "prepTime": "1:00 PM", "hoursLeft": 5, "safe": True},
        ]

    return jsonify(leftovers), 200


@donation_bp.route('/history', methods=['GET'])
@token_required
def get_donation_history():
    """Return all past donations for the authenticated user."""
    donations = Donation.query.filter_by(user_id=g.user_id).order_by(Donation.id.desc()).all()
    return jsonify([d.to_dict() for d in donations]), 200


@donation_bp.route('/stats', methods=['GET'])
@token_required
def get_donation_stats():
    """Return aggregate donation stats for the header badges."""
    donations = Donation.query.filter_by(user_id=g.user_id).all()
    total_weight = sum(d.total_weight for d in donations)
    total_meals = len(donations)
    return jsonify({
        "totalMeals": total_meals,
        "totalWeight": round(total_weight, 1)
    }), 200


@donation_bp.route('/create', methods=['POST'])
@token_required
def create_donation():
    """Save a new donation to the database."""
    data = request.json

    # Generate a unique transaction ID like D-1043
    last = Donation.query.order_by(Donation.id.desc()).first()
    next_num = (last.id + 1) if last else 1
    transaction_id = f"D-{1000 + next_num}"

    # Look up the NGO by name
    ngo = Ngo.query.filter_by(name=data['ngo']).first()
    if not ngo:
        return jsonify({"error": "NGO not found"}), 404

    new_donation = Donation(
        transaction_id=transaction_id,
        food_items=data['food_items'],
        total_weight=float(data['total_weight']),
        date=datetime.now().strftime("%b %d, %Y"),
        status="donated",
        user_id=g.user_id,
        ngo_id=ngo.id
    )

    db.session.add(new_donation)
    db.session.commit()

    return jsonify(new_donation.to_dict()), 201
