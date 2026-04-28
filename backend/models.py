from database import db
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta


# ─── User ──────────────────────────────────────────────────────────────────────
class User(db.Model):
    __tablename__ = 'users'

    id              = db.Column(db.Integer, primary_key=True)
    email           = db.Column(db.String(120), unique=True, nullable=False)
    password_hash   = db.Column(db.String(255), nullable=False)
    restaurant_name = db.Column(db.String(100))

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


# ─── Dish ──────────────────────────────────────────────────────────────────────
class Dish(db.Model):
    __tablename__ = 'dishes'

    id          = db.Column(db.Integer, primary_key=True)
    name        = db.Column(db.String(100), nullable=False)
    category    = db.Column(db.String(50),  nullable=False)
    cost        = db.Column(db.Float,       nullable=False)
    profit      = db.Column(db.Float,       nullable=False)
    image_url   = db.Column(db.String(255))
    description = db.Column(db.Text)
    ingredients = db.Column(db.Text)
    user_id     = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    recipe_items = db.relationship(
        'Recipe', backref='dish',
        cascade='all, delete-orphan', lazy=True
    )

    def to_dict(self):
        return {
            "id":          self.id,
            "name":        self.name,
            "category":    self.category,
            "cost":        self.cost,
            "profit":      self.profit,
            "image":       self.image_url,
            "description": self.description or "",
            "ingredients": self.ingredients or ""
        }


# ─── Recipe ────────────────────────────────────────────────────────────────────
class Recipe(db.Model):
    __tablename__ = 'recipes'

    id                = db.Column(db.Integer, primary_key=True)
    dish_id           = db.Column(db.Integer, db.ForeignKey('dishes.id', ondelete='CASCADE'), nullable=False)
    ingredient_name   = db.Column(db.String(120), nullable=False)
    quantity_required = db.Column(db.Float, nullable=False, default=0)
    unit              = db.Column(db.String(20), default='')

    # NOTE: 'dish' backref is created by Dish.recipe_items — do NOT re-declare here

    def to_dict(self):
        return {
            "id":                self.id,
            "dish_id":           self.dish_id,
            "ingredient_name":   self.ingredient_name,
            "quantity_required": self.quantity_required,
            "unit":              self.unit
        }


# ─── PreparedOrder ─────────────────────────────────────────────────────────────
# Written when kitchen confirms preparation from the Menu page queue.
# Inventory is deducted at this point.
#
# Status lifecycle:
#   'prepared'  — dish is ready, sitting in kitchen
#   'sold'      — marked as sold in Billing tab  → recorded in orders table
#   'donated'   — marked as donated in NGO tab   → recorded in ngo_donations table
class PreparedOrder(db.Model):
    __tablename__ = 'prepared_orders'

    id          = db.Column(db.Integer, primary_key=True)
    dish_id     = db.Column(db.Integer, db.ForeignKey('dishes.id'), nullable=False)
    dish_name   = db.Column(db.String(100), nullable=False)
    quantity    = db.Column(db.Integer, nullable=False, default=1)
    cost        = db.Column(db.Float, default=0)
    profit      = db.Column(db.Float, default=0)
    price       = db.Column(db.Float, default=0)   # cost + profit (selling price)
    prep_date   = db.Column(db.String(20), default='')
    status      = db.Column(db.String(20), default='prepared')  # prepared | sold | donated
    prepared_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id     = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    dish = db.relationship('Dish', lazy=True)

    def to_dict(self):
        return {
            "id":          self.id,
            "dish_id":     self.dish_id,
            "dish_name":   self.dish_name,
            "quantity":    self.quantity,
            "cost":        self.cost,
            "profit":      self.profit,
            "price":       self.price,
            "prep_date":   self.prep_date,
            "status":      self.status,
            "prepared_at": self.prepared_at.strftime("%d %b %Y, %I:%M %p"),
            "image":       self.dish.image_url if self.dish else ""
        }


# ─── Order ─────────────────────────────────────────────────────────────────────
class Order(db.Model):
    __tablename__ = 'orders'

    id          = db.Column(db.Integer, primary_key=True)
    total       = db.Column(db.Float,      nullable=False)
    status      = db.Column(db.String(20), default="Paid")
    prep_date   = db.Column(db.String(50))
    
    expiry_time = db.Column(db.DateTime,   default=lambda: datetime.utcnow() + timedelta(hours=24))
    created_at  = db.Column(db.DateTime,   default=db.func.now())
    user_id     = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    items = db.relationship('OrderItem', backref='order', lazy=True)

    def to_dict(self):
        return {
            "id":         self.id,
            "total":      self.total,
            "status":     self.status,
            "prep_date":  self.prep_date,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "items":      [item.to_dict() for item in self.items]
        }


