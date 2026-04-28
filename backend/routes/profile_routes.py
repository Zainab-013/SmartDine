from flask import Blueprint, request, jsonify, g
from models import db, Profile
import os
from werkzeug.utils import secure_filename
from auth_middleware import token_required

# Create the blueprint
profile_bp = Blueprint('profile', __name__)

@profile_bp.route('/', methods=['GET'])
@token_required
def get_profile():
    profile = Profile.query.filter_by(user_id=g.user_id).first()
    if not profile:
        return jsonify({}), 200
    return jsonify({
        "name": profile.name,
        "email": profile.email,
        "phone": profile.phone,
        "restaurant": profile.restaurant,
        "location": profile.location,
        "cuisine": profile.cuisine,
        "capacity": profile.capacity,
        "established": profile.established,
        "website": profile.website,
        "image_url": profile.image_url
    })

@profile_bp.route('/update', methods=['POST'])
@token_required
def update_profile():
    profile = Profile.query.filter_by(user_id=g.user_id).first()
    if not profile:
        profile = Profile(user_id=g.user_id)
        db.session.add(profile)
    
    # Use request.form because we are using FormData in React
    profile.name = request.form.get('name')
    profile.email = request.form.get('email')
    profile.phone = request.form.get('phone')
    profile.restaurant = request.form.get('restaurant')
    profile.location = request.form.get('location')
    profile.cuisine = request.form.get('cuisine')
    profile.capacity = request.form.get('capacity')
    profile.established = request.form.get('established')
    profile.website = request.form.get('website')

    if 'image' in request.files:
        file = request.files['image']
        if file.filename != '':
            filename = secure_filename(file.filename)
            upload_path = os.path.join('static/uploads', filename)
            file.save(upload_path)
            profile.image_url = f"/static/uploads/{filename}"

    db.session.commit()
    return jsonify({"message": "Success"}), 200