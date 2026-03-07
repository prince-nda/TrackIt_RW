from flask import Blueprint, request, jsonify
from App.models import Report, Location, Category, User
from App.extensions import db
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
                'created_at': report.created_at.isoformat() if report.created_at else None,
                'category': {
                    'id': category.id,
                    'name': category.name
                } if category else None,
                'location': {
                    'latitude': location.latitude,
                    'longitude': location.longitude,
                    'address': location.address,
                    'district': location.district
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
    """Get single report by ID"""
    try:
        report = Report.query.get_or_404(report_id)
        
        location = Location.query.get(report.location_id)
        category = Category.query.get(report.category_id)
        user = User.query.get(report.user_id) if not report.is_anonymous else None
        
        return jsonify({
            'success': True,
            'report': {
                'id': report.id,
                'title': report.title,
                'description': report.description,
                'status': report.status,
                'is_anonymous': report.is_anonymous,
                'created_at': report.created_at.isoformat() if report.created_at else None,
                'category': {
                    'id': category.id,
                    'name': category.name
                } if category else None,
                'location': {
                    'latitude': location.latitude,
                    'longitude': location.longitude,
                    'address': location.address,
                    'district': location.district
                } if location else None,
                'user': {
                    'username': user.username
                } if user and not report.is_anonymous else None
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500