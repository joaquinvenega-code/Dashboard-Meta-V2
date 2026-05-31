import { TextToSpeechClient } from '@google-cloud/text-to-speech';

async function list() {
  try {
    const defaultCredentials = process.env.GOOGLE_CLOUD_TTS_CREDENTIALS_JSON ? JSON.parse(process.env.GOOGLE_CLOUD_TTS_CREDENTIALS_JSON) : undefined;
    const client = new TextToSpeechClient({ credentials: defaultCredentials });
    const [result] = await client.listVoices({ languageCode: 'es' });
    const voices = result.voices || [];
    voices.forEach(voice => {
      console.log(`${voice.name} (${voice.ssmlGender})`);
    });
  } catch (e) {
    console.error(e);
  }
}
list();
