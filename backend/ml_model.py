"""
SmartDine ML Recommendation Engine
===================================
3-Layer hybrid system:
  Layer 1: Rule-based   (always works, any data size)
  Layer 2: Statistical  (needs 30+ orders)
  Layer 3: ML Forecast  (needs 100+ orders, uses scikit-learn)
"""

import numpy as np
from datetime import datetime, timedelta
from collections import defaultdict

try:
    import pandas as pd
    from sklearn.linear_model import LinearRegression
    from sklearn.ensemble import RandomForestRegressor
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False


def generate_recommendations(db_session, user_id):
    from models import Dish, Order, OrderItem, InventoryItem, Ngodonation

    recs = []
    now = datetime.utcnow()

    # ── User-scoped queries ────────────────────────────────────────────────
    dishes = {d.name: d for d in Dish.query.filter_by(user_id=user_id).all()}
    inventory = {i.name: i for i in InventoryItem.query.filter_by(user_id=user_id).all()}

    cutoff_60 = now - timedelta(days=60)
    orders = Order.query.filter(
        Order.user_id == user_id,
        Order.created_at >= cutoff_60
    ).all()
    order_ids = [o.id for o in orders]
    all_items = OrderItem.query.filter(OrderItem.order_id.in_(order_ids)).all() if order_ids else []
    donations = Ngodonation.query.filter(
        Ngodonation.user_id == user_id,
        Ngodonation.donated_at >= cutoff_60
    ).all()
    total_orders = len(orders)

    recs.extend(_rule_based(dishes, inventory, all_items, donations, now))

    if total_orders >= 20:
        recs.extend(_statistical(dishes, orders, all_items, now))

    if total_orders >= 80 and ML_AVAILABLE:
        recs.extend(_ml_forecast(dishes, orders, all_items, now))

    # ── Deduplicate: keep highest-confidence rec per (type, title_key) ────
    seen = {}
    for r in recs:
        key = (r["type"], r["title"].split(" ")[1] if len(r["title"].split(" ")) > 1 else r["title"])
        if key not in seen or r["confidence"] > seen[key]["confidence"]:
            seen[key] = r
    recs = list(seen.values())

    priority_order = {"high": 0, "medium": 1, "low": 2}
    recs.sort(key=lambda r: priority_order.get(r["priority"], 3))

    for i, r in enumerate(recs):
        r["id"] = f"rec_{i+1:03d}"

    return recs


