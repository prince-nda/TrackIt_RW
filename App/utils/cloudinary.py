import cloudinary
import cloudinary.uploader

def init_cloudinary(app):
    """Initialize Cloudinary"""
    cloudinary.config(
        cloud_name=app.config.get('CLOUDINARY_CLOUD_NAME'),
        api_key=app.config.get('CLOUDINARY_API_KEY'),
        api_secret=app.config.get('CLOUDINARY_API_SECRET')
    )

def upload_photo(image_data, folder='reports'):
    """Upload photo to Cloudinary"""
    try:
        result = cloudinary.uploader.upload(
            image_data,
            folder=folder,
            transformation=[
                {'width': 800, 'height': 600, 'crop': 'limit'},
                {'quality': 'auto'}
            ]
        )
        return {
            'success': True,
            'url': result['secure_url'],
            'public_id': result['public_id']
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }