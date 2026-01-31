import os
import uuid
import sys
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import whisper
import argostranslate.translate
from gtts import gTTS
import warnings
warnings.filterwarnings('ignore')

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Configuration
UPLOAD_DIR = "temp_uploads"
OUTPUT_DIR = "temp_outputs"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Load Whisper model
print("🔧 Loading Whisper model...")
try:
    whisper_model = whisper.load_model("base")
    print("✅ Whisper model loaded successfully")
except Exception as e:
    print(f"⚠️ Error loading model: {e}")
    print("Downloading Whisper model...")
    whisper_model = whisper.load_model("base", download_root="./whisper_models")

# Supported languages
LANGUAGES = {
    'en': {'name': 'English', 'flag': '🇺🇸', 'gtts': 'en'},
    'fr': {'name': 'French', 'flag': '🇫🇷', 'gtts': 'fr'},
    'es': {'name': 'Spanish', 'flag': '🇪🇸', 'gtts': 'es'},
    'de': {'name': 'German', 'flag': '🇩🇪', 'gtts': 'de'},
    'it': {'name': 'Italian', 'flag': '🇮🇹', 'gtts': 'it'},
    'zh': {'name': 'Chinese', 'flag': '🇨🇳', 'gtts': 'zh'},
    'hi': {'name': 'Hindi', 'flag': '🇮🇳', 'gtts': 'hi'},
    'ar': {'name': 'Arabic', 'flag': '🇸🇦', 'gtts': 'ar'},
    'ru': {'name': 'Russian', 'flag': '🇷🇺', 'gtts': 'ru'},
    'pt': {'name': 'Portuguese', 'flag': '🇵🇹', 'gtts': 'pt'},
}

