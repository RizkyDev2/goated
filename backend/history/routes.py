from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_cors import cross_origin
from models import db, ClassificationHistory, User
from sqlalchemy import desc
import traceback

history_bp = Blueprint('history', __name__)

@history_bp.route('/history', methods=['GET'])
@cross_origin()
@jwt_required()
def get_history():
    """
    Get classification history for authenticated user only
    """
    try:
        user_id = get_jwt_identity()
        
        if not user_id:
            return jsonify({"error": "Invalid token or user not found"}), 401
        
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 10, type=int), 100)
        
        # Build query - STRICT user filtering
        query = ClassificationHistory.query.filter_by(user_id=user_id)
        
        # Apply additional filters
        model_name = request.args.get('model_name')
        if model_name:
            query = query.filter_by(model_name=model_name)
        
        model_type = request.args.get('model_type')
        if model_type:
            query = query.filter_by(model_type=model_type)
        
        status = request.args.get('status')
        if status:
            query = query.filter_by(status=status)
        
        # Order by newest first
        query = query.order_by(desc(ClassificationHistory.timestamp))
        
        # Execute pagination
        pagination = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        # Format response
        history_items = [item.to_dict() for item in pagination.items]
        
        response_data = {
            'history': history_items,
            'pagination': {
                'page': page,
                'pages': pagination.pages,
                'per_page': per_page,
                'total': pagination.total,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            },
            'user_id': user_id,
            'filters_applied': {
                'model_name': model_name,
                'model_type': model_type,
                'status': status
            }
        }
        
        return jsonify(response_data), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get history: {str(e)}"}), 500

@history_bp.route('/history/<int:history_id>', methods=['GET'])
@cross_origin()
@jwt_required()
def get_history_detail(history_id):
    try:
        user_id = get_jwt_identity()
        
        if not user_id:
            return jsonify({"error": "Invalid token"}), 401
        
        history_item = ClassificationHistory.query.filter_by(
            id=history_id, 
            user_id=user_id
        ).first()
        
        if not history_item:
            return jsonify({"error": "History item not found"}), 404
        
        return jsonify(history_item.to_dict()), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get history detail: {str(e)}"}), 500

@history_bp.route('/history/<int:history_id>/update', methods=['PUT'])
@cross_origin()
@jwt_required()
def update_predictions(history_id):
    """
    Update predictions in classification history
    """
    try:
        user_id = get_jwt_identity()
        
        if not user_id:
            return jsonify({"error": "Invalid token"}), 401
        
        data = request.get_json()
        
        if not data or 'predictions' not in data:
            return jsonify({"error": "Predictions data required"}), 400
        
        history_item = ClassificationHistory.query.filter_by(
            id=history_id, 
            user_id=user_id
        ).first()
        
        if not history_item:
            return jsonify({"error": "History item not found"}), 404
        
        # Update results_json with new predictions
        history_item.results_json = data['predictions']
        db.session.commit()
        
        return jsonify({
            "message": "Predictions updated successfully",
            "history_id": history_id,
            "updated_predictions": len(data['predictions'])
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to update predictions: {str(e)}"}), 500

@history_bp.route('/history/<int:history_id>', methods=['DELETE'])
@cross_origin()
@jwt_required()
def delete_history_item(history_id):
    try:
        user_id = get_jwt_identity()
        
        if not user_id:
            return jsonify({"error": "Invalid token"}), 401
        
        history_item = ClassificationHistory.query.filter_by(
            id=history_id, 
            user_id=user_id
        ).first()
        
        if not history_item:
            return jsonify({"error": "History item not found or access denied"}), 404
        
        db.session.delete(history_item)
        db.session.commit()
        
        return jsonify({"message": "History item deleted successfully"}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to delete history: {str(e)}"}), 500

@history_bp.route('/history/clear', methods=['DELETE'])
@cross_origin()
@jwt_required()
def clear_history():
    """
    Clear all classification history for current user only
    """
    try:
        user_id = get_jwt_identity()
        
        if not user_id:
            return jsonify({"error": "Invalid token"}), 401
        
        deleted_count = ClassificationHistory.query.filter_by(user_id=user_id).delete()
        db.session.commit()
        
        return jsonify({
            "message": f"Successfully deleted {deleted_count} history items",
            "deleted_count": deleted_count,
            "user_id": user_id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to clear history: {str(e)}"}), 500