def _rule_based(dishes, inventory, all_items, donations, now):
    recs = []

    for name, item in inventory.items():
        if item.stock <= item.threshold:
            severity = "critical" if item.stock <= (item.threshold / 2) else "warning"
            recs.append({
                "type": "inventory",
                "priority": "high" if severity == "critical" else "medium",
                "title": f"Restock {name} Immediately" if severity == "critical" else f"Restock {name} Soon",
                "reason": f"Current stock is {item.stock} {item.unit} — {'critically' if severity == 'critical' else ''} below threshold of {item.threshold} {item.unit}.",
                "impact": f"Avoid stockout — estimated cost to restock: ₹{int((item.max_capacity - item.stock) * item.price):,}",
                "details": f"{name} is running low. Current stock: {item.stock} {item.unit}, threshold: {item.threshold} {item.unit}, max capacity: {item.max_capacity} {item.unit}. Supplier: {item.supplier_name or 'Not assigned'}. Recommended order: {round(item.max_capacity - item.stock, 1)} {item.unit}.",
                "data_source": "rule_based",
                "confidence": 0.95,
                "category": "Inventory"
            })

    sold_qty = defaultdict(int)
    for item in all_items:
        sold_qty[item.dish_name] += item.quantity

    donated_qty = defaultdict(int)
    for d in donations:
        donated_qty[d.dish_name] += d.quantity

    for dish_name in set(list(sold_qty.keys()) + list(donated_qty.keys())):
        sold = sold_qty.get(dish_name, 0)
        donated = donated_qty.get(dish_name, 0)
        total_made = sold + donated
        if total_made > 0 and donated > 0:
            waste_ratio = donated / total_made
            if waste_ratio > 0.25:
                dish = dishes.get(dish_name)
                cost_per_plate = dish.cost if dish else 0
                weekly_loss = int(cost_per_plate * donated / 8)
                recs.append({
                    "type": "preparation",
                    "priority": "high",
                    "title": f"Reduce {dish_name} Preparation by {int(waste_ratio * 100)}%",
                    "reason": f"{donated} of {total_made} plates ({int(waste_ratio*100)}%) were donated instead of sold in the last 60 days.",
                    "impact": f"Save ~₹{weekly_loss:,}/week in food waste costs",
                    "details": f"Over the past 60 days, {dish_name} had {sold} plates sold and {donated} donated. The donation rate of {int(waste_ratio*100)}% suggests over-preparation.",
                    "data_source": "rule_based",
                    "confidence": 0.80,
                    "category": "Preparation"
                })

    for dish_name, dish in dishes.items():
        if dish.cost > 0:
            margin = dish.profit / (dish.cost + dish.profit) * 100
            qty = sold_qty.get(dish_name, 0)
            if margin > 55 and qty > 10:
                recs.append({
                    "type": "menu_strategy",
                    "priority": "low",
                    "title": f"Promote {dish_name} — Star Performer",
                    "reason": f"{int(margin)}% profit margin with {qty} plates sold.",
                    "impact": f"Potential +₹{int(qty * dish.profit * 0.15):,} extra revenue with promotion",
                    "details": f"{dish_name} has a {int(margin)}% margin (cost ₹{int(dish.cost)}, sells at ₹{int(dish.cost + dish.profit)}). It sold {qty} plates in 60 days.",
                    "data_source": "rule_based",
                    "confidence": 0.70,
                    "category": "Menu Strategy"
                })

    return recs


