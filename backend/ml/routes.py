import os
import traceback
import json
from datetime import datetime
from flask_cors import cross_origin
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from transformers import AutoModelForSequenceClassification, AutoTokenizer
import requests
from urllib.parse import urlparse

ml_bp = Blueprint('ml', __name__)

def load_available_models():
    """Load available models from database"""
    try:
        db = current_app.extensions['sqlalchemy']
        from models.aimodels import AIModel
        models = AIModel.query.all()
        return [model.huggingface_url for model in models]
    except Exception as e:
        print(f"Error loading models: {e}")
        return [
            "mrizkywidodo/distilbert-base-uncased-rizkywidodo",
            "mrizkywidodo/bert-base-rizkywidodo", 
            "mrizkywidodo/roberta-base-rizkywidodo"
        ]

# ✅ ADD THESE FOR ADMIN COMPATIBILITY
def get_available_models():
    """Get available models (for admin system)"""
    return load_available_models()

def add_model(model_name):
    """Add model to database (for admin system)"""
    try:
        db = current_app.extensions['sqlalchemy']
        from models.aimodels import AIModel
        
        # Check if exists
        if AIModel.query.filter_by(huggingface_url=model_name).first():
            return False
        
        # Test model
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModelForSequenceClassification.from_pretrained(model_name)
        
        # Add to DB
        new_model = AIModel(
            name=model_name.split('/')[-1],
            huggingface_url=model_name,
            uploaded_by="admin"
        )
        
        db.session.add(new_model)
        db.session.commit()
        return True
        
    except Exception as e:
        print(f"Error adding model: {e}")
        return False

def remove_model(model_name):
    """Remove model from database (for admin system)"""
    try:
        db = current_app.extensions['sqlalchemy']
        from models.aimodels import AIModel
        
        model_to_delete = AIModel.query.filter_by(huggingface_url=model_name).first()
        if not model_to_delete:
            return False
        
        db.session.delete(model_to_delete)
        db.session.commit()
        return True
        
    except Exception as e:
        print(f"Error removing model: {e}")
        return False

def map_prediction_to_research_labels(prediction):
    """Map any prediction to research categories"""
    # Handle both string and numeric predictions
    label_mapping = {
        "LABEL_0": "Komen", "LABEL_1": "NFR", "LABEL_2": "FIR",
        "0": "Komen", "1": "NFR", "2": "FIR",
        0: "Komen", 1: "NFR", 2: "FIR"
    }
    
    # If already correct, keep it
    if prediction in ["NFR", "FIR", "Komen"]:
        return prediction
    
    # Map generic labels to research categories
    return label_mapping.get(prediction, "Komen")  # Default to Komen

