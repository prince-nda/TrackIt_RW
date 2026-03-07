from App import create_app
from App.extensions import db
from App.models import User, Category, Location, Report, Notification, Comment, StatusHistory

app = create_app()

with app.app_context():
    db.create_all()
    print("Database tables created successfully.")

if __name__ == "__main__":
    app.run(debug=True)