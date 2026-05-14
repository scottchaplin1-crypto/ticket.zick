from flask import Flask

app = Flask(__name__)

@app.route("/")
def home():
    return """
    <h1>🎟️ Ticket Zick Dashboard</h1>
    <h2>✅ Dashboard is Working!</h2>
    <p>This is the starting point.</p>
    <p>We'll build the full management system from here.</p>
    """

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)