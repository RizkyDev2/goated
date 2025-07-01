# models/classification_history.py

from models import db
from datetime import datetime
import json

class ClassificationHistory(db.Model):
    __tablename__ = 'classification_history'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)  # Optional for guest users
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Model Information
    model_name = db.Column(db.String(255), nullable=False)
    model_type = db.Column(db.String(50), nullable=False)  # 'system' or 'custom'
    
    # Source Information
    source_type = db.Column(db.String(50), default='github', nullable=False)
    issue_url = db.Column(db.Text, nullable=False)
    issue_title = db.Column(db.Text, nullable=True)
    issue_number = db.Column(db.String(50), nullable=True)
    
    # Results
    result_count = db.Column(db.Integer, nullable=False)
    results_json = db.Column(db.Text, nullable=False)  # JSON string of classification results
    
    # Status
    status = db.Column(db.String(50), default='completed', nullable=False)  # completed, failed, partial
    
    # Relationships
    user = db.relationship('User', backref=db.backref('classification_history', lazy=True))
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
    
    def to_dict(self):
        return {
        'id': self.id,
        'user_id': self.user_id,
        'timestamp': self.timestamp.isoformat() if self.timestamp else None,
        'model_name': self.model_name,
        'model_type': self.model_type,
        'source_type': self.source_type,
        'issue_url': self.issue_url,
        'issue_title': self.issue_title,
        'issue_number': self.issue_number,
        'result_count': self.result_count,
        'results_json': self.results_json,  # ← ADD THIS LINE
        'results': json.loads(self.results_json) if self.results_json else [],
        'status': self.status,
        'total_comments': self.result_count,
        'processed_comments': self.result_count
    }
    
    @classmethod
    def create_from_classification(cls, model_name, model_type, issue_url, issue_title, 
                                 classification_results, user_id=None):
        """
        Create a new history entry from classification results
        """
        # Extract issue number from URL
        issue_number = None
        if '/issues/' in issue_url:
            try:
                issue_number = issue_url.split('/issues/')[-1].split('/')[0]
            except:
                pass
        
        
        
        return cls(
            user_id=user_id,
            model_name=model_name,
            model_type=model_type,
            issue_url=issue_url,
            issue_title=issue_title,
            issue_number=issue_number,
            result_count=len(classification_results),
            results_json=json.dumps(classification_results, ensure_ascii=False),
        )