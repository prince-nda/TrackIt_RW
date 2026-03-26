from flask import Blueprint, request, jsonify
from App.models import Location
from App.extensions import db

locations_bp = Blueprint('locations', __name__, url_prefix='/api/locations')

@locations_bp.route('', methods=['POST'])
def create_location():
    """Create a new location"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if 'latitude' not in data or 'longitude' not in data:
            return jsonify({'success': False, 'error': 'latitude and longitude are required'}), 400
        
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
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Location created successfully',
            'id': location.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500