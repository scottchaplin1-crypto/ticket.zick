from flask import Flask

app = Flask(__name__)

@app.route("/")
def home():
    return """
    <h1>🎟️ Ticket Zick Dashboard</h1>
    <h2>✅ Success! Dashboard is Working</h2>
    <p>This is a very basic version.</p>
    <p>We'll add the full panel management soon.</p>
    """

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)