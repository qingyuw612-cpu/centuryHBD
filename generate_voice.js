/* ============================================
   Generate TTS voice files using Doubao seed-tts-2.0
   Per-character voice & speed
   ============================================ */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const API_KEY = 'a77afe65-7f3b-44ec-83cf-2b3dcd2d2f44';
const TTS_URL = 'https://openspeech.bytedance.com/api/v3/tts/unidirectional';

const dialogueMap = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'assets/voice/dialogue_map.json'), 'utf8')
);

const VOICE_DIR = path.join(__dirname, 'assets/voice');
if (!fs.existsSync(VOICE_DIR)) fs.mkdirSync(VOICE_DIR, { recursive: true });

// Character voice & speed config
const CHAR_CONFIG = {
  narrator:  { speaker: 'en_female_dacey_uranus_bigtts',       speed: 5 },
  me:        { speaker: 'en_female_stokie_uranus_bigtts',      speed: 5 },
  girl:      { speaker: 'en_female_dacey_uranus_bigtts',       speed: 5 },
  magician:  { speaker: 'zh_male_aojiaobazong_uranus_bigtts',  speed: 5 },
  sadMush:   { speaker: 'ICL_uranus_en_male_xavier_tob', speed: 10 },
  happyMush: { speaker: 'zh_male_shaonianzixin_uranus_bigtts', speed: 10 },
  cat:       { speaker: 'ja_male_bv524_uranus_bigtts',         speed: 0 },
};

const JP_SPEAKER = 'ja_male_bv524_uranus_bigtts';

async function generateTTS(text, filename, charKey, isJapanese) {
  const cfg = CHAR_CONFIG[charKey] || CHAR_CONFIG.narrator;
  const reqid = crypto.randomUUID();

  const speaker = isJapanese ? JP_SPEAKER : cfg.speaker;

  const body = JSON.stringify({
    req_params: {
      text: text,
      speaker: speaker,
      model: 'seed-tts-2.0-standard',
      audio_params: {
        format: 'mp3',
        sample_rate: 24000,
        speech_rate: isJapanese ? 0 : cfg.speed,
        loudness_rate: 0,
      },
    },
  });

  console.log(`  ${filename} [${charKey}] — "${text.slice(0, 45)}..."`);

  const resp = await fetch(TTS_URL, {
    method: 'POST',
    headers: {
      'X-Api-Key': API_KEY,
      'X-Api-Resource-Id': 'seed-tts-2.0',
      'X-Api-Request-Id': reqid,
      'Content-Type': 'application/json',
    },
    body,
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error(`  ✗ HTTP ${resp.status}: ${errText.slice(0, 300)}`);
    return false;
  }

  const respText = await resp.text();
  const lines = respText.trim().split('\n');
  let allAudio = Buffer.alloc(0);

  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      if (obj.code !== 0 && obj.code !== 20000000) {
        console.error(`  ✗ API code=${obj.code}: ${obj.message}`);
        return false;
      }
      if (obj.data) {
        allAudio = Buffer.concat([allAudio, Buffer.from(obj.data, 'base64')]);
      }
    } catch(e) {
      console.error(`  ✗ Parse: ${e.message.slice(0, 80)}`);
      return false;
    }
  }

  if (allAudio.length < 200) {
    console.error(`  ✗ Too small (${allAudio.length}B)`);
    return false;
  }

  fs.writeFileSync(path.join(VOICE_DIR, filename), allAudio);
  console.log(`  ✓ ${filename} (${allAudio.length}B)`);
  return true;
}

async function main() {
  console.log(`\n🎙️  ${dialogueMap.length} voice files with per-character voices...\n`);

  let ok = 0, fail = 0;
  for (const item of dialogueMap) {
    const filename = item.id + '.mp3';
    const charKey = item.char || 'narrator';

    const result = await generateTTS(item.en, filename, charKey, item.jp);
    if (result) ok++; else fail++;
    await new Promise(r => setTimeout(r, 400));
  }

  console.log(`\n✅ ${ok} generated, ${fail} failed.\n`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
