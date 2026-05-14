from flask import Flask, request, redirect
import os
import sqlite3

app = Flask(__name__)

conn = sqlite3.connect("config.db", check_same_thread=False)
c = conn.cursor()
c.execute('''CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)''')
conn.commit()

@app.route("/")
def home():
    c.execute("SELECT key, value FROM settings")
    settings = dict(c.fetchall())
    
    return f"""
    <h1>🎟️ Ticket Zick Dashboard</h1>
    <h2>Settings</h2>
    <form method="POST" action="/update">
        <p><b>Ticket Category ID:</b> <input type="text" name="ticket_category" value="{settings.get('ticket_category', '')}" placeholder="e.g. 123456789"></p>
        <button type="submit">Save Settings</button>
    </form>
    <p><a href="/raw">View Raw Settings</a></p>
    """

@app.route("/update", methods=["POST"])
def update():
    c.execute("REPLACE INTO settings (key, value) VALUES (?, ?)", ("ticket_category", request.form.get("ticket_category")))
    conn.commit()
    return redirect("/")

@app.route("/raw")
def raw():
    c.execute("SELECT key, value FROM settings")
    return str(dict(c.fetchall()))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)