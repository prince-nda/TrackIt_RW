from flask import Blueprint, jsonify, request
from App.models import Category
from App.extensions import db

categories_bp = Blueprint('categories', __name__, url_prefix='/api/categories')

@categories_bp.route('', methods=['GET'])
def get_categories():
    try:
        categories = Category.query.all()
        return jsonify([{
            'id': c.id,
            'name': c.name,
            'description': c.description
        } for c in categories]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@categories_bp.route('/<int:category_id>', methods=['GET'])
def get_category(category_id):
    """Get single category by ID"""
    try:
        category = Category.query.get_or_404(category_id)
        return jsonify({
            'id': category.id,
            'name': category.name,
            'description': category.description
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@categories_bp.route('', methods=['POST'])
def create_category():
    """Create new category (admin only)"""
    try:
        data = request.get_json()
        
        if not data or 'name' not in data:
            return jsonify({'error': 'Name is required'}), 400
        
        # Check if category already exists
        existing = Category.query.filter_by(name=data['name']).first()
        if existing:
            return jsonify({'error': 'Category already exists'}), 400
        
        category = Category(
            name=data['name'],
            description=data.get('description', '')
        )
        
        db.session.add(category)
        db.session.commit()
        
        return jsonify({
            'message': 'Category created',
            'category': {
                'id': category.id,
                'name': category.name,
                'description': category.description
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@categories_bp.route('/seed', methods=['POST'])
def seed_categories():
    """Add initial categories (run once)"""
    try:
        categories_data = [
            {'name': 'Pothole', 'description': 'Road damage or pothole issues'},
            {'name': 'Street Light', 'description': 'Broken or malfunctioning street light'},
            {'name': 'Garbage', 'description': 'Illegal dumping or garbage collection issues'},
            {'name': 'Water Leak', 'description': 'Broken pipes or water leakage'},
            {'name': 'Drainage', 'description': 'Blocked or broken drainage'},
            {'name': 'Road Sign', 'description': 'Damaged or missing traffic signs'},
            {'name': 'Public Safety', 'description': 'Safety hazards'},
            {'name': 'Other', 'description': 'Other issues'}
        ]
        
        created = []
        for cat_data in categories_data:
            existing = Category.query.filter_by(name=cat_data['name']).first()
            if not existing:
                category = Category(
                    name=cat_data['name'],
                    description=cat_data['description']
                )
                db.session.add(category)
                created.append(cat_data['name'])
        
        db.session.commit()
        
        return jsonify({
            'message': 'Categories seeded successfully',
            'created': created
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@categories_bp.route('/<int:category_id>', methods=['PUT'])
def update_category(category_id):
    """Update category (admin only)"""
    try:
        category = Category.query.get_or_404(category_id)
        data = request.get_json()
        
        if 'name' in data:
            # Check if new name already exists
            existing = Category.query.filter_by(name=data['name']).first()
            if existing and existing.id != category_id:
                return jsonify({'error': 'Category name already exists'}), 400
            category.name = data['name']
        
        if 'description' in data:
            category.description = data['description']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Category updated',
            'category': {
                'id': category.id,
                'name': category.name,
                'description': category.description
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@categories_bp.route('/<int:category_id>', methods=['DELETE'])
def delete_category(category_id):
    """Delete category (admin only)"""
    try:
        category = Category.query.get_or_404(category_id)
        
        # Check if category has reports
        if category.reports and len(category.reports) > 0:
            return jsonify({'error': 'Cannot delete category with existing reports'}), 400
        
        db.session.delete(category)
        db.session.commit()
        
        return jsonify({'message': 'Category deleted'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500