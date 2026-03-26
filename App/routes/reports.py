from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from App.models import Report, Location, Category, User, StatusHistory, Notification, Comment
from App.extensions import db
from App.utils.validators import validate_report_data
from App.utils.cloudinary import upload_photo
from App.utils.decorators import role_required
from datetime import datetime

reports_bp = Blueprint('reports', __name__, url_prefix='/api/reports')


@reports_bp.route('', methods=['GET'])
def get_reports():
    """Get all reports with optional filters"""
    try:
        # Get query parameters
        status = request.args.get('status')
        category_id = request.args.get('category_id', type=int)
        district = request.args.get('district')
        limit = request.args.get('limit', 50, type=int)
        page = request.args.get('page', 1, type=int)
        offset = (page - 1) * limit
        
        # Build query
        query = Report.query
        
        if status:
            query = query.filter_by(status=status)
        if category_id:
            query = query.filter_by(category_id=category_id)
        if district:
            query = query.join(Location).filter(Location.district == district)
        
        # Get total count
        total = query.count()
        
        # Get paginated results
        reports = query.order_by(Report.created_at.desc()).offset(offset).limit(limit).all()
        
        # Format response
        result = []
        for report in reports:
            location = Location.query.get(report.location_id)
            category = Category.query.get(report.category_id)
            user = User.query.get(report.user_id) if not report.is_anonymous else None
            
            result.append({
                'id': report.id,
                'title': report.title,
                'description': report.description,
                'status': report.status,
                'is_anonymous': report.is_anonymous,
                'photo_url': report.photo_url,
                'created_at': report.created_at.isoformat() if report.created_at else None,
                'category': {
                    'id': category.id,
                    'name': category.name
                } if category else None,
                'location': {
                    'latitude': float(location.latitude) if location else None,
                    'longitude': float(location.longitude) if location else None,
                    'address': location.address if location else None,
                    'district': location.district if location else None,
                    'sector': location.sector if location else None,
                    'cell': location.cell if location else None,
                    'village': location.village if location else None
                } if location else None,
                'user': {
                    'username': user.username
                } if user and not report.is_anonymous else None
            })
        
        return jsonify({
            'success': True,
            'total': total,
            'page': page,
            'limit': limit,
            'pages': (total + limit - 1) // limit,
            'reports': result
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@reports_bp.route('/<int:report_id>', methods=['GET'])
def get_report(report_id):
    """Get single report with full details (location, status history, comments)"""
    try:
        report = Report.query.get_or_404(report_id)
        
        location = Location.query.get(report.location_id)
        category = Category.query.get(report.category_id)
        user = User.query.get(report.user_id) if not report.is_anonymous else None
        assigned_admin = User.query.get(report.assigned_admin_id) if report.assigned_admin_id else None
        
        # Get status history
        history = StatusHistory.query.filter_by(report_id=report_id).order_by(StatusHistory.changed_at.desc()).all()
        
        # Get comments
        comments = Comment.query.filter_by(report_id=report_id).order_by(Comment.created_at.asc()).all()
        comment_list = []
        for comment in comments:
            comment_user = User.query.get(comment.user_id)
            comment_list.append({
                'id': comment.id,
                'content': comment.content,
                'is_official': comment.is_official,
                'created_at': comment.created_at.isoformat() if comment.created_at else None,
                'user': {
                    'id': comment_user.id,
                    'username': comment_user.username,
                    'role': comment_user.role
                }
            })
        
        response = {
            'id': report.id,
            'title': report.title,
            'description': report.description,
            'status': report.status,
            'is_anonymous': report.is_anonymous,
            'photo_url': report.photo_url,
            'created_at': report.created_at.isoformat() if report.created_at else None,
            'resolved_at': report.resolved_at.isoformat() if report.resolved_at else None,
            'category': {
                'id': category.id,
                'name': category.name,
                'description': category.description
            } if category else None,
            'location': {
                'latitude': float(location.latitude) if location else None,
                'longitude': float(location.longitude) if location else None,
                'address': location.address if location else None,
                'district': location.district if location else None,
                'sector': location.sector if location else None,
                'cell': location.cell if location else None,
                'village': location.village if location else None
            } if location else None,
            'user': {
                'id': user.id,
                'username': user.username,
                'phone_number': user.phone_number,
                'email': user.email
            } if user and not report.is_anonymous else None,
            'assigned_admin': {
                'id': assigned_admin.id,
                'username': assigned_admin.username
            } if assigned_admin else None,
            'status_history': [{
                'id': h.id,
                'from_status': h.from_status,
                'to_status': h.to_status,
                'note': h.note,
                'changed_at': h.changed_at.isoformat() if h.changed_at else None,
                'changed_by': User.query.get(h.changed_by).username if User.query.get(h.changed_by) else None
            } for h in history],
            'comments': comment_list
        }
        
        return jsonify({'success': True, 'report': response}), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@reports_bp.route('', methods=['POST'])
@jwt_required()
def create_report():
    """Create a new report with location and optional photo"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Validate input
        is_valid, error = validate_report_data(data)
        if not is_valid:
            return jsonify({'success': False, 'error': error}), 400
        
        # Create location
        location = Location(
            latitude=data['latitude'],
            longitude=data['longitude'],
            address=data.get('address'),
            district=data.get('district'),
            sector=data.get('sector'),
            cell=data.get('cell'),
            village=data.get('village')
        )
        db.session.add(location)
        db.session.flush()
        
        # Handle photo upload if exists
        photo_url = None
        if data.get('photo'):
            result = upload_photo(data['photo'])
            if result['success']:
                photo_url = result['url']
        
        # Create report
        report = Report(
            user_id=int(current_user_id),
            title=data['title'],
            description=data['description'],
            category_id=data['category_id'],
            location_id=location.id,
            photo_url=photo_url,
            is_anonymous=data.get('is_anonymous', False),
            status='Pending'
        )
        db.session.add(report)
        db.session.flush()
        
        # Create initial status history
        history = StatusHistory(
            report_id=report.id,
            changed_by=int(current_user_id),
            from_status='Pending',
            to_status='Pending',
            note='Report created'
        )
        db.session.add(history)
        
        # Create notifications for admins
        admins = User.query.filter_by(role='Admin').all()
        for admin in admins:
            notification = Notification(
                user_id=admin.id,
                report_id=report.id,
                type='Report Created',
                message=f'New report: {report.title}',
                channel='Push'
            )
            db.session.add(notification)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Report created successfully',
            'report_id': report.id,
            'photo_url': photo_url
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@reports_bp.route('/<int:report_id>/status', methods=['PUT'])
@jwt_required()
@role_required('Admin')
def update_report_status(report_id):
    """Update report status (Admin only)"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        if 'status' not in data:
            return jsonify({'success': False, 'error': 'Status is required'}), 400
        
        report = Report.query.get_or_404(report_id)
        old_status = report.status
        new_status = data['status']
        note = data.get('note', '')
        
        # Update report
        report.status = new_status
        report.assigned_admin_id = int(current_user_id)
        
        # If resolved, set resolved_at
        if new_status == 'Resolved':
            report.resolved_at = datetime.utcnow()
        
        # Create status history
        history = StatusHistory(
            report_id=report_id,
            changed_by=int(current_user_id),
            from_status=old_status,
            to_status=new_status,
            note=note
        )
        db.session.add(history)
        
        # Create notification for report owner
        if not report.is_anonymous:
            notification = Notification(
                user_id=report.user_id,
                report_id=report_id,
                type='Report Updated',
                message=f'Your report "{report.title}" status changed to {new_status}',
                channel='Push'
            )
            db.session.add(notification)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Status updated successfully',
            'old_status': old_status,
            'new_status': new_status
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


# ============ COMMENTS ENDPOINTS ============

@reports_bp.route('/<int:report_id>/comments', methods=['GET'])
def get_comments(report_id):
    """Get all comments for a report"""
    try:
        comments = Comment.query.filter_by(report_id=report_id).order_by(Comment.created_at.asc()).all()
        
        result = []
        for comment in comments:
            user = User.query.get(comment.user_id)
            result.append({
                'id': comment.id,
                'content': comment.content,
                'is_official': comment.is_official,
                'created_at': comment.created_at.isoformat() if comment.created_at else None,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'role': user.role
                }
            })
        
        return jsonify({
            'success': True,
            'count': len(result),
            'comments': result
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@reports_bp.route('/<int:report_id>/comments', methods=['POST'])
@jwt_required()
def create_comment(report_id):
    """Create a comment on a report"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or 'content' not in data:
            return jsonify({'success': False, 'error': 'Content is required'}), 400
        
        # Check if report exists
        report = Report.query.get_or_404(report_id)
        
        # Get user
        user = User.query.get(int(current_user_id))
        
        # Check if user is admin (for official comments)
        is_official = user.role == 'Admin'
        
        comment = Comment(
            report_id=report_id,
            user_id=int(current_user_id),
            content=data['content'],
            is_official=is_official
        )
        
        db.session.add(comment)
        db.session.commit()
        
        # Create notification for report owner (if not anonymous and not the commenter)
        if not report.is_anonymous and report.user_id != int(current_user_id):
            notification = Notification(
                user_id=report.user_id,
                report_id=report_id,
                type='Report Updated',
                message=f'New comment on your report "{report.title}": {data["content"][:50]}...',
                channel='Push'
            )
            db.session.add(notification)
            db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Comment added successfully',
            'comment': {
                'id': comment.id,
                'content': comment.content,
                'is_official': comment.is_official,
                'created_at': comment.created_at.isoformat() if comment.created_at else None,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'role': user.role
                }
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@reports_bp.route('/photos/upload', methods=['POST'])
@jwt_required()
def upload_report_photo():
    """Upload a photo to Cloudinary and return its URL"""
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({'success': False, 'error': 'No image data provided'}), 400
        result = upload_photo(data['image'])
        if result['success']:
            return jsonify({'success': True, 'url': result['url']}), 200
        return jsonify({'success': False, 'error': result.get('error', 'Upload failed')}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@reports_bp.route('/comments/<int:comment_id>', methods=['DELETE'])
@jwt_required()
@role_required('Admin')
def delete_comment(comment_id):
    """Delete a comment (Admin only)"""
    try:
        comment = Comment.query.get_or_404(comment_id)
        
        db.session.delete(comment)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Comment deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
