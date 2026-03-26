from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
load_dotenv()
from .config import Config
from .extensions import db, bcrypt, jwt
from App.utils.cloudinary import init_cloudinary

# Import all blueprints from routes package
from App.routes import categories_bp, reports_bp, notifications_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # UPDATED CORS CONFIGURATION
    CORS(app, 
         origins=["http://127.0.0.1:5500", "http://localhost:5500"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         allow_headers=["Content-Type", "Authorization"],
         supports_credentials=True)

    #initialize Cloudinary
    init_cloudinary(app)

    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)

    app.register_blueprint(categories_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(notifications_bp)

    # Register blueprints
    from .auth.routes import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    
    from App.commands import create_authority_command
    app.cli.add_command(create_authority_command)

    return app
