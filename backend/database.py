import os
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Create the db object here
db = SQLAlchemy()

def initialize_db(app):
    # Read database URL from .env file
    db_url = os.getenv('DATABASE_URL', 'postgresql://postgres:root@localhost:5432/smart_restaurant_ai')
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'fallback-secret-key')
    db.init_app(app)
