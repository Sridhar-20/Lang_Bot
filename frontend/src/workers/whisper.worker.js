/* eslint-disable no-restricted-globals */

import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js';

// Skip local model checks since we are in a browser
env.allowLocalModels = false;
env.useBrowserCache = true;

class AutomaticSpeechRecognitionPipeline {
    static task = 'automatic-speech-recognition';
    static model = 'Xenova/whisper-tiny.en'; // Reverting to Tiny for stability
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            this.instance = await pipeline(this.task, this.model, { progress_callback });
        }
        return this.instance;
    }
}

self.addEventListener('message', async (event) => {
    const { type, audio } = event.data;

    if (type === 'load') {
        try {
            self.postMessage({ type: 'status', status: 'loading' });
            await AutomaticSpeechRecognitionPipeline.getInstance(x => {
                self.postMessage({ type: 'download', data: x });
            });
            self.postMessage({ type: 'status', status: 'ready' });
        } catch (err) {
            self.postMessage({ type: 'error', data: err.message });
        }
    } else if (type === 'transcribe') {
        try {
            console.log("Worker: Starting transcription...");
            const transcriber = await AutomaticSpeechRecognitionPipeline.getInstance();
            
            console.log("Worker: Audio received. Type:", audio.constructor.name);
            console.log("Worker: Audio length:", audio.length);
            // console.log("Worker: First 5 samples:", audio.slice(0, 5));

            // Generate options
            const options = {
                language: 'english', // Explicitly set English to reduce hallucination
                task: 'transcribe'
            };

            const output = await transcriber(audio, options);

            console.log("Worker: Transcription output:", output);
            self.postMessage({ type: 'result', data: output });
        } catch (err) {
            console.error("Worker Error:", err);
            self.postMessage({ type: 'error', data: err.message });
        }
    } else if (type === 'delete') {
        // We can't easily "delete" from cache via JS in the worker for the browser cache API specifically for the model files 
        // without more complex service worker logic, but we can reset the instance.
        // The actual cache deletion usually happens via browser settings or specific cache API calls in the main thread.
        // For now, we'll just reset the instance.
        AutomaticSpeechRecognitionPipeline.instance = null;
        self.postMessage({ type: 'status', status: 'deleted' });
    }
});
