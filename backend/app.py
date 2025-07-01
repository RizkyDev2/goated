# app.py

from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
import os

# Import blueprints
from auth import auth_bp
from models import db
from ml.routes import ml_bp
from admin.routes import admin_bp
from history.routes import history_bp  # Add this import

# Load environment variables
load_dotenv()

def create_app():
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-here')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///db.sqlite3')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'your-jwt-secret-key')
    
    # Initialize extensions
    db.init_app(app)
    jwt = JWTManager(app)
    
    # CORS configuration
    CORS(app, supports_credentials=True, origins=[
    "http://localhost:3000",
    "http://127.0.0.1:3000", 
    "https://sturdy-space-enigma-x54x9jrq74wx26jwv-8080.app.github.dev",
    "https://sturdy-space-enigma-x54x9jrq74wx26jwv-5000.app.github.dev"  # Add backend domain too
])
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(ml_bp, url_prefix='/api/ml')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(history_bp, url_prefix='/api')  
    
    # Create tables
    with app.app_context():
        db.create_all()
        print("✅ Database tables created successfully")
    
    @app.route('/')
    def index():
        return {
            "message": "GitHub Issue Classifier API",
            "version": "1.0.0",
            "endpoints": {
                "auth": "/api/auth",
                "ml": "/api/ml", 
                "admin": "/api/admin",
                "history": "/api/history"  # Add this line
            }
        }
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)