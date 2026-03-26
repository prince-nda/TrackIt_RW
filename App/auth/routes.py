from flask import Blueprint, request, jsonify, current_app
from App.extensions import db, bcrypt 
from App.models import User
from App.utils.decorators import role_required

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")
    phone_number = data.get("phone_number")

    # check if the email already exists
    existing_user = User.query.filter_by(email=email).first()

    if existing_user:
        return jsonify({"message": "Email already registered"}), 400

    # hash password
    hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")

    new_user = User(
        username=username,
        email=email,
        password=hashed_password,
        phone_number=phone_number,
        role="Citizen"
    )

    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User registered successfully"}), 201

# now user log in
from flask_jwt_extended import create_access_token
@auth_bp.route("/login", methods=["POST"])
def login():

    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({"message": "Invalid credentials"}), 401

    if not bcrypt.check_password_hash(user.password, password):
        return jsonify({"message": "Invalid credentials"}), 401

    access_token = create_access_token(
        identity=str(user.id),           
        additional_claims={"role": user.role}  
    )

    return jsonify({
        "access_token": access_token,
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role
        }
    }), 200

# admin check endpoint for dashboard gating
from flask_jwt_extended import jwt_required, get_jwt_identity

@auth_bp.route("/admin/check", methods=["GET"])
@jwt_required()
@role_required("Admin")
def admin_check():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    return jsonify({
        "message": "Admin access validated",
        "user": {"id": user.id, "username": user.username, "role": user.role}
    }), 200

# @auth_bp.route("/admin/promote", methods=["POST"])
# @jwt_required()
# @role_required("Admin")
# def promote_user():
#     data = request.get_json() or {}
#     email = data.get("email")

#     if not email:
#         return jsonify({"message": "Email is required"}), 400

#     user = User.query.filter_by(email=email).first()
#     if not user:
#         return jsonify({"message": "User not found"}), 404

#     user.role = "Admin"
#     db.session.commit()

#     return jsonify({"message": f"{user.email} promoted to Admin"}), 200

# user profile
@auth_bp.route("/profile", methods=["GET"])
@jwt_required()
def profile():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role
    }

@auth_bp.route("/create-authority", methods=["POST"])
def create_authority():
    secret = request.headers.get("X-Admin-Secret")
    if secret != current_app.config["ADMIN_SECRET_KEY"]:
        return jsonify({"message": "Unauthorized"}), 401

    data = request.get_json()
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")
    phone_number = data.get("phone_number")

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already registered"}), 400

    hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")

    authority = User(
        username=username,
        email=email,
        password=hashed_password,
        phone_number=phone_number,
        role="Admin"
    )

    db.session.add(authority)
    db.session.commit()

    return jsonify({
        "message": f"Authority account created for {email}",
        "user": {
            "id": authority.id,
            "username": authority.username,
            "email": authority.email,
            "role": authority.role
        }
    }), 201


# @auth_bp.route("/logout", methods=["DELETE"])
# @jwt_required()
# def logout():
#     jti = get_jwt()["jti"]
#     jwt_blocklist.add(jti)
#     return jsonify({"message": "Successfully logged out"}), 200