def _statistical(dishes, orders, all_items, now):
    recs = []
    dow_demand = defaultdict(lambda: defaultdict(list))
    order_map = {o.id: o for o in orders}

    for item in all_items:
        order = order_map.get(item.order_id)
        if order and order.created_at:
            weekday = order.created_at.weekday()
            dow_demand[item.dish_name][weekday].append(item.quantity)

    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

    for dish_name, weekdays in dow_demand.items():
        if len(weekdays) < 3:
            continue

        avgs = {}
        for d in range(7):
            vals = weekdays.get(d, [])
            avgs[d] = np.mean(vals) if vals else 0

        overall_avg = np.mean([v for v in avgs.values() if v > 0]) if any(v > 0 for v in avgs.values()) else 0
        if overall_avg == 0:
            continue

        peak_day = max(avgs, key=avgs.get)
        peak_avg = avgs[peak_day]

        if peak_avg > overall_avg * 1.35:
            surge_pct = int((peak_avg / overall_avg - 1) * 100)
            dish = dishes.get(dish_name)
            extra_revenue = int(peak_avg * (dish.cost + dish.profit) * 0.2) if dish else 0
            recs.append({
                "type": "preparation",
                "priority": "medium",
                "title": f"Increase {dish_name} Prep by 25% on {day_names[peak_day]}s",
                "reason": f"{surge_pct}% higher demand on {day_names[peak_day]}s compared to other days.",
                "impact": f"Capture additional ~₹{extra_revenue:,}/week in revenue",
                "details": f"Weekly demand pattern for {dish_name}: " + ", ".join(
                    f"{day_names[d]}: {avgs[d]:.1f} avg" for d in range(7)
                ),
                "data_source": "statistical",
                "confidence": 0.75,
                "category": "Preparation"
            })

        non_zero = {d: v for d, v in avgs.items() if v > 0}
        if len(non_zero) >= 3:
            trough_day = min(non_zero, key=non_zero.get)
            trough_avg = non_zero[trough_day]
            if trough_avg < overall_avg * 0.6:
                drop_pct = int((1 - trough_avg / overall_avg) * 100)
                dish = dishes.get(dish_name)
                savings = int(trough_avg * dish.cost * 0.3) if dish else 0
                recs.append({
                    "type": "preparation",
                    "priority": "low",
                    "title": f"Reduce {dish_name} Prep on {day_names[trough_day]}s",
                    "reason": f"{drop_pct}% lower demand on {day_names[trough_day]}s vs average.",
                    "impact": f"Save ~₹{savings:,}/week in reduced waste",
                    "details": f"{dish_name} sees significantly lower demand on {day_names[trough_day]}s.",
                    "data_source": "statistical",
                    "confidence": 0.70,
                    "category": "Preparation"
                })

    cutoff_7 = now - timedelta(days=7)
    cutoff_30 = now - timedelta(days=30)

    recent_qty = defaultdict(int)
    older_qty = defaultdict(int)

    order_map = {o.id: o for o in orders}
    for item in all_items:
        order = order_map.get(item.order_id)
        if not order or not order.created_at:
            continue
        if order.created_at >= cutoff_7:
            recent_qty[item.dish_name] += item.quantity
        elif order.created_at >= cutoff_30:
            older_qty[item.dish_name] += item.quantity

    for dish_name in set(list(recent_qty.keys()) + list(older_qty.keys())):
        recent = recent_qty.get(dish_name, 0)
        older = older_qty.get(dish_name, 0)
        recent_daily = recent / 7
        older_daily = older / 23

        if older_daily > 0 and recent_daily > older_daily * 1.4:
            growth = int((recent_daily / older_daily - 1) * 100)
            recs.append({
                "type": "menu_strategy",
                "priority": "medium",
                "title": f"{dish_name} is Trending Up ↑ (+{growth}%)",
                "reason": f"Sales increased {growth}% in the last 7 days vs prior 23-day average.",
                "impact": "Consider increasing prep and highlighting on menu",
                "details": f"{dish_name}: {recent} sold in last 7 days vs {older} in prior 23 days.",
                "data_source": "statistical",
                "confidence": 0.65,
                "category": "Menu Strategy"
            })
        elif older_daily > 0.5 and recent_daily < older_daily * 0.5:
            drop = int((1 - recent_daily / older_daily) * 100)
            recs.append({
                "type": "menu_strategy",
                "priority": "medium",
                "title": f"{dish_name} is Declining ↓ (-{drop}%)",
                "reason": f"Sales dropped {drop}% in the last 7 days vs prior average.",
                "impact": "Review recipe, pricing, or consider replacing on menu",
                "details": f"{dish_name}: {recent} sold in last 7 days vs {older} in prior 23 days.",
                "data_source": "statistical",
                "confidence": 0.60,
                "category": "Menu Strategy"
            })

    return recs


