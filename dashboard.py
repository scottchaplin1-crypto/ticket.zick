from flask import Flask, request, redirect

app = Flask(__name__)

@app.route("/")
def home():
    return """
    <h1>🎟️ Ticket Zick Dashboard</h1>
    <h2>Create New Ticket Panel</h2>
    <form method="POST" action="/create">
        <p>Panel Name: <input type="text" name="name" placeholder="Support / Reports / Appeals" required></p>
        <p>Emoji: <input type="text" name="emoji" value="🎟️" required></p>
        <p>Category ID: <input type="text" name="category_id" placeholder="Right-click category → Copy ID" required></p>
        <button type="submit">Create Panel</button>
    </form>
    <hr>
    <p><strong>Tip:</strong> Go to a channel, use /setup after creating panels here.</p>
    """

@app.route("/create", methods=["POST"])
def create():
    # For now just show success (we'll connect to bot later)
    name = request.form.get("name")
    emoji = request.form.get("emoji")
    category_id = request.form.get("category_id")
    return f"""
    <h1>✅ Panel Created!</h1>
    <p>Name: {emoji} {name}</p>
    <p>Category ID: {category_id}</p>
    <p><a href="/">← Back to Dashboard</a></p>
    """

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)