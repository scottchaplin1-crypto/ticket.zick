from flask import Flask, request, redirect
import os

app = Flask(__name__)

@app.route("/")
def home():
    return """
    <h1>🎟️ Ticket Zick Dashboard</h1>
    <h2>Basic Dashboard</h2>
    <p>Dashboard is running!</p>
    <p><a href="/settings">Go to Settings</a></p>
    """

@app.route("/settings")
def settings():
    return """
    <h1>Settings</h1>
    <p>Full dashboard coming soon...</p>
    <p>Current Status: Working</p>
    """

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)