import { defineConfig } from '@argo-video/cli';

export default defineConfig({
  baseURL: 'http://localhost:5260',
  demosDir: 'demos',
  outputDir: 'videos',
  tts: {
    defaultVoice: 'af_heart',
    defaultSpeed: 1.0,
  },
  video: {
    width: 1920,
    height: 1080,
    fps: 30,
    browser: 'chromium', // webkit is the macOS recommendation; this is Windows and only chromium is installed
  },
  export: {
    preset: 'slow',
    crf: 16,
  },
  overlays: {
    autoBackground: true,
  },
});
