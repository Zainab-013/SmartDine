from flask import Blueprint, jsonify, send_file, g
from database import db
from models import Order, OrderItem, Ngodonation, Dish
from sqlalchemy import func, cast, String
from datetime import datetime
from auth_middleware import token_required
import pandas as pd
import io

report_bp = Blueprint('report', __name__)

@report_bp.route('/api/reports/stats', methods=['GET'])
@token_required
def get_report_stats():
    try:
        # 1. Total Profit/Revenue (user-scoped)
        total_profit_row = db.session.query(func.sum(Order.total)).filter(
            Order.user_id == g.user_id
        ).scalar()
        total_profit = float(total_profit_row) if total_profit_row else 0.0

        # 2. Total Meals Donated (user-scoped via dish names)
        user_dish_names = [d.name for d in Dish.query.filter_by(user_id=g.user_id).all()]
        if user_dish_names:
            total_meals_row = db.session.query(func.sum(Ngodonation.quantity)).filter(
                Ngodonation.dish_name.in_(user_dish_names)
            ).scalar()
        else:
            total_meals_row = None
        total_meals = int(total_meals_row) if total_meals_row else 0

        # 3. Monthly Profit Trend (user-scoped)
        profit_trend_data = db.session.query(
            func.to_char(Order.created_at, 'Mon').label('month'),
            func.sum(Order.total).label('profit'),
            func.min(Order.created_at).label('sort_date')
        ).filter(Order.user_id == g.user_id)\
         .group_by('month').order_by('sort_date').limit(6).all()

        profit_trend = [{"month": row.month, "profit": float(row.profit)} for row in profit_trend_data]

        # 4. Monthly Donation Trend (user-scoped via dish names)
        if user_dish_names:
            donation_trend_data = db.session.query(
                func.to_char(Ngodonation.donated_at, 'Mon').label('month'),
                func.sum(Ngodonation.quantity).label('meals'),
                func.min(Ngodonation.donated_at).label('sort_date')
            ).filter(Ngodonation.dish_name.in_(user_dish_names))\
             .group_by('month').order_by('sort_date').limit(6).all()
        else:
            donation_trend_data = []

        donation_impact = [{"month": row.month, "meals": int(row.meals)} for row in donation_trend_data]

        # 5. Category Breakdown (user-scoped)
        category_data = db.session.query(
            Dish.category,
            func.count(OrderItem.id)
        ).join(OrderItem, Dish.name == OrderItem.dish_name)\
         .join(Order, Order.id == OrderItem.order_id)\
         .filter(Dish.user_id == g.user_id)\
         .group_by(Dish.category).all()

        categories = [{"name": row[0], "value": row[1]} for row in category_data]

        # Defaults if data is missing
        if not profit_trend: profit_trend = [{"month": "No Data", "profit": 0}]
        if not donation_impact: donation_impact = [{"month": "No Data", "meals": 0}]
        if not categories: categories = [{"name": "No Data", "value": 0}]

        return jsonify({
            "summary": [
                { 
                    "label": "Total Revenue", 
                    "value": f"₹{total_profit:,.2f}", 
                    "sublabel": "Overall Sales", 
                    "type": "profit" 
                },
                { 
                    "label": "Meals Donated", 
                    "value": f"{total_meals}", 
                    "sublabel": "NGO Impact", 
                    "type": "donations" 
                }
            ],
            "profitTrend": profit_trend,
            "donationImpact": donation_impact,
            "categoryBreakdown": categories
        })

    except Exception as e:
        print(f"CRITICAL ERROR: {str(e)}")
        return jsonify({"error": str(e)}), 500

@report_bp.route('/api/reports/download', methods=['GET'])
@token_required
def download_report():
    try:
        # Fetch Sales Data (user-scoped)
        orders = Order.query.filter_by(user_id=g.user_id).all()
        sales_data = [{
            "Order ID": o.id, 
            "Total (INR)": o.total, 
            "Date": o.created_at.strftime("%Y-%m-%d %H:%M")
        } for o in orders]
        
        # Fetch Donation Data (user-scoped via dish names)
        user_dish_names = [d.name for d in Dish.query.filter_by(user_id=g.user_id).all()]
        if user_dish_names:
            donations = Ngodonation.query.filter(
                Ngodonation.dish_name.in_(user_dish_names)
            ).all()
        else:
            donations = []
        donation_data = [{
            "NGO Name": d.ngo_name,
            "Dish": d.dish_name,
            "Quantity": d.quantity,
            "Date": d.donated_at.strftime("%Y-%m-%d")
        } for d in donations]

        # Create Excel in memory
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            pd.DataFrame(sales_data).to_excel(writer, sheet_name='Sales', index=False)
            pd.DataFrame(donation_data).to_excel(writer, sheet_name='Donations', index=False)
        
        output.seek(0)
        return send_file(
            output,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name=f"SmartDine_Report_{datetime.now().strftime('%Y%m%d')}.xlsx"
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500