def _ml_forecast(dishes, orders, all_items, now):
    recs = []
    order_map = {o.id: o for o in orders}
    daily_sales = defaultdict(lambda: defaultdict(int))

    for item in all_items:
        order = order_map.get(item.order_id)
        if order and order.created_at:
            date_str = order.created_at.strftime("%Y-%m-%d")
            daily_sales[date_str][item.dish_name] += item.quantity

    if len(daily_sales) < 14:
        return recs

    dates = sorted(daily_sales.keys())
    dish_names = list(dishes.keys())

    rows = []
    for date_str in dates:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        row = {
            "date": date_str,
            "day_of_week": dt.weekday(),
            "day_of_month": dt.day,
            "is_weekend": 1 if dt.weekday() >= 5 else 0,
            "days_ago": (now - dt).days,
        }
        for dn in dish_names:
            row[f"qty_{dn}"] = daily_sales[date_str].get(dn, 0)
        rows.append(row)

    df = pd.DataFrame(rows)
    features = ["day_of_week", "day_of_month", "is_weekend", "days_ago"]

    tomorrow = now + timedelta(days=1)
    tomorrow_features = np.array([[
        tomorrow.weekday(), tomorrow.day,
        1 if tomorrow.weekday() >= 5 else 0, 0
    ]])

    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    tomorrow_name = day_names[tomorrow.weekday()]

    for dish_name in dish_names:
        col = f"qty_{dish_name}"
        if col not in df.columns:
            continue
        y = df[col].values
        if y.sum() < 5:
            continue
        X = df[features].values
        try:
            model = RandomForestRegressor(n_estimators=50, random_state=42, max_depth=4)
            model.fit(X, y)
            predicted_qty = max(0, round(model.predict(tomorrow_features)[0], 1))
            avg_qty = round(y.mean(), 1)

            if predicted_qty > avg_qty * 1.3:
                diff_pct = int((predicted_qty / avg_qty - 1) * 100)
                dish = dishes.get(dish_name)
                extra_rev = int(predicted_qty * (dish.cost + dish.profit)) if dish else 0
                recs.append({
                    "type": "preparation",
                    "priority": "medium",
                    "title": f"ML Predicts {diff_pct}% Higher Demand for {dish_name} Tomorrow ({tomorrow_name})",
                    "reason": f"Random Forest model predicts ~{predicted_qty:.0f} plates vs {avg_qty:.0f} daily average.",
                    "impact": f"Prepare extra to capture ~₹{extra_rev:,} in potential revenue",
                    "details": f"Based on 60-day sales data, ML predicts {dish_name} demand will be {predicted_qty:.1f} plates on {tomorrow_name}. Historical average: {avg_qty:.1f}/day.",
                    "data_source": "ml_forecast",
                    "confidence": round(min(0.85, 0.5 + len(df) / 200), 2),
                    "category": "AI Forecast"
                })
            elif predicted_qty < avg_qty * 0.6 and avg_qty > 1:
                diff_pct = int((1 - predicted_qty / avg_qty) * 100)
                dish = dishes.get(dish_name)
                savings = int((avg_qty - predicted_qty) * dish.cost) if dish else 0
                recs.append({
                    "type": "preparation",
                    "priority": "low",
                    "title": f"ML Predicts {diff_pct}% Lower Demand for {dish_name} Tomorrow",
                    "reason": f"Model predicts ~{predicted_qty:.0f} plates vs {avg_qty:.0f} average.",
                    "impact": f"Reduce prep to save ~₹{savings:,} in potential waste",
                    "details": f"The ML model predicts reduced demand for {dish_name} on {tomorrow_name}.",
                    "data_source": "ml_forecast",
                    "confidence": round(min(0.80, 0.5 + len(df) / 200), 2),
                    "category": "AI Forecast"
                })
        except Exception:
            continue

    try:
        daily_totals = df[[c for c in df.columns if c.startswith("qty_")]].sum(axis=1).values
        X_trend = np.arange(len(daily_totals)).reshape(-1, 1)
        lr = LinearRegression()
        lr.fit(X_trend, daily_totals)
        slope = lr.coef_[0]
        if abs(slope) > 0.05:
            direction = "growing" if slope > 0 else "declining"
            weekly_change = round(slope * 7, 1)
            recs.append({
                "type": "menu_strategy",
                "priority": "low",
                "title": f"Overall Sales are {direction.title()} ({'+' if slope > 0 else ''}{weekly_change:.0f} plates/week)",
                "reason": f"Linear regression over {len(df)} days shows a {'positive' if slope > 0 else 'negative'} trend.",
                "impact": f"{'Keep up momentum' if slope > 0 else 'Investigate causes and take action'}",
                "details": f"A linear regression model shows a slope of {slope:.2f} plates/day.",
                "data_source": "ml_forecast",
                "confidence": 0.60,
                "category": "AI Forecast"
            })
    except Exception:
        pass

    return recs


