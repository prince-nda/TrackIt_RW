from .extensions import db
from datetime import datetime

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    phone_number = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(128), nullable=False)
    role = db.Column(db.Enum('Citizen', 'Admin'), default='Citizen')
    is_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)

class Location(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    address = db.Column(db.String(200), nullable=True)  # Fixed: String not string
    district = db.Column(db.String(100), nullable=True)
    sector = db.Column(db.String(100), nullable=True)
    cell = db.Column(db.String(100), nullable=True)
    village = db.Column(db.String(100), nullable=True)

class Report(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('category.id'), nullable=False)
    location_id = db.Column(db.Integer, db.ForeignKey('location.id'), nullable=False)
    assigned_admin_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    status = db.Column(db.Enum('Pending', 'In Progress', 'Resolved'), default='Pending')
    is_anonymous = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    resolved_at = db.Column(db.DateTime, nullable=True)

    user = db.relationship('User', foreign_keys=[user_id], backref=db.backref('reports', lazy=True))
    category = db.relationship('Category', backref=db.backref('reports', lazy=True))
    location = db.relationship('Location', backref=db.backref('reports', lazy=True))
    assigned_admin = db.relationship('User', foreign_keys=[assigned_admin_id], backref=db.backref('assigned_reports', lazy=True))

class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    report_id = db.Column(db.Integer, db.ForeignKey('report.id'), nullable=False)
    type = db.Column(db.Enum('Report Created', 'Report Updated', 'Report Resolved'), nullable=False)
    message = db.Column(db.String(200), nullable=False)
    channel = db.Column(db.Enum('Email', 'SMS', 'Push'), nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('notifications', lazy=True))
    report = db.relationship('Report', backref=db.backref('notifications', lazy=True))

class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.Integer, db.ForeignKey('report.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)  # Fixed: user-id → user_id
    content = db.Column(db.Text, nullable=False)
    is_official = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('comments', lazy=True))
    report = db.relationship('Report', backref=db.backref('comments', lazy=True))

class StatusHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.Integer, db.ForeignKey('report.id'), nullable=False)
    changed_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    from_status = db.Column(db.Enum('Pending', 'In Progress', 'Resolved'), nullable=False)
    to_status = db.Column(db.Enum('Pending', 'In Progress', 'Resolved'), nullable=False)
    note = db.Column(db.Text, nullable=True)
    changed_at = db.Column(db.DateTime, default=datetime.utcnow)