from flask import Flask,jsonify,render_template

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/admin')
def admin():
    return render_template('admin.html')

if __name__ == "__main__":
    # Run the Flask app
    app.run()