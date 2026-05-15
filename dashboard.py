from flask import Flask, request, redirect, render_template_string
import os
import sqlite3

app = Flask(__name__)

conn = sqlite3.connect("config.db", check_same_thread=False)
c = conn.cursor()
c.execute('''CREATE TABLE IF NOT EXISTS panels (
    id INTEGER PRIMARY KEY,
    name TEXT,
    emoji TEXT,
    category_id TEXT
)''')
conn.commit()

@app.route("/")
def home():
    c.execute("SELECT * FROM panels")
    panels = c.fetchall()
    
    html = """
    <h1>🎟️ Ticket Zick Dashboard</h1>
    <h2>Create New Ticket Panel</h2>
    <form method="POST" action="/create">
        <p>Panel Name: <input type="text" name="name" placeholder="Support" required></p>
        <p>Emoji: <input type="text" name="emoji" value="🎟️" required></p>
        <p>Category ID: <input type="text" name="category_id" placeholder="Paste Category ID here" required></p>
        <button type="submit">Create Panel</button>
    </form>
    <hr>
    <h2>Existing Panels</h2>
    """
    for p in panels:
        html += f"<p>{p[2]} {p[1]} → Category: {p[3]}</p>"
    
    return html

@app.route("/create", methods=["POST"])
def create():
    name = request.form.get("name")
    emoji = request.form.get("emoji")
    category_id = request.form.get("category_id")
    
    c.execute("INSERT INTO panels (name, emoji, category_id) VALUES (?, ?, ?)", (name, emoji, category_id))
    conn.commit()
    
    return redirect("/")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)