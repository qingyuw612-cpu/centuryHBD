/* ============================================
   Generate TTS voice files using Doubao API
   Usage: node generate_voice.js
   ============================================ */

const fs = require('fs');
const path = require('path');

const API_KEY = 'a77afe65-7f3b-44ec-83cf-2b3dcd2d2f44';
const APP_ID = 'api-key-20260703170752';
const TTS_URL = 'https://openspeech.bytedance.com/api/v1/tts';

const dialogueMap = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'assets/voice/dialogue_map.json'), 'utf8')
);

const VOICE_DIR = path.join(__dirname, 'assets/voice');
if (!fs.existsSync(VOICE_DIR)) fs.mkdirSync(VOICE_DIR, { recursive: true });

async function generateTTS(text, filename, isJapanese) {
  const body = JSON.stringify({
    app: { appid: APP_ID },
    user: { uid: 'century-story' },
    audio: {
      voice_type: isJapanese ? 'ja-JP-NanamiNeural' : 'en-US-JennyNeural',
      encoding: 'mp3',
      speed_ratio: 0.95,
    },
    request: {
      text: text,
      text_type: 'plain',
    },
  });

  console.log(`  ${filename} (${isJapanese ? 'JP' : 'EN'}) — "${text.slice(0, 50)}..."`);

  const resp = await fetch(TTS_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer;${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body,
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error(`  ✗ HTTP ${resp.status}: ${errText.slice(0, 300)}`);
    return false;
  }

  const buffer = Buffer.from(await resp.arrayBuffer());
  if (buffer.length < 200) {
    console.error(`  ✗ Too small (${buffer.length}B): ${buffer.toString('utf8').slice(0, 200)}`);
    return false;
  }

  fs.writeFileSync(path.join(VOICE_DIR, filename), buffer);
  console.log(`  ✓ ${filename} (${buffer.length}B)`);
  return true;
}

async function main() {
  console.log(`\n🎙️  Generating ${dialogueMap.length} voice files...\n`);

  let ok = 0, fail = 0;
  for (const item of dialogueMap) {
    const filename = item.id + '.mp3';
    const filePath = path.join(VOICE_DIR, filename);

    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 500) {
      console.log(`  ⏭  ${filename} (exists)`);
      ok++;
      continue;
    }

    const result = await generateTTS(item.en, filename, item.jp);
    if (result) ok++; else fail++;
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n✅ ${ok} generated, ${fail} failed.\n`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
