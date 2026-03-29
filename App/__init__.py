import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
load_dotenv()
from .config import Config
from .extensions import db, bcrypt, jwt
from App.utils.cloudinary import init_cloudinary
from .extensions import db, bcrypt, jwt, mail, migrate

# Import all blueprints from routes packagesh
from App.routes import categories_bp, reports_bp, notifications_bp


def create_app():
    # Serve the simple frontend directly from Flask in dev.
    # This avoids CORS issues when opening index.html via file:// or different ports.
    frontend_dir = os.path.abspath(os.path.join(os.path.dirname(_file_), '..', 'frontend'))
    app = Flask(_name_, static_folder=None)
    app.config.from_object(Config)

    # Dev-friendly CORS for API routes (Authorization header for JWT).
    # If you later deploy, restrict origins to your real domain(s).
    CORS(
        app,
        resources={r"/api/": {"origins": ""}},
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
    )

    @app.get("/")
    def serve_frontend_index():
        return send_from_directory(frontend_dir, "index.html")

    @app.get("/script.js")
    def serve_frontend_script():
        return send_from_directory(frontend_dir, "script.js")

    #initialize Cloudinary
    init_cloudinary(app)

    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)
    migrate.init_app(app, db)

    app.register_blueprint(categories_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(notifications_bp)

    # Register blueprints
    from .auth.routes import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    
    from App.commands import create_authority_command
    app.cli.add_command(create_authority_command)

    return app