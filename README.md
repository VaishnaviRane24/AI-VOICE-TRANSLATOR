# AI Voice Translator (Speech-to-Speech)

An AI-based Voice Translator that converts spoken audio from one language to another.
The system records or uploads audio, transcribes it using OpenAI Whisper, translates the text, and generates translated speech output.

This project is designed to work reliably across different laptops and Chrome browsers.

---
# Features

. 🎤 Record voice directly from browser (Chrome supported)

. 📂 Upload audio files (recommended for demos)

. 📝 Speech-to-Text using Whisper

. 🌍 Multi-language translation

. 🔊 Text-to-Speech using gTTS

. 🎧 Downloadable translated audio

. 💻 Works on multiple laptops without browser issues

---
# Tech Stack
**Frontend**

HTML

CSS

JavaScript

MediaRecorder API (with Chrome fallback handling)

Backend

Python (Flask)

Whisper (Speech-to-Text)

Argos Translate (Text Translation)

gTTS (Text-to-Speech)

FFmpeg

# Project Structure
AI-Voice-Translator/
│
├── backend.py
├── requirements.txt
├── temp_uploads/
├── temp_outputs/
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
└── README.md

# Installation & Setup
1️⃣ Clone the Repository
git clone <repo-url>
cd AI-Voice-Translator

2️⃣ Create Virtual Environment (Recommended)
python -m venv venv


Activate:

Windows

venv\Scripts\activate


Mac/Linux

source venv/bin/activate

3️⃣ Install Dependencies
pip install -r requirements.txt

4️⃣ Install FFmpeg (Required)

Check:

ffmpeg -version


If not installed:

Download FFmpeg static build

Add ffmpeg/bin to System PATH

Restart system

5️⃣ Run Backend
python backend.py


Backend will start at:

http://localhost:5000


Health check:

http://localhost:5000/health

6️⃣ Run Frontend

Open index.html using:

Chrome browser (latest)

Allow microphone access when prompted

🌐 Supported Audio Formats

.webm

.ogg

.wav

.mp3

The backend automatically detects and handles the format.

🌍 Supported Languages

English

Hindi

French

Spanish

German

Italian

Portuguese

Arabic

Russian

Chinese

🎯 How to Use
Option 1: Record Audio

Select target language

Click Record

Speak clearly (≤ 30 seconds)

Click Stop

View translated text and play audio

Option 2: Upload Audio (Recommended)

Upload an audio file

Select target language

Click Translate

Play or download translated audio
