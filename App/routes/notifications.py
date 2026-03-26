from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from App.models import Notification
from App.extensions import db

notifications_bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')


@notifications_bp.route('', methods=['GET'])
@jwt_required()
def get_notifications():
    """Get all notifications for current user"""
    try:
        user_id = get_jwt_identity()
        
        # Get query parameters for pagination
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 20, type=int)
        offset = (page - 1) * limit
        unread_only = request.args.get('unread_only', 'false').lower() == 'true'
        
        # Build query
        query = Notification.query.filter_by(user_id=user_id)
        
        if unread_only:
            query = query.filter_by(is_read=False)
        
        # Get total count
        total = query.count()
        
        # Get paginated results
        notifications = query.order_by(Notification.created_at.desc()).offset(offset).limit(limit).all()
        
        result = []
        for n in notifications:
            result.append({
                'id': n.id,
                'type': n.type,
                'message': n.message,
                'channel': n.channel,
                'is_read': n.is_read,
                'report_id': n.report_id,
                'created_at': n.created_at.isoformat() if n.created_at else None
            })
        
        return jsonify({
            'success': True,
            'total': total,
            'page': page,
            'limit': limit,
            'pages': (total + limit - 1) // limit,
            'notifications': result
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@notifications_bp.route('/unread-count', methods=['GET'])
@jwt_required()
def get_unread_count():
    """Get count of unread notifications"""
    try:
        user_id = get_jwt_identity()
        count = Notification.query.filter_by(user_id=user_id, is_read=False).count()
        
        return jsonify({
            'success': True,
            'unread_count': count
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@notifications_bp.route('/<int:notification_id>/read', methods=['PUT'])
@jwt_required()
def mark_as_read(notification_id):
    """Mark a single notification as read"""
    try:
        user_id = get_jwt_identity()
        notification = Notification.query.get_or_404(notification_id)
        
        # Check if notification belongs to current user
        if notification.user_id != int(user_id):
            return jsonify({'success': False, 'error': 'Unauthorized'}), 403
        
        notification.is_read = True
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Notification marked as read'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@notifications_bp.route('/read-all', methods=['PUT'])
@jwt_required()
def mark_all_as_read():
    """Mark all notifications as read"""
    try:
        user_id = get_jwt_identity()
        Notification.query.filter_by(user_id=user_id, is_read=False).update({'is_read': True})
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'All notifications marked as read'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500