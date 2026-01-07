class BrowserSTTService {
    constructor() {
        this.recognition = null;
        this.isRecording = false;
        this.shouldBeRecording = false; // New flag for persistent state
        this.callbacks = {
            onTranscript: () => {},
            onError: () => {},
            onStart: () => {},
            onEnd: () => {},
        };
        this.finalTranscript = '';
        this.initialize();
    }

    initialize() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new window.webkitSpeechRecognition();
        } else if ('SpeechRecognition' in window) {
            this.recognition = new window.SpeechRecognition();
        } else {
            console.error('Browser does not support Speech Recognition');
            return;
        }

        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
            this.isRecording = true;
            this.callbacks.onStart();
        };

        this.recognition.onend = () => {
            this.isRecording = false;
            this.callbacks.onEnd();
            
            // Auto-restart if we are supposed to be recording
            // This prevents browser timeout from stopping capture during long pauses
            if (this.isRestarting || this.shouldBeRecording) {
                this.isRestarting = false;
                this.shouldBeRecording = true; // maintain state
                this.startRecording();
            }
        };

        this.recognition.onresult = (event) => {
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    this.finalTranscript += event.results[i][0].transcript + ' ';
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            this.callbacks.onTranscript(this.finalTranscript.trim(), interimTranscript.trim());
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            this.callbacks.onError(event.error);
            // If error occurs during restart, reset flag
            if (this.isRestarting) {
                this.isRestarting = false;
            }
        };
    }

    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    startRecording() {
        this.shouldBeRecording = true; // Mark as active
        if (this.recognition && !this.isRecording) {
            this.finalTranscript = ''; // Reset transcript on new session
            try {
                this.recognition.start();
            } catch (e) {
                console.error("Error starting recognition:", e);
                // On error, check if it's already started, otherwise reset should flag
                if (e.message.includes('already started')) {
                    this.isRecording = true;
                } else {
                    this.shouldBeRecording = false;
                }
            }
        }
    }

    stopRecording() {
        this.isRestarting = false;
        this.shouldBeRecording = false; // Mark as inactive
        if (this.recognition && this.isRecording) {
            this.recognition.stop();
        }
    }

    pauseRecording() {
        if (this.recognition && this.isRecording) {
            this.recognition.stop();
            // We don't clear finalTranscript here so it resumes appending
        }
    }

    restartRecording() {
        if (this.recognition && this.isRecording) {
            this.isRestarting = true;
            this.recognition.stop();
            // onend will trigger startRecording()
        } else {
            this.startRecording();
        }
    }

    resetTranscript() {
        this.finalTranscript = '';
        this.callbacks.onTranscript('', '');
    }
}

export default new BrowserSTTService();