# ─── OrderItem ─────────────────────────────────────────────────────────────────
class OrderItem(db.Model):
    __tablename__ = 'order_items'

    id        = db.Column(db.Integer, primary_key=True)
    order_id  = db.Column(db.Integer, db.ForeignKey('orders.id'))
    dish_name = db.Column(db.String(100))
    quantity  = db.Column(db.Integer)
    price     = db.Column(db.Float)

    def to_dict(self):
        return {
            "name":  self.dish_name,
            "qty":   self.quantity,
            "price": self.price
        }


# ─── InventoryItem ─────────────────────────────────────────────────────────────
class InventoryItem(db.Model):
    __tablename__ = 'inventory'

    id             = db.Column(db.Integer, primary_key=True)
    name           = db.Column(db.String(100), nullable=False)
    stock          = db.Column(db.Float,       nullable=False)
    unit           = db.Column(db.String(20),  nullable=False)
    threshold      = db.Column(db.Float,       nullable=False)
    max_capacity   = db.Column(db.Float,       nullable=False)
    price          = db.Column(db.Float,       default=0.0)
    supplier_name  = db.Column(db.String(100), nullable=True)
    supplier_email = db.Column(db.String(120), nullable=True)
    user_id        = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    def to_dict(self):
        return {
            "id":             self.id,
            "name":           self.name,
            "stock":          self.stock,
            "unit":           self.unit,
            "threshold":      self.threshold,
            "max":            self.max_capacity,
            "price":          self.price,
            "supplier_name":  self.supplier_name,
            "supplier_email": self.supplier_email
        }


# ─── Ngo ───────────────────────────────────────────────────────────────────────
class Ngo(db.Model):
    __tablename__ = 'ngos'

    id          = db.Column(db.Integer, primary_key=True)
    name        = db.Column(db.String(100), nullable=False)
    location    = db.Column(db.String(255))
    description = db.Column(db.Text)
    capacity    = db.Column(db.String(50))

    def to_dict(self):
        return {
            "id":          self.id,
            "name":        self.name,
            "location":    self.location,
            "description": self.description,
            "capacity":    self.capacity
        }


# ─── Donation (full structured donation system) ────────────────────────────────
class Donation(db.Model):
    __tablename__ = 'donations'

    id             = db.Column(db.Integer, primary_key=True)
    transaction_id = db.Column(db.String(20), unique=True, nullable=False)
    food_items     = db.Column(db.Text,   nullable=False)
    total_weight   = db.Column(db.Float,  nullable=False)
    date           = db.Column(db.String(50), nullable=False)
    status         = db.Column(db.String(20), default='donated')
    user_id        = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    ngo_id         = db.Column(db.Integer, db.ForeignKey('ngos.id'),  nullable=False)

    ngo = db.relationship('Ngo', backref='donations')

    def to_dict(self):
        return {
            "id":     self.transaction_id,
            "food":   self.food_items,
            "ngo":    self.ngo.name if self.ngo else "Unknown",
            "qty":    f"{self.total_weight} kg",
            "date":   self.date,
            "status": self.status
        }


# ─── Ngodonation (quick unsold-food log from Billing page NGO tab) ─────────────
class Ngodonation(db.Model):
    __tablename__ = 'ngo_donations'

    id            = db.Column(db.Integer, primary_key=True)
    dish_name     = db.Column(db.String(120), nullable=False)
    quantity      = db.Column(db.Integer,     default=1)
    unit          = db.Column(db.String(30),  default='plates')
    ngo_name      = db.Column(db.String(200), default='')
    notes         = db.Column(db.Text,        default='')
    donation_date = db.Column(db.String(20),  default='')
    donated_at    = db.Column(db.DateTime,    default=datetime.utcnow)
    user_id       = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    def to_dict(self):
        return {
            "id":            self.id,
            "dish_name":     self.dish_name,
            "quantity":      self.quantity,
            "unit":          self.unit,
            "ngo_name":      self.ngo_name,
            "notes":         self.notes,
            "donation_date": self.donation_date,
            "donated_at":    self.donated_at.strftime("%d %b %Y, %I:%M %p")
        }

class Profile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    name = db.Column(db.String(100), default="")
    email = db.Column(db.String(100), default="")
    phone = db.Column(db.String(20), default="")
    restaurant = db.Column(db.String(100), default="")
    location = db.Column(db.String(200), default="")
    cuisine = db.Column(db.String(200), default="")
    capacity = db.Column(db.String(50), default="")
    established = db.Column(db.String(50), default="")
    website = db.Column(db.String(100), default="")
    image_url = db.Column(db.String(255), nullable=True)


# ─── DismissedNotification ─────────────────────────────────────────────────────
# Persists notification dismissals so they survive server restarts.
class DismissedNotification(db.Model):
    __tablename__ = 'dismissed_notifications'

    id       = db.Column(db.Integer, primary_key=True)
    user_id  = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    notif_id = db.Column(db.String(100), nullable=False)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'notif_id', name='uq_user_notif'),
    )