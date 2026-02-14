import { GoogleGenAI, LiveSendRealtimeInputParameters, LiveServerContent, LiveServerMessage, Session } from "@google/genai";
import { GeminiLiveClientOptions } from "./gemini-live.dto";

export class GeminiLiveClient {

    private googleGenAI: GoogleGenAI;
    private session: Session;
    public isReady: boolean;

    public onReady?: () => void;
    public onError?: (event: ErrorEvent) => void;
    public onClose?: (event: CloseEvent) => void;
    public onServerContent?: (serverContent: LiveServerContent) => void;

    constructor(
        private options: GeminiLiveClientOptions
    ) {
        this.googleGenAI = new GoogleGenAI({
            apiKey: options.server.apiKey
        });

        void this.startSession();
    }

    private async startSession() {
        this.session = await this.googleGenAI.live.connect({
            model: this.options.params.model,
            config: this.options.params.config,
            callbacks: {
                onopen: () => {
                    this.isReady = true;
                },
                onmessage: this.handlerMessage.bind(this),
                onerror: (event) => {
                    this.isReady = false;
                    this.onError?.(event);
                },
                onclose: (event) => {
                    this.isReady = false;
                    this.onClose?.(event);
                }
            }
        });
    }

    protected async handlerMessage(message: LiveServerMessage) {
        if (message.serverContent) {
            return this.onServerContent?.(message.serverContent);
        }
    };

    public sendText(text: string) {
        if (!this.isReady || !this.session)
            return;
        this.session.sendRealtimeInput({ text });
    }

    public sendRealTime(realTimeInput: LiveSendRealtimeInputParameters) {
        if (!this.isReady || !this.session)
            return;
        this.session.sendRealtimeInput(realTimeInput);
    }

    public close() {
        this.session.close();
    }
}