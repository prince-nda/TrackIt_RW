from flask import Flask
from dotenv import load_dotenv
load_dotenv()
from .config import Config
from .extensions import db, bcrypt, jwt

from App.routes import categories_bp, reports_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)

    app.register_blueprint(categories_bp)
    app.register_blueprint(reports_bp)

    # Register blueprints
    from .auth.routes import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    
    return app

