from flask import Blueprint, request, jsonify, g
from database import db
from models import InventoryItem
from auth_middleware import token_required
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

inventory_bp = Blueprint('inventory', __name__)

@inventory_bp.route('/', methods=['GET'])
@token_required
def get_inventory():
    items = InventoryItem.query.filter_by(user_id=g.user_id).all()
    return jsonify([item.to_dict() for item in items])

@inventory_bp.route('/add', methods=['POST'])
@token_required
def add_item():
    data = request.json
    try:
        new_item = InventoryItem(
            name=data['name'],
            stock=float(data['stock']),
            unit=data['unit'],
            threshold=float(data['threshold']),
            max_capacity=float(data['max']),
            price=float(data.get('price', 0)),
            # --- New Fields Added ---
            supplier_name=data.get('supplier_name'),
            supplier_email=data.get('supplier_email'),
            user_id=g.user_id
        )
        db.session.add(new_item)
        db.session.commit()
        return jsonify(new_item.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

@inventory_bp.route('/update/<int:item_id>', methods=['PUT'])
@token_required
def update_item(item_id):
    data = request.json
    item = InventoryItem.query.get_or_404(item_id)
    if item.user_id != g.user_id:
        return jsonify({"error": "Unauthorized — you can only edit your own inventory"}), 403
    
    try:
        item.name = data.get('name', item.name)
        item.stock = float(data.get('stock', item.stock))
        item.threshold = float(data.get('threshold', item.threshold))
        item.max_capacity = float(data.get('max', item.max_capacity))
        item.price = float(data.get('price', item.price))
        item.unit = data.get('unit', item.unit)
        # --- Update Supplier Info ---
        item.supplier_name = data.get('supplier_name', item.supplier_name)
        item.supplier_email = data.get('supplier_email', item.supplier_email)
        
        db.session.commit()
        return jsonify(item.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

@inventory_bp.route('/delete/<int:item_id>', methods=['DELETE'])
@token_required
def delete_item(item_id):
    item = InventoryItem.query.get_or_404(item_id)
    if item.user_id != g.user_id:
        return jsonify({"error": "Unauthorized — you can only delete your own inventory"}), 403
    db.session.delete(item)
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200

@inventory_bp.route('/alerts', methods=['GET'])
@token_required
def get_inventory_alerts():
    items = InventoryItem.query.filter_by(user_id=g.user_id).all()
    
    alerts = []
    for item in items:
        if item.stock <= item.threshold:
            urgency = "critical" if item.stock <= (item.threshold / 2) else "warning"
            
            alerts.append({
                "ingredient": item.name,
                "current": item.stock,
                "unit": item.unit,
                "threshold": item.threshold,
                "max": item.max_capacity,
                "urgency": urgency,
                # --- Now using real data from DB ---
                "supplier": item.supplier_name if item.supplier_name else "No Supplier Assigned",
                "supplierEmail": item.supplier_email if item.supplier_email else "N/A",
                "lastUsed": "Recently",
                "runOutIn": "Soon"
            })
            
    return jsonify(alerts), 200

@inventory_bp.route('/notify-supplier', methods=['POST'])
@token_required
def notify_supplier():
    data = request.json
    supplier_email = data.get('supplierEmail')
    supplier_name = data.get('supplierName', 'Supplier')
    ingredient = data.get('ingredient', 'Unknown')
    current_stock = data.get('currentStock', 0)
    unit = data.get('unit', '')
    message_body = data.get('message', '')

    if not supplier_email or supplier_email == 'N/A':
        return jsonify({"error": "No supplier email available for this item"}), 400

    # Read SMTP config from .env
    smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
    smtp_port = int(os.getenv('SMTP_PORT', 587))
    smtp_email = os.getenv('SMTP_EMAIL')
    smtp_password = os.getenv('SMTP_PASSWORD')

    if not smtp_email or not smtp_password or smtp_email == 'your-email@gmail.com':
        return jsonify({"error": "Email not configured. Update SMTP_EMAIL and SMTP_PASSWORD in backend/.env"}), 500

    try:
        # Build the email
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"🔴 Low Stock Alert - {ingredient} | SmartDine"
        msg['From'] = smtp_email
        msg['To'] = supplier_email

        # HTML email template
        html = f"""
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
            <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 32px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Low Stock Alert</h1>
                <p style="color: #fecaca; margin: 8px 0 0 0; font-size: 14px;">SmartDine Inventory System</p>
            </div>
            <div style="padding: 32px;">
                <p style="color: #334155; font-size: 15px; line-height: 1.6;">
                    Dear <strong>{supplier_name}</strong>,
                </p>
                <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin: 20px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Ingredient</td>
                            <td style="padding: 8px 0; color: #0f172a; font-weight: 700; text-align: right; font-size: 15px;">{ingredient}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Current Stock</td>
                            <td style="padding: 8px 0; color: #dc2626; font-weight: 700; text-align: right; font-size: 15px;">{current_stock} {unit}</td>
                        </tr>
                    </table>
                </div>
                <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin: 20px 0;">
                    <p style="color: #475569; font-size: 13px; margin: 0; line-height: 1.6;">
                        <strong>Message:</strong><br>{message_body}
                    </p>
                </div>
                <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 32px;">
                    Sent automatically by SmartDine — AI Restaurant Management
                </p>
            </div>
        </div>
        """

        msg.attach(MIMEText(message_body, 'plain'))
        msg.attach(MIMEText(html, 'html'))

        # Send the email
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_email, smtp_password)
            server.sendmail(smtp_email, supplier_email, msg.as_string())

        return jsonify({"message": f"Email sent successfully to {supplier_email}"}), 200

    except smtplib.SMTPAuthenticationError:
        return jsonify({"error": "Gmail authentication failed. Check your App Password in .env"}), 500
    except Exception as e:
        return jsonify({"error": f"Failed to send email: {str(e)}"}), 500