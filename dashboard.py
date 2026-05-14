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
    
    html = """
    <h1>🎟️ Ticket Zick Dashboard</h1>
    <h2>Configure Ticket Category</h2>
    <form method="POST" action="/update">
        <p>Ticket Category ID: <input type="text" name="ticket_category" value="{}" placeholder="Paste Category ID here"></p>
        <button type="submit">Save</button>
    </form>
    """.format(settings.get('ticket_category', ''))
    
    return html

@app.route("/update", methods=["POST"])
def update():
    c.execute("REPLACE INTO settings (key, value) VALUES (?, ?)", ("ticket_category", request.form.get("ticket_category")))
    conn.commit()
    return redirect("/")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)