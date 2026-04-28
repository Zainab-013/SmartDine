from flask import Blueprint, request, jsonify, g
from database import db
from models import Order, OrderItem, PreparedOrder, Ngodonation, Dish, Recipe, InventoryItem
from datetime import datetime, timedelta
from auth_middleware import token_required

order_bp = Blueprint('orders', __name__)

# ─── Prepared Orders ───────────────────────────────────────────────────────────

@order_bp.route('/prepared-orders', methods=['GET'])
@token_required
def get_prepared_orders():
    """Return prepared orders — optional ?status=prepared filter."""
    status = request.args.get('status')
    query  = PreparedOrder.query.filter_by(user_id=g.user_id).order_by(PreparedOrder.prepared_at.desc())
    if status:
        query = query.filter_by(status=status)
    return jsonify([p.to_dict() for p in query.all()]), 200


@order_bp.route('/orders/checkout', methods=['POST'])
@token_required
def checkout():
    """
    Process multiple dishes as a single order.
    Updated to sync with dish.py forecasting 'Actuals'.
    """
    data = request.json
    cart_items = data.get('items', [])
    total_amount = data.get('total')
    # Required for syncing with Forecasting 'Actual' logic
    today_str = datetime.now().strftime('%Y-%m-%d')

    if not cart_items:
        return jsonify({"error": "No items in cart"}), 400

    try:
        # 1. Create one single Order record for sales history
        new_order = Order(
            total=total_amount, 
            status="Paid",
            user_id=g.user_id
        )
        db.session.add(new_order)
        db.session.flush() 

        # 2. Process each item in the cart
        for item in cart_items:
            prep_id = item['prepared_order_id']
            qty_to_sell = int(item['qty'])

            # Fetch the specific prepared batch from the kitchen
            po = PreparedOrder.query.get(prep_id)
            
            if not po:
                db.session.rollback()
                return jsonify({"error": f"Dish batch {prep_id} not found"}), 404

            if po.quantity < qty_to_sell:
                db.session.rollback()
                return jsonify({"error": f"Not enough stock for {po.dish_name}. Available: {po.quantity}"}), 400

            # 3. Create individual OrderItem linked to this Order
            db.session.add(OrderItem(
                order_id=new_order.id,
                dish_name=po.dish_name,
                quantity=qty_to_sell,
                price=po.price
            ))

            # 4. 🔥 SYNC WITH FORECASTING:
            # Your dish.py route sums 'quantity' from PreparedOrder for 'Actuals'.
            # To keep the forecasting accurate, we ensure the date is current.
            po.prep_date = today_str
            
            # Deduct stock from the PreparedOrder batch
            po.quantity -= qty_to_sell
            
            if po.quantity <= 0:
                po.quantity = 0
                po.status = 'sold'

        # 5. Commit everything at once
        db.session.commit()

        return jsonify({
            "message": "Order completed successfully",
            "order_id": new_order.id
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@order_bp.route('/prepared-orders/<int:id>/donate', methods=['POST'])
@token_required
def mark_donated(id):
    try:
        po            = PreparedOrder.query.get_or_404(id)
        data          = request.json or {}
        qty_to_donate = int(data.get('quantity', po.quantity))

        if po.status != 'prepared':
            return jsonify({"error": f"Cannot donate — current status is '{po.status}'"}), 400
        if qty_to_donate <= 0:
            return jsonify({"error": "Quantity must be at least 1"}), 400
        if qty_to_donate > po.quantity:
            return jsonify({"error": f"Only {po.quantity} plates available"}), 400

        db.session.add(Ngodonation(
            dish_name=po.dish_name, quantity=qty_to_donate,
            unit='plates', ngo_name=data.get('ngo_name', ''),
            notes=data.get('notes', ''), donation_date=po.prep_date,
            user_id=g.user_id
        ))

        po.quantity -= qty_to_donate
        if po.quantity <= 0:
            po.quantity = 0
            po.status   = 'donated'

        db.session.commit()
        return jsonify({
            "message":       "Donated successfully",
            "remaining_qty": po.quantity,
            "status":         po.status
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@order_bp.route('/orders', methods=['GET'])
@token_required
def get_orders():
    orders = Order.query.filter_by(user_id=g.user_id).order_by(Order.created_at.desc()).all()
    result = []
    for o in orders:
        items = OrderItem.query.filter_by(order_id=o.id).all()
        result.append({
            "id":    o.id,
            "time":  o.created_at.strftime("%d %b %Y, %I:%M %p"),
            "items": [{"name": i.dish_name, "qty": i.quantity, "price": i.price} for i in items],
            "total": o.total,
            "status": o.status or "Paid"
        })
    return jsonify(result)

@order_bp.route('/orders/sales-summary', methods=['GET'])
@token_required
def sales_summary():
    try:
        rows = db.session.query(
            OrderItem.dish_name,
            db.func.sum(OrderItem.quantity).label('total_qty'),
            db.func.sum(OrderItem.quantity * OrderItem.price).label('total_revenue')
        ).join(Order, Order.id == OrderItem.order_id)\
         .filter(Order.user_id == g.user_id)\
         .group_by(OrderItem.dish_name).order_by(db.desc('total_qty')).all()

        return jsonify([{
            "dish_name":     r.dish_name,
            "total_qty":     int(r.total_qty),
            "total_revenue": float(r.total_revenue)
        } for r in rows]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@order_bp.route('/kitchen-donations/', methods=['GET'])
@token_required
def get_ngo_donations():
    try:
        # Filter by matching dish names owned by current user
        user_dish_names = [d.name for d in Dish.query.filter_by(user_id=g.user_id).all()]
        donations = Ngodonation.query.filter(
            Ngodonation.dish_name.in_(user_dish_names)
        ).order_by(Ngodonation.donated_at.desc()).all()
        return jsonify([d.to_dict() for d in donations]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@order_bp.route('/kitchen-donations/<int:id>', methods=['DELETE'])
@token_required
def delete_ngo_donation(id):
    try:
        donation = Ngodonation.query.get_or_404(id)
        # Ownership check
        if donation.user_id and donation.user_id != g.user_id:
            return jsonify({"error": "Unauthorized"}), 403
        db.session.delete(donation)
        db.session.commit()
        return jsonify({"message": "Donation record deleted"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ─── Profit & Loss Analysis ───────────────────────────────────────────────────

@order_bp.route('/orders/profit-loss', methods=['GET'])
@token_required
def profit_loss():
    """
    Aggregated Profit & Loss report per dish.
    Query params: ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
    Donated food is counted as a loss.
    """
    try:
        # ── Date range (default: last 30 days) ─────────────────────────────
        end_str   = request.args.get('end_date')
        start_str = request.args.get('start_date')

        if end_str:
            end_date = datetime.strptime(end_str, '%Y-%m-%d') + timedelta(days=1)  # inclusive
        else:
            end_date = datetime.utcnow() + timedelta(days=1)

        if start_str:
            start_date = datetime.strptime(start_str, '%Y-%m-%d')
        else:
            start_date = end_date - timedelta(days=31)

        # ── 1. Sales data: group order_items by dish_name within date range ─
        sales_rows = (
            db.session.query(
                OrderItem.dish_name,
                db.func.sum(OrderItem.quantity).label('total_qty'),
                db.func.sum(OrderItem.quantity * OrderItem.price).label('total_revenue')
            )
            .join(Order, Order.id == OrderItem.order_id)
            .filter(Order.user_id == g.user_id)
            .filter(Order.created_at >= start_date, Order.created_at < end_date)
            .group_by(OrderItem.dish_name)
            .all()
        )

        # ── 2. Donation data: group ngo_donations by dish_name within date range
        # Scope donations to current user
        donation_query = db.session.query(
            Ngodonation.dish_name,
            db.func.sum(Ngodonation.quantity).label('total_donated')
        ).filter(
            Ngodonation.donated_at >= start_date,
            Ngodonation.donated_at < end_date
        )
        if Ngodonation.__table__.columns.keys().__contains__('user_id'):
            donation_query = donation_query.filter(
                db.or_(Ngodonation.user_id == g.user_id, Ngodonation.user_id.is_(None))
            )
        donation_rows = donation_query.group_by(Ngodonation.dish_name).all()
        donation_map = {r.dish_name: int(r.total_donated) for r in donation_rows}

        # ── 3. Build per-dish P&L ──────────────────────────────────────────
        dishes_result = []
        grand_revenue = 0
        grand_cost    = 0
        grand_waste   = 0

        for row in sales_rows:
            dish_name  = row.dish_name
            qty_sold   = int(row.total_qty)
            revenue    = float(row.total_revenue)

            # Look up dish details
            dish = Dish.query.filter(
                db.func.lower(Dish.name) == dish_name.lower()
            ).first()

            cost_per_plate    = dish.cost if dish else 0
            profit_per_plate  = dish.profit if dish else 0
            revenue_per_plate = cost_per_plate + profit_per_plate
            image             = dish.image_url if dish else ''

            total_cost  = cost_per_plate * qty_sold
            qty_donated = donation_map.pop(dish_name, 0)
            waste_cost  = cost_per_plate * qty_donated

            margin = round(((revenue_per_plate - cost_per_plate) / revenue_per_plate * 100), 1) if revenue_per_plate else 0

            # ── Ingredient breakdown ────────────────────────────────────
            ingredients = []
            if dish:
                recipes = Recipe.query.filter_by(dish_id=dish.id).all()
                for r in recipes:
                    inv = InventoryItem.query.filter(
                        db.func.lower(InventoryItem.name) == r.ingredient_name.lower()
                    ).first()
                    ing_cost = round(r.quantity_required * inv.price, 2) if (inv and inv.price) else None
                    ingredients.append({
                        "name":           r.ingredient_name,
                        "qty":            r.quantity_required,
                        "unit":           r.unit,
                        "cost_per_plate": ing_cost
                    })

            dishes_result.append({
                "name":              dish_name,
                "image":             image,
                "cost_per_plate":    cost_per_plate,
                "revenue_per_plate": revenue_per_plate,
                "orders":            qty_sold,
                "donated":           qty_donated,
                "total_revenue":     revenue,
                "total_cost":        total_cost,
                "waste_cost":        waste_cost,
                "net_profit":        revenue - total_cost - waste_cost,
                "profit_margin":     margin,
                "ingredients":       ingredients
            })

            grand_revenue += revenue
            grand_cost    += total_cost
            grand_waste   += waste_cost

        # ── 4. Add dishes that were ONLY donated (no sales) ────────────
        for dish_name, qty_donated in donation_map.items():
            dish = Dish.query.filter(
                db.func.lower(Dish.name) == dish_name.lower()
            ).first()
            cost_per_plate    = dish.cost if dish else 0
            profit_per_plate  = dish.profit if dish else 0
            revenue_per_plate = cost_per_plate + profit_per_plate
            image             = dish.image_url if dish else ''
            waste_cost        = cost_per_plate * qty_donated

            ingredients = []
            if dish:
                recipes = Recipe.query.filter_by(dish_id=dish.id).all()
                for r in recipes:
                    inv = InventoryItem.query.filter(
                        db.func.lower(InventoryItem.name) == r.ingredient_name.lower()
                    ).first()
                    ing_cost = round(r.quantity_required * inv.price, 2) if (inv and inv.price) else None
                    ingredients.append({
                        "name":           r.ingredient_name,
                        "qty":            r.quantity_required,
                        "unit":           r.unit,
                        "cost_per_plate": ing_cost
                    })

            dishes_result.append({
                "name":              dish_name,
                "image":             image,
                "cost_per_plate":    cost_per_plate,
                "revenue_per_plate": revenue_per_plate,
                "orders":            0,
                "donated":           qty_donated,
                "total_revenue":     0,
                "total_cost":        0,
                "waste_cost":        waste_cost,
                "net_profit":        -waste_cost,
                "profit_margin":     0,
                "ingredients":       ingredients
            })
            grand_waste += waste_cost

        # Sort by total revenue descending
        dishes_result.sort(key=lambda d: d['total_revenue'], reverse=True)

        return jsonify({
            "summary": {
                "total_revenue": grand_revenue,
                "total_cost":    grand_cost,
                "total_waste":   grand_waste,
                "net_profit":    grand_revenue - grand_cost - grand_waste
            },
            "dishes": dishes_result
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500