/**
 * Translate text using Google Translate (unofficial free endpoint).
 * Falls back to MyMemory if Google is unavailable.
 *
 * @param {string} text - Text to translate
 * @param {string} from - Source language code ('en' or 'id')
 * @param {string} to   - Target language code ('en' or 'id')
 * @returns {Promise<string>} Translated text
 */
export async function translateText(text, from, to) {
  if (!text || !text.trim()) return '';
  if (from === to) return text;

  // ── Primary: Google Translate (unofficial, free, no API key) ──────────────
  try {
    const url =
      `https://translate.googleapis.com/translate_a/single` +
      `?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    // Response shape: [ [ ["translated", "original", ...], ... ], ..., "src_lang" ]
    // Collect all sentence chunks and join them
    const translated = data[0]
      ?.map((chunk) => chunk?.[0] ?? '')
      .join('')
      .trim();

    if (translated) return translated;
    throw new Error('Empty result from Google');
  } catch (googleErr) {
    console.warn('Google Translate failed, trying MyMemory…', googleErr.message);
  }

  // ── Fallback: MyMemory free API ───────────────────────────────────────────
  try {
    const url =
      `https://api.mymemory.translated.net/get` +
      `?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return data.responseData.translatedText;
    }
  } catch (memErr) {
    console.error('MyMemory also failed:', memErr.message);
  }

  // ── Last resort: return original text ─────────────────────────────────────
  return text;
}
