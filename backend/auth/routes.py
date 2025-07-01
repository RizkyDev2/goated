# auth/routes.py
from flask import request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token
from models import db, User
from . import auth_bp

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    if not name or not email or not password:
        return jsonify({"message": "Semua field wajib diisi"}), 400

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"message": "Email sudah terdaftar"}), 409

    hashed_pw = generate_password_hash(password)
    new_user = User(name=name, email=email, password=hashed_pw)

    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "Registrasi berhasil"}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        user = User.query.filter_by(email=email).first()
        if not user or not check_password_hash(user.password, password):
            return jsonify({'message': 'Email atau password salah'}), 401

        # Fix: Convert user.id to string to ensure JWT subject is always a string
        access_token = create_access_token(identity=str(user.id))
        
        return jsonify({
            'token': access_token,
            'name': user.name,
            'role': user.role,
            'id': user.id  # Include user ID for frontend reference
        }), 200
        
    except Exception as e:
        print(f"Login error: {str(e)}")
        return jsonify({'message': 'Login failed'}), 500