# Local voice

Use Settings, Voice & microphone, to download the speech runtime once and test your microphone. Markora chooses the model internally. Multilingual Whisper detects the language; an available Bengali specialist handles Bengali speech. Other detected languages remain on the multilingual engine.

Microphone audio is decoded locally in the default voice flow. Short or uncertain phrases may need correction, particularly names and Bengali/English code-switching. The sample check transcribes without editing the project or keeping the sample recording. Recognition quality depends on audio and language, not just model availability.

## Downloads and credits

- The CPU runtime comes from [ggml-org/whisper.cpp](https://github.com/ggml-org/whisper.cpp).
- Standard quantized Whisper models come from [ggerganov/whisper.cpp](https://huggingface.co/ggerganov/whisper.cpp), converted from OpenAI Whisper. Their model/runtime sources use MIT licensing.
- The Bengali specialist is [bhaskaro/ainotes-whisper-bengali-q5_1](https://huggingface.co/bhaskaro/ainotes-whisper-bengali-q5_1), a conversion of [BanglaASR](https://huggingface.co/bangla-speech-processing/BanglaASR). Fine-tuning credit belongs to the Bangla Speech Processing authors, including Md Saiful Islam; conversion credit belongs to bhaskaro. Both model cards specify MIT licensing.
- The speech filter comes from [ggml-org/whisper-vad](https://huggingface.co/ggml-org/whisper-vad), using Silero VAD under MIT licensing.

Exact revisions, expected sizes and SHA-256 hashes are pinned in `core/voice-setup.js`. Downloads are validated before they become active. Model repository code is not executed. Models are separate from the installer and source repository.

The Bengali specialist uses no timestamps and bounded overlapping PCM chunks. The browser pause detector uses audio levels rather than streaming neural VAD. Long pauses, noise and accents still affect capture and recognition.