# ══════════════════════════════════════════════════════════════════════════════
# CORE PREDICTION FUNCTION — Used by dish_routes.py forecasting endpoint
# ══════════════════════════════════════════════════════════════════════════════

def get_prediction_for_dish(dish_name, target_date_obj):
    """
    Returns (predicted_qty, model_accuracy_pct, training_rows) for a dish on a date.
    Uses RandomForest trained on historical daily sales.
    Falls back gracefully if not enough data.
    """
    from models import Order, OrderItem
    from database import db

    if not ML_AVAILABLE:
        return 10, 0.0, 0

    try:
        # Fetch all historical daily sales for this dish
        rows = db.session.query(
            db.func.date(Order.created_at).label('sale_date'),
            db.func.sum(OrderItem.quantity).label('qty')
        ).join(OrderItem, Order.id == OrderItem.order_id)\
         .filter(OrderItem.dish_name == dish_name)\
         .group_by(db.func.date(Order.created_at))\
         .order_by(db.func.date(Order.created_at))\
         .all()

        if len(rows) < 5:
            # Not enough data — use a simple mean of last 7 days
            recent = db.session.query(db.func.sum(OrderItem.quantity))\
                .join(Order, Order.id == OrderItem.order_id)\
                .filter(
                    OrderItem.dish_name == dish_name,
                    Order.created_at >= datetime.utcnow() - timedelta(days=7)
                ).scalar()
            fallback = int((recent or 0) / 7) or 5
            return fallback, 0.0, len(rows)

        # Build feature matrix
        records = []
        for r in rows:
            if r.sale_date is None:
                continue
            # sale_date can come back as string or date object
            if isinstance(r.sale_date, str):
                dt = datetime.strptime(r.sale_date, '%Y-%m-%d')
            else:
                dt = datetime.combine(r.sale_date, datetime.min.time())

            records.append({
                'day_of_week':  dt.weekday(),
                'day_of_month': dt.day,
                'month':        dt.month,
                'is_weekend':   1 if dt.weekday() >= 5 else 0,
                'qty':          int(r.qty)
            })

        df = pd.DataFrame(records)

        features = ['day_of_week', 'day_of_month', 'month', 'is_weekend']
        X = df[features].values
        y = df['qty'].values

        # Train on all data
        model = RandomForestRegressor(
            n_estimators=100,
            random_state=42,
            max_depth=5,
            min_samples_leaf=2
        )
        model.fit(X, y)

        # Predict for target date
        X_pred = np.array([[
            target_date_obj.weekday(),
            target_date_obj.day,
            target_date_obj.month,
            1 if target_date_obj.weekday() >= 5 else 0
        ]])
        prediction = int(round(model.predict(X_pred)[0]))
        prediction = max(1, prediction)  # always at least 1

        # Calculate model accuracy using Leave-One-Out cross validation (simple version)
        # Compare predicted vs actual on last 20% of data
        if len(df) >= 10:
            split = max(1, int(len(df) * 0.8))
            X_train, X_test = X[:split], X[split:]
            y_train, y_test = y[:split], y[split:]

            val_model = RandomForestRegressor(n_estimators=100, random_state=42, max_depth=5)
            val_model.fit(X_train, y_train)
            y_pred = val_model.predict(X_test)

            # MAPE-based accuracy: accuracy = 100 - mean_absolute_percentage_error
            errors = []
            for actual, pred in zip(y_test, y_pred):
                if actual > 0:
                    errors.append(abs(actual - pred) / actual * 100)
            
            if errors:
                mape = np.mean(errors)
                accuracy_pct = round(max(0, 100 - mape), 1)
            else:
                accuracy_pct = 0.0
        else:
            accuracy_pct = 0.0

        return prediction, accuracy_pct, len(df)

    except Exception as e:
        print(f"ML Prediction error for {dish_name}: {e}")
        return 10, 0.0, 0