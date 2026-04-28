from flask import Flask, send_from_directory
from flask_cors import CORS
from database import initialize_db, db
from routes.auth_routes import auth_bp
from routes.dish_routes import dish_bp
from routes.inventory_routes import inventory_bp
from routes.donation_routes import donation_bp
from routes.order_routes import order_bp
from routes.recommendation_routes import recommendation_bp
from routes.profile_routes import profile_bp
from routes.report_routes import report_bp
from routes.dashboard_routes import dashboard_bp
from routes.notification_routes import notification_bp
import os
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)

cors_origins = os.getenv('CORS_ORIGINS', '*').split(',')
CORS(app, origins=cors_origins)

initialize_db(app)

with app.app_context():
    db.create_all()

app.register_blueprint(auth_bp,           url_prefix='/api/auth')
app.register_blueprint(dish_bp,           url_prefix='/api/dishes')
app.register_blueprint(inventory_bp,      url_prefix='/api/inventory')
app.register_blueprint(order_bp,          url_prefix='/api')
app.register_blueprint(donation_bp,       url_prefix='/api/ngo-donations')
app.register_blueprint(recommendation_bp, url_prefix='/api/recommendations')
app.register_blueprint(profile_bp,        url_prefix='/api/profile')
app.register_blueprint(report_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(notification_bp) # NEW

@app.route('/static/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(os.path.join('static', 'uploads'), filename)

@app.route('/')
def home():
    return {"message": "SmartDine API is online!"}

if __name__ == '__main__':
    upload_path = os.path.join('static', 'uploads')
    if not os.path.exists(upload_path):
        os.makedirs(upload_path)
    app.run(debug=True, port=5000)