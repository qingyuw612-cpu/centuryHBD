/* ============================================
   Generate TTS voice files using Doubao API
   Usage: node generate_voice.js
   ============================================ */

const fs = require('fs');
const path = require('path');

const API_KEY = 'sk-97a38ac595f84318bb0192d196ffeb6a';
const TTS_URL = 'https://openspeech.bytedance.com/api/v1/tts';

// Load dialogue map
const dialogueMap = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'assets/voice/dialogue_map.json'), 'utf8')
);

const VOICE_DIR = path.join(__dirname, 'assets/voice');
if (!fs.existsSync(VOICE_DIR)) fs.mkdirSync(VOICE_DIR, { recursive: true });

async function generateTTS(text, filename, isJapanese) {
  const body = JSON.stringify({
    text: text,
    voice: isJapanese ? 'ja-JP-NanamiNeural' : 'en-US-JennyNeural',
    format: 'mp3',
    speed: 0.95,
    volume: 100,
  });

  console.log(`  Generating: ${filename} (${isJapanese ? 'JP' : 'EN'}) — "${text.slice(0, 50)}..."`);

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
    console.error(`  ✗ Failed (${resp.status}): ${errText.slice(0, 200)}`);
    return false;
  }

  const buffer = Buffer.from(await resp.arrayBuffer());
  if (buffer.length < 100) {
    console.error(`  ✗ Response too small (${buffer.length} bytes), may be JSON error`);
    console.error(`  Content: ${buffer.toString('utf8').slice(0, 200)}`);
    return false;
  }

  fs.writeFileSync(path.join(VOICE_DIR, filename), buffer);
  console.log(`  ✓ Saved ${filename} (${buffer.length} bytes)`);
  return true;
}

async function main() {
  console.log(`\n🎙️  Generating ${dialogueMap.length} voice files...\n`);

  let success = 0;
  let failed = 0;

  for (const item of dialogueMap) {
    const filename = item.id + '.mp3';
    const filePath = path.join(VOICE_DIR, filename);

    // Skip if already generated
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 500) {
      console.log(`  ⏭  Skipping ${filename} (already exists)`);
      success++;
      continue;
    }

    const ok = await generateTTS(item.en, filename, item.jp);
    if (ok) success++;
    else failed++;

    // Rate limit: pause between requests
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n✅ Done! ${success} generated, ${failed} failed.\n`);
}

main().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
