import os
from flask import Blueprint, request, jsonify, g
from werkzeug.utils import secure_filename
from ml_model import get_prediction_for_dish
from datetime import datetime, timedelta
from database import db
from models import Dish, InventoryItem, Recipe, PreparedOrder, Order, OrderItem
from auth_middleware import token_required

dish_bp = Blueprint('dish_bp', __name__)
UPLOAD_FOLDER = 'static/uploads'


# ─── Get all dishes ────────────────────────────────────────────────────────────
@dish_bp.route('/all', methods=['GET'])
@token_required
def get_all_dishes():
    try:
        dishes = Dish.query.filter_by(user_id=g.user_id).all()
        return jsonify([d.to_dict() for d in dishes]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─── Add dish + save recipe ────────────────────────────────────────────────────
@dish_bp.route('/add', methods=['POST'])
@token_required
def add_dish():
    try:
        data = request.form
        image_file = request.files.get('image')
        image_path = _save_image(image_file) if image_file else ""

        cost_val    = data.get('cost', '0')
        profit_val  = data.get('profit', '0')

        new_dish = Dish(
            name=data.get('name'),
            category=data.get('category'),
            cost=float(cost_val if cost_val != '' else 0),
            profit=float(profit_val if profit_val != '' else 0),
            image_url=image_path,
            description=data.get('description', ''),
            ingredients=data.get('ingredients', ''),
            user_id=g.user_id
        )

        db.session.add(new_dish)
        db.session.flush()
        _save_recipe(new_dish.id, data.get('ingredients', ''), new_dish.user_id)
        db.session.commit()
        return jsonify({"message": "Dish added successfully!", "dish_id": new_dish.id}), 201

    except Exception as e:
        db.session.rollback()
        print(f"ADD DISH ERROR: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ─── Update dish + refresh recipe ─────────────────────────────────────────────
@dish_bp.route('/update/<int:id>', methods=['PUT'])
@token_required
def update_dish(id):
    try:
        dish = Dish.query.get_or_404(id)
        if dish.user_id != g.user_id:
            return jsonify({"error": "Unauthorized — you can only edit your own dishes"}), 403
        dish.name        = request.form.get('name',        dish.name)
        dish.category    = request.form.get('category',    dish.category)
        dish.cost        = float(request.form.get('cost',  dish.cost))
        dish.profit      = float(request.form.get('profit', dish.profit))
        dish.description = request.form.get('description', dish.description)
        dish.ingredients = request.form.get('ingredients', dish.ingredients)

        img = request.files.get('image')
        if img:
            dish.image_url = _save_image(img)

        Recipe.query.filter_by(dish_id=id).delete()
        _save_recipe(dish.id, dish.ingredients or '', dish.user_id)
        db.session.commit()
        return jsonify({"message": "Updated"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ─── Delete dish ───────────────────────────────────────────────────────────────
@dish_bp.route('/delete/<int:id>', methods=['DELETE'])
@token_required
def delete_dish(id):
    try:
        dish = Dish.query.get_or_404(id)
        if dish.user_id != g.user_id:
            return jsonify({"error": "Unauthorized — you can only delete your own dishes"}), 403
        Recipe.query.filter_by(dish_id=id).delete()
        db.session.delete(dish)
        db.session.commit()
        return jsonify({"message": "Deleted"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ─── Get recipe for a dish ─────────────────────────────────────────────────────
@dish_bp.route('/recipe/<int:dish_id>', methods=['GET'])
@token_required
def get_recipe(dish_id):
    try:
        recipes = Recipe.query.filter_by(dish_id=dish_id).all()
        result = []
        for r in recipes:
            inv = InventoryItem.query.filter(
                db.func.lower(InventoryItem.name) == r.ingredient_name.lower(),
                InventoryItem.user_id == g.user_id
            ).first()
            result.append({
                **r.to_dict(),
                "available_stock": inv.stock if inv else None,
                "is_available":    (inv.stock >= r.quantity_required) if inv else False
            })
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─── Availability check ───────────────────────────────────────────────────────
@dish_bp.route('/check-availability', methods=['POST'])
@token_required
def check_availability():
    """
    FIXED: 
    1. Checks recipes from DB first, falls back to parsing dish.ingredients string
    2. When no recipe rows exist, parses ingredients string directly from Dish model
    3. can_prepare = False if ANY ingredient is insufficient OR if ingredients list is empty
    """
    try:
        items = request.json.get('items', [])
        result = []

        for item in items:
            dish_id = item.get('id')
            qty     = int(item.get('orderQty', 1))
            ings    = []

            # ── Try DB recipes first ──────────────────────────────────────
            recipes = Recipe.query.filter_by(dish_id=dish_id).all()

            if recipes:
                # Recipe rows exist — use them
                for r in recipes:
                    needed = float(r.quantity_required) * qty
                    # Match inventory by name (case-insensitive, scoped to current user)
                    inv = InventoryItem.query.filter(
                        db.func.lower(InventoryItem.name) == r.ingredient_name.lower(),
                        InventoryItem.user_id == g.user_id
                    ).first()
                    available_stock = float(inv.stock) if inv else 0.0
                    ings.append({
                        "name":      r.ingredient_name,
                        "needed":    needed,
                        "unit":      r.unit,
                        "available": available_stock,
                        "ok":        available_stock >= needed
                    })
            else:
                # ── FALLBACK: No recipe rows → parse dish.ingredients string ──
                dish = Dish.query.get(dish_id)
                if dish and dish.ingredients:
                    for ing_str in dish.ingredients.split(','):
                        ing_str = ing_str.strip()
                        if not ing_str or '(' not in ing_str:
                            continue
                        try:
                            parts   = ing_str.split('(')
                            name    = parts[0].strip()
                            raw     = parts[1].rstrip(')').strip()
                            num_str = ''.join(c for c in raw if c.isdigit() or c == '.')
                            unit    = ''.join(c for c in raw if c.isalpha())
                            qty_per = float(num_str) if num_str else 0.0
                            needed  = qty_per * qty

                            # Match inventory by name (case-insensitive, scoped to current user)
                            inv = InventoryItem.query.filter(
                                db.func.lower(InventoryItem.name) == name.lower(),
                                InventoryItem.user_id == g.user_id
                            ).first()
                            available_stock = float(inv.stock) if inv else 0.0

                            ings.append({
                                "name":      name,
                                "needed":    needed,
                                "unit":      unit,
                                "available": available_stock,
                                "ok":        available_stock >= needed
                            })
                        except Exception as parse_err:
                            print(f"Ingredient parse error: {parse_err}")
                            continue

            # ── can_prepare logic ─────────────────────────────────────────
            # CRITICAL FIX: if no ingredients found at all → block (don't silently pass)
            if len(ings) == 0:
                can_prepare = False
                ings = [{
                    "name":      "Recipe not configured",
                    "needed":    0,
                    "unit":      "",
                    "available": 0,
                    "ok":        False
                }]
            else:
                can_prepare = all(i['ok'] for i in ings)

            result.append({
                "dish_id":     dish_id,
                "dish_name":   item.get('name'),
                "can_prepare": can_prepare,
                "ingredients": ings
            })

        return jsonify(result), 200

    except Exception as e:
        print(f"CHECK AVAILABILITY ERROR: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ─── Checkout ─────────────────────────────────────────────────────────────────
@dish_bp.route('/checkout', methods=['POST'])
@token_required
def checkout():
    try:
        data    = request.json
        user_id = g.user_id
        items   = data.get('items', [])
        if not items:
            return jsonify({"error": "No items provided"}), 400

        prepared_ids = []
        for item in items:
            dish_id = item.get('id')
            qty     = int(item.get('orderQty', 1))
            cost    = float(item.get('cost', 0))
            profit  = float(item.get('profit', 0))

            po = PreparedOrder(
                dish_id   = dish_id,
                dish_name = item.get('name'),
                quantity  = qty,
                cost      = cost,
                profit    = profit,
                price     = cost + profit,
                prep_date = item.get('queueDate', datetime.now().strftime('%Y-%m-%d')),
                status    = 'prepared',
                user_id   = user_id
            )
            db.session.add(po)
            db.session.flush()
            prepared_ids.append(po.id)

            # Deduct from inventory
            recipes = Recipe.query.filter_by(dish_id=dish_id).all()
            if recipes:
                for r in recipes:
                    inv = InventoryItem.query.filter(
                        db.func.lower(InventoryItem.name) == r.ingredient_name.lower(),
                        InventoryItem.user_id == g.user_id
                    ).first()
                    if inv:
                        inv.stock = max(0, inv.stock - r.quantity_required * qty)
            else:
                # Fallback: parse ingredients string
                dish = Dish.query.get(dish_id)
                if dish and dish.ingredients:
                    for ing_str in dish.ingredients.split(','):
                        ing_str = ing_str.strip()
                        if not ing_str or '(' not in ing_str:
                            continue
                        try:
                            parts   = ing_str.split('(')
                            name    = parts[0].strip()
                            raw     = parts[1].rstrip(')').strip()
                            num_str = ''.join(c for c in raw if c.isdigit() or c == '.')
                            qty_per = float(num_str) if num_str else 0.0
                            inv = InventoryItem.query.filter(
                                db.func.lower(InventoryItem.name) == name.lower(),
                                InventoryItem.user_id == g.user_id
                            ).first()
                            if inv:
                                inv.stock = max(0, inv.stock - qty_per * qty)
                        except:
                            continue

        db.session.commit()
        return jsonify({"message": "Preparation confirmed", "prepared_ids": prepared_ids}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ─── Forecasting ─────────────────────────────────────────────────────────────
@dish_bp.route('/forecasting', methods=['GET'])
@token_required
def get_dishes_forecasting():
    try:
        date_param = request.args.get('date')
        if date_param:
            target_date = datetime.strptime(date_param, '%Y-%m-%d')
        else:
            target_date = datetime.now()

        query_date_str = target_date.strftime('%Y-%m-%d')
        dishes = Dish.query.filter_by(user_id=g.user_id).all()
        forecast_results = []

        for d in dishes:
            # ── 1. ML Prediction ─────────────────────────────────────────
            prediction_result = get_prediction_for_dish(d.name, target_date)
            if isinstance(prediction_result, tuple):
                predicted_qty, model_accuracy, training_rows = prediction_result
            else:
                predicted_qty  = int(prediction_result)
                model_accuracy = 0.0
                training_rows  = 0

            # ── 2. Real actual sales on selected date ─────────────────────
            actual_data = (
                db.session.query(db.func.sum(OrderItem.quantity))
                .join(Order, OrderItem.order_id == Order.id)
                .filter(
                    OrderItem.dish_name == d.name,
                    db.func.date(Order.created_at) == query_date_str
                )
                .scalar()
            )
            actual_count = int(actual_data) if actual_data else 0

            # ── 3. Accuracy ───────────────────────────────────────────────
            if actual_count > 0 and predicted_qty > 0:
                acc = (min(actual_count, predicted_qty) / max(actual_count, predicted_qty)) * 100
                accuracy_str = f"{int(acc)}%"
            elif actual_count == 0 and predicted_qty == 0:
                accuracy_str = "100%"
            else:
                accuracy_str = "Pending"

            # ── 4. Weekly trend ───────────────────────────────────────────
            week_ago  = target_date - timedelta(days=7)
            two_weeks = target_date - timedelta(days=14)

            last_week = (
                db.session.query(db.func.sum(OrderItem.quantity))
                .join(Order, OrderItem.order_id == Order.id)
                .filter(
                    OrderItem.dish_name == d.name,
                    db.func.date(Order.created_at) >= week_ago.strftime('%Y-%m-%d'),
                    db.func.date(Order.created_at) <  query_date_str
                )
                .scalar()
            ) or 0

            prev_week = (
                db.session.query(db.func.sum(OrderItem.quantity))
                .join(Order, OrderItem.order_id == Order.id)
                .filter(
                    OrderItem.dish_name == d.name,
                    db.func.date(Order.created_at) >= two_weeks.strftime('%Y-%m-%d'),
                    db.func.date(Order.created_at) <  week_ago.strftime('%Y-%m-%d')
                )
                .scalar()
            ) or 0

            if prev_week > 0:
                trend_pct = int(((last_week - prev_week) / prev_week) * 100)
                trend_str = f"+{trend_pct}%" if trend_pct >= 0 else f"{trend_pct}%"
            elif last_week > 0:
                trend_str = "New"
            else:
                trend_str = "0%"

            # ── 5. Peak hour ──────────────────────────────────────────────
            peak_row = (
                db.session.query(
                    db.func.extract('hour', Order.created_at).label('hour'),
                    db.func.sum(OrderItem.quantity).label('qty')
                )
                .join(OrderItem, Order.id == OrderItem.order_id)
                .filter(OrderItem.dish_name == d.name)
                .group_by('hour')
                .order_by(db.desc('qty'))
                .first()
            )

            if peak_row and peak_row.hour is not None:
                h = int(peak_row.hour)
                suffix = "AM" if h < 12 else "PM"
                h12 = h if h <= 12 else h - 12
                h12 = 12 if h12 == 0 else h12
                peak_time = f"{h12}-{(h12 % 12) + 1} {suffix}"
            else:
                peak_time = "7-9 PM"

            forecast_results.append({
                "id":        d.id,
                "dish":      d.name,
                "predicted": predicted_qty,
                "actual":    actual_count,
                "accuracy":  accuracy_str,
                "image":     d.image_url or "/static/uploads/placeholder.jpg",
                "avgOrder":  f"₹{int(d.cost + d.profit)}",
                "peakTime":  peak_time,
                "trend":     trend_str,
            })

        return jsonify(forecast_results), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ─── Helpers ───────────────────────────────────────────────────────────────────
def _save_image(image_file):
    if not image_file: return ""
    if not os.path.exists(UPLOAD_FOLDER): os.makedirs(UPLOAD_FOLDER)
    filename = secure_filename(image_file.filename)
    image_file.save(os.path.join(UPLOAD_FOLDER, filename))
    return f"/static/uploads/{filename}"


def _save_recipe(dish_id, ingredients_string, user_id):
    """
    FIXED: Tries to find inventory item with user_id first,
    then falls back to any matching inventory item (no user_id filter).
    This prevents recipes from being silently skipped.
    """
    if not ingredients_string: return
    for ing in ingredients_string.split(','):
        ing = ing.strip()
        if not ing or '(' not in ing: continue
        try:
            parts   = ing.split('(')
            name    = parts[0].strip()
            raw     = parts[1].rstrip(')').strip()
            num_str = ''.join(c for c in raw if c.isdigit() or c == '.')
            unit    = ''.join(c for c in raw if c.isalpha())
            qty     = float(num_str) if num_str else 0.0

            # Try with user_id first
            inv_item = InventoryItem.query.filter(
                db.func.lower(InventoryItem.name) == name.lower(),
                InventoryItem.user_id == user_id
            ).first()

            # Fallback: match by name only (no user_id filter)
            if not inv_item:
                inv_item = InventoryItem.query.filter(
                    db.func.lower(InventoryItem.name) == name.lower()
                ).first()

            if not inv_item:
                print(f"WARNING: '{name}' not found in Inventory at all — add it to inventory first.")
                # Still save the recipe row so availability check can use dish.ingredients fallback
                db.session.add(Recipe(
                    dish_id=dish_id,
                    ingredient_name=name,
                    quantity_required=qty,
                    unit=unit
                ))
                continue

            db.session.add(Recipe(
                dish_id=dish_id,
                ingredient_name=name,
                quantity_required=qty,
                unit=unit
            ))
        except Exception as e:
            print(f"Skipping malformed ingredient: {e}")
            continue