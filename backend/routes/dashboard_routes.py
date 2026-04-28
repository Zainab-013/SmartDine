from flask import Blueprint, jsonify, g
from database import db
from models import Order, OrderItem, Ngodonation, Dish
from sqlalchemy import func
from datetime import datetime, timedelta
from auth_middleware import token_required

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/api/dashboard/stats', methods=['GET'])
@token_required
def get_dashboard_stats():
    try:
        today = datetime.utcnow().date()
        
        # 1. Today's Sales (user-scoped)
        today_sales = db.session.query(func.sum(Order.total)).filter(
            Order.user_id == g.user_id,
            func.date(Order.created_at) == today
        ).scalar() or 0.0

        # 2. Estimated Profit Calculation (user-scoped)
        profit_value = db.session.query(
            func.sum((OrderItem.price - Dish.cost) * OrderItem.quantity)
        ).join(Order, Order.id == OrderItem.order_id)\
         .join(Dish, func.lower(Dish.name) == func.lower(OrderItem.dish_name))\
         .filter(Order.user_id == g.user_id)\
         .scalar() or 0.0
        display_profit = float(profit_value)
        is_profit_positive = display_profit >= 0

        # 3. Meals Donated (user-scoped via dish names)
        user_dish_names = [d.name for d in Dish.query.filter_by(user_id=g.user_id).all()]
        if user_dish_names:
            total_donated = db.session.query(func.sum(Ngodonation.quantity)).filter(
                Ngodonation.dish_name.in_(user_dish_names)
            ).scalar() or 0
        else:
            total_donated = 0

        # 4. Last 7 Days Chart Data (user-scoped)
        chart_data = []
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            day_total = db.session.query(func.sum(Order.total)).filter(
                Order.user_id == g.user_id,
                func.date(Order.created_at) == day
            ).scalar() or 0.0
            chart_data.append({
                "name": day.strftime('%a'),
                "actual": float(day_total),
                "forecast": float(day_total) * 1.1 
            })

        # 5. Top Selling Dishes (user-scoped)
        top_dishes_query = db.session.query(
            OrderItem.dish_name, 
            func.sum(OrderItem.quantity).label('total_qty')
        ).join(Order, Order.id == OrderItem.order_id)\
         .filter(Order.user_id == g.user_id)\
         .group_by(OrderItem.dish_name).order_by(db.desc('total_qty')).limit(5).all()

        # 6. Real-time Dishes (user-scoped)
        perf_dishes = db.session.query(
            Dish.name,
            Dish.category,
            Dish.image_url,
            func.sum(OrderItem.quantity).label('total_qty'),
            func.avg(OrderItem.price - Dish.cost).label('avg_profit')
        ).join(OrderItem, Dish.name == OrderItem.dish_name)\
         .join(Order, Order.id == OrderItem.order_id)\
         .filter(Dish.user_id == g.user_id)\
         .group_by(Dish.id, Dish.name, Dish.category, Dish.image_url)\
         .order_by(db.desc('total_qty'))\
         .limit(4).all()

        real_top_dishes = []
        for d in perf_dishes:
            real_top_dishes.append({
                "name": d[0],
                "category": d[1],
                "image": d[2], 
                "profit": f"₹{float(d[4]):.2f}",
                "demand": "High Demand" if d[3] > 10 else "Trending"
            })

        return jsonify({
            "stats": [
                { "title": "Today's Sales", "value": f"₹{today_sales:,.0f}", "type": "sales", "change": "+12.5%" },
                { "title": "Estimated Profit", "value": f"{'₹' if is_profit_positive else '-₹'}{abs(display_profit):,.0f}", "type": "profit", "change": "+8.2%" if is_profit_positive else "Loss" },
                { "title": "Meals Donated", "value": str(int(total_donated)), "type": "donations", "change": "+6" }
            ],
            "chartData": chart_data,
            "topSelling": [{"name": d[0], "orders": int(d[1])} for d in top_dishes_query],
            "realTimeDishes": real_top_dishes 
        }), 200

    except Exception as e:
        print(f"Dashboard Error: {e}")
        return jsonify({"error": str(e)}), 500