from flask import Blueprint, jsonify, request, g
from database import db
from models import InventoryItem, Ngodonation, DismissedNotification
from datetime import datetime, timedelta
from auth_middleware import token_required

notification_bp = Blueprint('notifications', __name__)


@notification_bp.route('/api/notifications', methods=['GET'])
@token_required
def get_notifications():
    # Fetch all dismissed notification IDs for this user from the database
    dismissed_rows = DismissedNotification.query.filter_by(user_id=g.user_id).all()
    dismissed_ids = {row.notif_id for row in dismissed_rows}

    notifications = []

    # 1. Check for Low Stock
    low_stock_items = InventoryItem.query.filter(
        InventoryItem.user_id == g.user_id,
        InventoryItem.stock <= InventoryItem.threshold
    ).all()
    for item in low_stock_items:
        notif_id = f"stock-{item.id}"
        if notif_id not in dismissed_ids:
            notifications.append({
                "id": notif_id,
                "title": f"{item.name} stock critically low",
                "desc": f"Only {item.stock} {item.unit} remaining.",
                "time": "Real-time",
                "type": "alert",
                "targetPage": "Inventory"
            })

    # 2. Check for Recent Donations
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    recent_donations = Ngodonation.query.filter(
        Ngodonation.donated_at >= one_hour_ago,
        db.or_(Ngodonation.user_id == g.user_id, Ngodonation.user_id.is_(None))
    ).all()
    for donation in recent_donations:
        notif_id = f"don-{donation.id}"
        if notif_id not in dismissed_ids:
            notifications.append({
                "id": notif_id,
                "title": "Donation successful",
                "desc": f"{donation.quantity} {donation.unit} of {donation.dish_name} donated.",
                "time": "Recent",
                "type": "success",
                "targetPage": "Reports"
            })

    return jsonify(notifications)


@notification_bp.route('/api/notifications/dismiss', methods=['POST'])
@token_required
def dismiss_notification():
    data = request.json
    notif_id = data.get('id')
    if notif_id:
        # Persist the dismissal — ignore if already exists (unique constraint)
        existing = DismissedNotification.query.filter_by(
            user_id=g.user_id, notif_id=notif_id
        ).first()
        if not existing:
            db.session.add(DismissedNotification(user_id=g.user_id, notif_id=notif_id))
            db.session.commit()
    return jsonify({"status": "success"}), 200