import secrets
from datetime import datetime, timedelta
from flask_mail import Message
from App.extensions import mail
from flask import Blueprint, request, jsonify, current_app
from App.extensions import db, bcrypt 
from App.models import User
from App.utils.decorators import role_required

def send_reset_email(email, token):
    """Send password reset email"""
    reset_link = f"http://localhost:3000/reset-password?token={token}"
    
    msg = Message(
        subject="Reset Your Password - TrackIt RW",
        recipients=[email],
        html=f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Password Reset</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f4f4f4; padding: 20px; border-radius: 10px;">
                <h1 style="color: #333;">Reset Your Password</h1>
                <p>You requested to reset your password for your TrackIt RW account.</p>
                <p>Click the button below to reset your password:</p>
                <a href="{reset_link}" 
                   style="display: inline-block; background-color: #4CAF50; color: white; 
                          padding: 12px 24px; text-decoration: none; border-radius: 5px; 
                          margin: 20px 0;">
                    Reset Password
                </a>
                <p>Or copy this link to your browser:</p>
                <p><a href="{reset_link}">{reset_link}</a></p>
                <p>This link expires in <strong>1 hour</strong>.</p>
                <hr>
                <p style="color: #666; font-size: 12px;">
                    If you didn't request this, please ignore this email.
                </p>
            </div>
        </body>
        </html>
        """
    )
    
    mail.send(msg)

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
# data = request.get_json() or {}
# email = data.get("email")

# if not email:
# return jsonify({"message": "Email is required"}), 400

# user = User.query.filter_by(email=email).first()
# if not user:
# return jsonify({"message": "User not found"}), 404

# user.role = "Admin"
# db.session.commit()

# return jsonify({"message": f"{user.email} promoted to Admin"}), 200

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
# jti = get_jwt()["jti"]
# jwt_blocklist.add(jti)
# return jsonify({"message": "Successfully logged out"}), 200

@auth_bp.route('/forgot-password', methods=['POST', 'OPTIONS'])
def forgot_password():
    """Request password reset email"""
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.status_code = 200
        return response
    
    data = request.get_json()
    email = data.get('email')
    
    if not email:
        return jsonify({'error': 'Email is required'}), 400
    
    user = User.query.filter_by(email=email).first()
    
    # For security, always return success even if email doesn't exist
    # This prevents email enumeration attacks
    if not user:
        return jsonify({'message': 'If that email exists, we\'ve sent a reset link'}), 200
    
    # Generate reset token
    token = secrets.token_urlsafe(32)
    user.reset_token = token
    user.reset_token_expiry = datetime.utcnow() + timedelta(hours=1)
    
    db.session.commit()
    
    # Send email
    try:
        send_reset_email(user.email, token)
    except Exception as e:
        print(f"Email error: {e}")
        # Don't reveal email error to user
    
    return jsonify({'message': 'Reset link sent to your email'}), 200

@auth_bp.route('/reset-password', methods=['POST', 'OPTIONS'])
def reset_password():
    """Reset password using token"""
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.status_code = 200
        return response
    
    data = request.get_json()
    token = data.get('token')
    new_password = data.get('new_password')
    
    if not token or not new_password:
        return jsonify({'error': 'Token and new password required'}), 400
    
    # Find user by token
    user = User.query.filter_by(reset_token=token).first()
    
    if not user:
        return jsonify({'error': 'Invalid or expired token'}), 400
    
    # Check if token expired
    if user.reset_token_expiry < datetime.utcnow():
        return jsonify({'error': 'Token has expired'}), 400
    
    # Hash new password
    hashed_password = bcrypt.generate_password_hash(new_password).decode('utf-8')
    user.password = hashed_password
    
    # Clear reset token
    user.reset_token = None
    user.reset_token_expiry = None
    
    db.session.commit()
    
    return jsonify({'message': 'Password reset successful'}), 200
