import re

def validate_report_data(data):
    """Validate report creation data"""
    
    # Required fields
    required = ['category_id', 'title', 'description', 'latitude', 'longitude']
    for field in required:
        if field not in data:
            return False, f"{field} is required"
    
    # Title validation
    if len(data['title'].strip()) < 5:
        return False, "Title must be at least 5 characters"
    if len(data['title']) > 200:
        return False, "Title too long (max 200)"
    
    # Description validation
    if len(data['description'].strip()) < 10:
        return False, "Description must be at least 10 characters"
    
    # Coordinates validation
    try:
        lat = float(data['latitude'])
        lng = float(data['longitude'])
        
        # Basic bounds check
        if lat < -90 or lat > 90:
            return False, "Invalid latitude"
        if lng < -180 or lng > 180:
            return False, "Invalid longitude"
    except:
        return False, "Invalid coordinates"
    
    return True, None