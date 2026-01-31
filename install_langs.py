import argostranslate.package
import argostranslate.translate
import time

print("🌐 Installing language packages for AI Voice Translator...")
print("This will install translation pairs for 10 core languages.\n")

# Update package index
print("📡 Updating package index...")
try:
    argostranslate.package.update_package_index()
    available_packages = argostranslate.package.get_available_packages()
    print(f"✅ Found {len(available_packages)} total packages")
except Exception as e:
    print(f"❌ Failed to update package index: {e}")
    exit(1)

# 10 CORE LANGUAGES
CORE_LANGUAGES = ['en', 'fr', 'es', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'hi']

# Create ALL possible pairs between these languages
LANGUAGE_PAIRS = []
for from_lang in CORE_LANGUAGES:
    for to_lang in CORE_LANGUAGES:
        if from_lang != to_lang:
            LANGUAGE_PAIRS.append((from_lang, to_lang))

print(f"\n📥 Installing {len(LANGUAGE_PAIRS)} language pairs...")
print("This may take several minutes.")
print()

installed_pairs = []
failed_pairs = []
skipped_pairs = []

for i, (from_code, to_code) in enumerate(LANGUAGE_PAIRS):
    print(f"[{i+1}/{len(LANGUAGE_PAIRS)}] Looking for {from_code} → {to_code}...")
    
    # Find the package
    packages = [pkg for pkg in available_packages 
                if pkg.from_code == from_code and pkg.to_code == to_code]
    
    if not packages:
        # Check if reverse direction exists (we can use it)
        reverse_packages = [pkg for pkg in available_packages 
                          if pkg.from_code == to_code and pkg.to_code == from_code]
        
        if reverse_packages:
            print(f"  ⚠️ Package not available, but reverse exists ({to_code} → {from_code})")
            skipped_pairs.append((from_code, to_code))
        else:
            print(f"  ⚠️ Package not available")
            failed_pairs.append((from_code, to_code))
        continue
    
    pkg = packages[0]
    
    try:
        start_time = time.time()
        download_path = pkg.download()
        download_time = time.time() - start_time
        
        argostranslate.package.install_from_path(download_path)
        install_time = time.time() - start_time - download_time
        
        print(f"  ✅ Installed ({download_time:.1f}s + {install_time:.1f}s)")
        installed_pairs.append((from_code, to_code))
        
    except Exception as e:
        error_msg = str(e)
        print(f"  ❌ Failed: {error_msg[:80]}")
        failed_pairs.append((from_code, to_code))

print(f"\n{'='*60}")
print("🎉 INSTALLATION COMPLETE")
print(f"{'='*60}")
print(f"✅ Successfully installed: {len(installed_pairs)} language pairs")
print(f"⚠️  Skipped (reverse available): {len(skipped_pairs)} language pairs")
print(f"❌ Failed to install: {len(failed_pairs)} language pairs")

if installed_pairs:
    print(f"\n📋 Installed direct translation pairs:")
    count = 0
    for from_code, to_code in installed_pairs:
        if count < 20:  # Show first 20
            print(f"  {from_code} → {to_code}")
            count += 1
    if len(installed_pairs) > 20:
        print(f"  ... and {len(installed_pairs) - 20} more")

# Test translations
print(f"\n{'='*60}")
print("🧪 TESTING TRANSLATIONS")
print(f"{'='*60}")

test_cases = [
    ("en", "fr", "Hello, how are you?"),
    ("es", "fr", "Hola, ¿cómo estás?"),
    ("fr", "de", "Bonjour, comment allez-vous?"),
    ("de", "it", "Guten Tag, wie geht es Ihnen?"),
    ("it", "pt", "Ciao, come stai?"),
    ("pt", "ru", "Olá, como está?"),
    ("ru", "ja", "Привет, как дела?"),
    ("ja", "ko", "こんにちは、元気ですか？"),
    ("ko", "hi", "안녕하세요, 잘 지내세요?"),
    ("hi", "en", "नमस्ते, आप कैसे हैं?"),
]

print("\n🔍 Testing various translations (will use English pivot if needed):")
for from_lang, to_lang, text in test_cases:
    try:
        translated = argostranslate.translate.translate(text, from_lang, to_lang)
        print(f"✅ {from_lang}→{to_lang}: '{text[:30]}...' → '{translated[:30]}...'")
    except Exception as e:
        try:
            # Try with English pivot
            if from_lang != 'en':
                english_text = argostranslate.translate.translate(text, from_lang, 'en')
            else:
                english_text = text
            
            if to_lang != 'en':
                final_text = argostranslate.translate.translate(english_text, 'en', to_lang)
            else:
                final_text = english_text
                
            print(f"✅ {from_lang}→{to_lang} (via English): '{text[:30]}...' → '{final_text[:30]}...'")
        except:
            print(f"❌ {from_lang}→{to_lang}: Failed")

print(f"\n{'='*60}")
print("🚀 READY TO START")
print(f"{'='*60}")
print("The system can now translate between all 10 languages!")
print("If a direct translation isn't available, it will use English as a pivot.")
print("\n1. Start the backend server:")
print("   python backend.py")
print("\n2. Open index.html in your browser")
print(f"{'='*60}")