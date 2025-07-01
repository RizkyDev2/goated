# models/__init__.py

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# Import all models here
from .user import User
from .classification_history import ClassificationHistory
from .aimodels import AIModel  