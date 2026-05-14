from flask import Flask

app = Flask(__name__)

@app.route("/")
def home():
    return """
    <!DOCTYPE html>
    <html>
    <head><title>Ticket Zick Dashboard</title></head>
    <body>
        <h1>🎟️ Ticket Zick Dashboard</h1>
        <h2>✅ Dashboard is Online!</h2>
        <p>Full management panel coming soon...</p>
    </body>
    </html>
    """

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)