def get_issue_data(issue_url, token=None):
    """Extract comments from GitHub issue URL"""
    try:
        print(f"🔍 Extracting from: {issue_url}")
        
        # Parse URL
        parsed_url = urlparse(issue_url)
        path = parsed_url.path.strip('/').split('/')
        
        if len(path) < 4 or path[-2] != 'issues':
            return None, [], None
        
        owner, repo, issue_number = path[-4], path[-3], path[-1]
        
        # API URLs
        api_url = f"https://api.github.com/repos/{owner}/{repo}/issues/{issue_number}"
        comments_url = f"{api_url}/comments"
        
        # Headers
        headers = {'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'Issue-Classifier'}
        if token and token.startswith('ghp_'):
            headers['Authorization'] = f'token {token}'
        
        # Get issue
        response = requests.get(api_url, headers=headers)
        if response.status_code == 401 and token:
            headers.pop('Authorization', None)
            response = requests.get(api_url, headers=headers)
        
        if response.status_code != 200:
            return None, [], issue_number
        
        issue_data = response.json()
        issue_title = issue_data.get('title', 'No Title')
        issue_body = issue_data.get('body', '')
        
        # Get comments
        comments_response = requests.get(comments_url, headers=headers)
        if comments_response.status_code == 401 and 'Authorization' in headers:
            headers.pop('Authorization', None)
            comments_response = requests.get(comments_url, headers=headers)
        
        comments_data = []
        
        # Add issue body as first comment
        if issue_body and issue_body.strip():
            comments_data.append({
                'author': issue_data.get('user', {}).get('login', 'Unknown'),
                'text': issue_body.strip()
            })
        
        # Add comments
        if comments_response.status_code == 200:
            for comment in comments_response.json():
                comment_text = comment.get('body', '').strip()
                if comment_text:
                    comments_data.append({
                        'author': comment.get('user', {}).get('login', 'Unknown'),
                        'text': comment_text
                    })
        
        print(f"📊 Found {len(comments_data)} comments")
        return issue_title, comments_data, issue_number
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return None, [], None

@ml_bp.route("/available-models", methods=["GET"])
@cross_origin(origins=["https://sturdy-space-enigma-x54x9jrq74wx26jwv-8080.app.github.dev"], supports_credentials=True)
def get_available_models_endpoint():
    """Get list of available models"""
    try:
        models = load_available_models()
        return jsonify(models)
    except Exception as e:
        print(f"Error: {e}")
        return jsonify([]), 500

@ml_bp.route("/predict", methods=["POST"])
@cross_origin(origins=["https://sturdy-space-enigma-x54x9jrq74wx26jwv-8080.app.github.dev"], supports_credentials=True)
def predict():
    try:
        # Get request data
        data = request.get_json() if request.is_json else request.form
        model_name = data.get("model_name") or data.get("model") or data.get("modelName")
        issue_url = data.get("issue_url") or data.get("github_url") or data.get("issueUrl")
        
        if not issue_url or not model_name:
            return jsonify({"error": "issue_url and model_name required"}), 400
        
        print(f"🤖 Using model: {model_name}")
        
        # Get issue data
        github_token = os.getenv('GH_PAT') or os.getenv('GITHUB_TOKEN')
        issue_title, comments_data, issue_number = get_issue_data(issue_url, github_token)
        
        if not comments_data:
            return jsonify({"error": "No comments found or invalid URL"}), 400
        
        # Load model
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModelForSequenceClassification.from_pretrained(model_name)
        
        # Process each comment
        result = []
        for comment_data in comments_data:
            # Tokenize and predict
            inputs = tokenizer(comment_data["text"], return_tensors="pt", truncation=True, padding=True, max_length=512)
            outputs = model(**inputs)
            
            # Get prediction and confidence
            predictions = outputs.logits.argmax(dim=-1)
            confidence_scores = outputs.logits.softmax(dim=-1)
            confidence = float(confidence_scores.max().item())
            
            # Get raw prediction
            id2label = getattr(model.config, 'id2label', {0: "0", 1: "1", 2: "2"})
            raw_prediction = id2label.get(predictions.cpu().numpy()[0], "0")
            
            # ✅ MAP TO RESEARCH CATEGORIES
            final_prediction = map_prediction_to_research_labels(raw_prediction)
            
            result.append({
                "author": comment_data["author"],
                "comment": comment_data["text"],
                "prediction": final_prediction,  # ✅ Now returns NFR/FIR/Komen
                "confidence": round(confidence, 3),  # ✅ Keep as decimal (0.0-1.0)
                "issue_number": issue_number
            })
        
        print(f"✅ Processed {len(result)} comments")
        
        return jsonify({
            "result": result,
            "issue_title": issue_title,
            "issue_number": issue_number,
            "total_comments": len(result)
        })
        
    except Exception as e:
        print(f"❌ Error: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@ml_bp.route("/save-history", methods=["POST"])
@cross_origin(origins=["https://sturdy-space-enigma-x54x9jrq74wx26jwv-8080.app.github.dev"], supports_credentials=True)
@jwt_required()
def save_history():
    try:
        db = current_app.extensions['sqlalchemy']
        from models.classification_history import ClassificationHistory
        
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Convert result to JSON string for database
        results_json = data.get("result_json")
        if isinstance(results_json, (dict, list)):
            results_json = json.dumps(results_json, ensure_ascii=False)
        
        history = ClassificationHistory(
            user_id=user_id,
            model_name=data.get("model_name"),
            model_type='system',
            source_type=data.get("source_type", 'github'),
            issue_url=data.get("issue_url"),
            issue_title=data.get("issue_title"),
            issue_number=data.get("issue_number"),
            result_count=len(json.loads(results_json)) if isinstance(results_json, str) else len(results_json),
            results_json=results_json,
            status='completed'
        )

        db.session.add(history)
        db.session.commit()

        return jsonify({"message": "History saved", "history_id": history.id})

    except Exception as e:
        print(f"Error saving history: {e}")
        return jsonify({"error": str(e)}), 500

@ml_bp.route("/my-history", methods=["GET"])
@cross_origin(origins=["https://sturdy-space-enigma-x54x9jrq74wx26jwv-8080.app.github.dev"], supports_credentials=True)
@jwt_required()
def get_my_history():
    try:
        db = current_app.extensions['sqlalchemy']
        from models.classification_history import ClassificationHistory
        
        user_id = get_jwt_identity()
        histories = ClassificationHistory.query.filter_by(user_id=user_id).order_by(
            ClassificationHistory.timestamp.desc()
        ).all()

        result = []
        for h in histories:
            try:
                result_data = json.loads(h.results_json) if isinstance(h.results_json, str) else h.results_json
                history_dict = h.to_dict()
                history_dict['results'] = result_data
                result.append(history_dict)
            except json.JSONDecodeError:
                history_dict = h.to_dict()
                history_dict['results'] = []
                result.append(history_dict)

        return jsonify({"histories": result, "total": len(result)})

    except Exception as e:
        print(f"Error getting history: {e}")
        return jsonify({"error": str(e)}), 500