@app.route('/')
def home():
    return jsonify({
        'app': 'AI Voice Translator',
        'version': '1.0',
        'status': 'running',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/health')
def health():
    try:
        from argostranslate.package import get_installed_languages
        installed_langs = get_installed_languages()
        lang_codes = [lang.code for lang in installed_langs]
        argos_status = f"{len(installed_langs)} languages installed"
    except Exception as e:
        argos_status = f"error: {str(e)}"
        lang_codes = []
    
    return jsonify({
        'status': 'healthy',
        'whisper_loaded': whisper_model is not None,
        'argos_translate': argos_status,
        'installed_languages': lang_codes,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/languages')
def get_languages():
    languages_list = []
    for code, info in LANGUAGES.items():
        languages_list.append({
            'code': code,
            'name': info['name'],
            'flag': info['flag']
        })
    return jsonify(languages_list)

@app.route('/translate', methods=['POST'])
def translate_audio():
    try:
        print(f"\n{'='*60}")
        print(f"📨 NEW TRANSLATION REQUEST")
        print(f"{'='*60}")
        
        start_time = datetime.now()

        # Check if audio file is present
        if 'audio' not in request.files:
            print("❌ No audio file in request")
            return jsonify({'error': 'No audio file provided'}), 400

        audio_file = request.files['audio']
        target_lang = request.form.get('lang', 'en')
        
        print(f"📄 File received: {audio_file.filename}")
        print(f"🎯 Target language: {target_lang}")
        print(f"📏 Content type: {audio_file.content_type}")
        print(f"📦 Form data: {dict(request.form)}")

        if target_lang not in LANGUAGES:
            print(f"❌ Unsupported language: {target_lang}")
            return jsonify({'error': 'Unsupported target language'}), 400

        # File size check
        audio_file.seek(0, 2)
        file_size = audio_file.tell()
        audio_file.seek(0)
        
        print(f"📊 File size: {file_size} bytes")

        if file_size == 0:
            print("❌ Empty audio file")
            return jsonify({'error': 'Empty audio file'}), 400

        if file_size > 10 * 1024 * 1024:
            print("❌ File too large")
            return jsonify({'error': 'Audio too large (max 10MB)'}), 400

        # Save input file
        audio_id = str(uuid.uuid4())
        input_filename = f"{audio_id}_input.webm"
        input_path = os.path.join(UPLOAD_DIR, input_filename)
        audio_file.save(input_path)
        print(f"💾 File saved to: {input_path}")

        # Step 1: Transcription
        print("🎤 Starting transcription...")
        try:
            result = whisper_model.transcribe(input_path, fp16=False, language=None)
            print(f"✅ Transcription successful")
        except Exception as e:
            print(f"❌ Transcription error: {e}")
            import traceback
            traceback.print_exc()
            os.remove(input_path)
            return jsonify({'error': f'Transcription failed: {str(e)}'}), 500

        original_text = result["text"].strip()
        detected_lang = result.get("language", "en")
        
        print(f"🌐 Detected language: {detected_lang}")
        print(f"📝 Original text: '{original_text}'")

        if not original_text:
            print("❌ No speech detected")
            os.remove(input_path)
            return jsonify({'error': 'No speech detected'}), 400

        # Step 2: Translation
        print(f"🌐 Translating from {detected_lang} to {target_lang}")
        translated_text = original_text

        if detected_lang != target_lang:
            try:
                # Try direct translation
                print(f"🔄 Attempting direct translation: {detected_lang} → {target_lang}")
                translated_text = argostranslate.translate.translate(
                    original_text, 
                    detected_lang, 
                    target_lang
                )
                print(f"✅ Direct translation successful")
                print(f"📝 Translated text: '{translated_text}'")
            except Exception as e1:
                print(f"⚠️ Direct translation failed: {e1}")
                
                # Try English pivot if needed
                if detected_lang != 'en' and target_lang != 'en':
                    print(f"🔄 Trying English pivot translation...")
                    try:
                        # First to English
                        print(f"  Step 1: {detected_lang} → en")
                        english_text = argostranslate.translate.translate(
                            original_text, 
                            detected_lang, 
                            'en'
                        )
                        print(f"  English text: '{english_text}'")
                        
                        # Then to target
                        print(f"  Step 2: en → {target_lang}")
                        translated_text = argostranslate.translate.translate(
                            english_text, 
                            'en', 
                            target_lang
                        )
                        print(f"✅ English pivot translation successful")
                        print(f"📝 Translated text: '{translated_text}'")
                    except Exception as e2:
                        print(f"❌ English pivot failed: {e2}")
                        translated_text = f"[Translation failed: {detected_lang}→{target_lang}]"
                else:
                    print(f"⚠️ No English pivot needed or available")
                    translated_text = f"[Translation failed: {detected_lang}→{target_lang}]"
        else:
            print("✅ Same language, no translation needed")

        # Step 3: Text-to-Speech
        print(f"🔊 Generating audio in {target_lang}...")
        audio_url = None
        
        try:
            if target_lang in LANGUAGES:
                tts = gTTS(
                    text=translated_text,
                    lang=LANGUAGES[target_lang]['gtts'],
                    slow=False,
                    lang_check=False
                )

                output_filename = f"{audio_id}_translated.mp3"
                output_path = os.path.join(OUTPUT_DIR, output_filename)
                tts.save(output_path)
                audio_url = f"/audio/{output_filename}"
                print(f"✅ Audio saved: {output_path}")
            else:
                print(f"⚠️ gTTS doesn't support {target_lang}")
                
        except Exception as e:
            print(f"⚠️ TTS failed: {e}")
            import traceback
            traceback.print_exc()

        # Cleanup
        try:
            os.remove(input_path)
            print(f"🗑️ Cleaned up input file")
        except:
            pass

        processing_time = (datetime.now() - start_time).total_seconds()
        print(f"⏱️ Total processing time: {processing_time:.2f}s")

        response_data = {
            'success': True,
            'message': 'Translation completed',
            'data': {
                'original_text': original_text,
                'translated_text': translated_text,
                'detected_language': detected_lang,
                'detected_language_name': LANGUAGES.get(detected_lang, {}).get('name', detected_lang),
                'target_language': target_lang,
                'target_language_name': LANGUAGES[target_lang]['name'],
                'audio_url': audio_url,
                'processing_time': f"{processing_time:.2f}s",
                'request_id': audio_id
            }
        }
        
        print(f"✅ Sending response")
        print(f"{'='*60}\n")
        
        return jsonify(response_data)

    except Exception as e:
        print(f"❌ SERVER ERROR: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/audio/<filename>')
def serve_audio(filename):
    """Serve generated audio files"""
    try:
        return send_from_directory(OUTPUT_DIR, filename, as_attachment=False)
    except Exception as e:
        print(f"❌ Audio serve error: {e}")
        return jsonify({'error': f'Audio file not found: {str(e)}'}), 404

@app.route('/test-translation', methods=['GET'])
def test_translation():
    """Test translation without audio"""
    try:
        test_text = "Hello, how are you today?"
        print(f"🧪 Testing translation: '{test_text}' (en → fr)")
        
        # List installed languages
        from argostranslate.package import get_installed_languages
        installed = get_installed_languages()
        print(f"📚 Installed languages: {[lang.code for lang in installed]}")
        
        # Test translation
        translated = argostranslate.translate.translate(test_text, 'en', 'fr')
        print(f"✅ Translation result: '{translated}'")
        
        return jsonify({
            'success': True,
            'original': test_text,
            'translated': translated,
            'from': 'en',
            'to': 'fr'
        })
    except Exception as e:
        print(f"❌ Test translation error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/debug-whisper', methods=['POST'])
def debug_whisper():
    """Debug endpoint to test whisper directly"""
    try:
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file'}), 400
            
        audio_file = request.files['audio']
        audio_id = str(uuid.uuid4())
        input_path = os.path.join(UPLOAD_DIR, f"{audio_id}_debug.webm")
        audio_file.save(input_path)
        
        print(f"🔍 Debug whisper on file: {input_path}")
        result = whisper_model.transcribe(input_path, fp16=False, language=None)
        
        os.remove(input_path)
        
        return jsonify({
            'success': True,
            'text': result['text'],
            'language': result.get('language', 'unknown'),
            'segments': len(result.get('segments', []))
        })
        
    except Exception as e:
        print(f"Debug whisper error: {e}")
        return jsonify({'error': str(e)}), 500

# Clean up old files
def clean_old_files():
    import time
    import glob
    
    try:
        current_time = time.time()
        for dir_path in [UPLOAD_DIR, OUTPUT_DIR]:
            for file_pattern in ['*.mp3', '*.wav', '*.webm', '*.ogg']:
                for filepath in glob.glob(os.path.join(dir_path, file_pattern)):
                    try:
                        if os.path.getmtime(filepath) < current_time - 3600:  # 1 hour
                            os.remove(filepath)
                    except:
                        pass
    except Exception as e:
        print(f"⚠️ Cleanup error: {e}")

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚀 AI VOICE TRANSLATOR BACKEND")
    print("="*60)
    print(f"Python: {sys.version.split()[0]}")
    print(f"Whisper model: base")
    print("="*60)
    
    # Clean old files on startup
    clean_old_files()
    
    print("\n✅ BACKEND READY!")
    print(f"🌐 Server: http://localhost:5000")
    print(f"🔗 Health: http://localhost:5000/health")
    print(f"🧪 Test: http://localhost:5000/test-translation")
    print(f"📚 Languages: {', '.join(LANGUAGES.keys())}")
    print("\n" + "="*60)
    
    # Run with debug for more info
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)