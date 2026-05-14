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
    <h2>Current Settings</h2>
    <p><b>Ticket Category ID:</b> {settings.get('ticket_category', 'Not Set')}</p>
    <p><b>Log Channel ID:</b> {settings.get('log_channel', 'Not Set')}</p>
    <p><b>Staff Role ID:</b> {settings.get('staff_role', 'Not Set')}</p>
    
    <h2>Update Settings</h2>
    <form method="POST" action="/update">
        Ticket Category ID:<br>
        <input type="text" name="ticket_category" value="{settings.get('ticket_category', '')}"><br><br>
        
        Log Channel ID:<br>
        <input type="text" name="log_channel" value="{settings.get('log_channel', '')}"><br><br>
        
        Staff Role ID:<br>
        <input type="text" name="staff_role" value="{settings.get('staff_role', '')}"><br><br>
        
        <button type="submit">Save Settings</button>
    </form>
    """

@app.route("/update", methods=["POST"])
def update():
    c.execute("REPLACE INTO settings (key, value) VALUES (?, ?)", ("ticket_category", request.form.get("ticket_category")))
    c.execute("REPLACE INTO settings (key, value) VALUES (?, ?)", ("log_channel", request.form.get("log_channel")))
    c.execute("REPLACE INTO settings (key, value) VALUES (?, ?)", ("staff_role", request.form.get("staff_role")))
    conn.commit()
    return redirect("/")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)