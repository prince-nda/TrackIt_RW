import click
from flask.cli import with_appcontext
from App.extensions import db, bcrypt
from App.models import User

@click.command("create-authority")
@with_appcontext
def create_authority_command():
    click.echo("--- Create Authority Account ---")
    
    username = click.prompt("Enter username")
    email = click.prompt("Enter email")
    phone_number = click.prompt("Enter phone number")
    password = click.prompt("Enter password", hide_input=True)

    if User.query.filter_by(email=email).first():
        click.echo(f"Error: {email} is already registered.")
        return

    hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")

    authority = User(
        username=username,
        email=email,
        password=hashed_password,
        phone_number=phone_number,
        role="Admin"
    )

    db.session.add(authority)
    db.session.commit()

    click.echo(f"Authority account created for {email}")