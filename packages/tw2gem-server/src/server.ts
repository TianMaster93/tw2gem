import { TwilioMediaEvent, TwilioServerOptions, TwilioWebSocketServer } from '@tw2gem/twilio-server';
import { BidiGenerateContentServerContent, GeminiLiveClient } from '@tw2gem/gemini-live-client';
import { Tw2GemServerOptions, Tw2GemSocket } from './server.dto';
import { AudioConverter } from '@tw2gem/audio-converter';

export class Tw2GemServer extends TwilioWebSocketServer {

    constructor(options: Tw2GemServerOptions) {
        super(options.serverOptions);
        const twilioServerOptions = <TwilioServerOptions>options.serverOptions;

        twilioServerOptions.handlers = {
            onStart: (socket: Tw2GemSocket, event) => {
                this.onNewCall?.(socket);

                const geminiClient = new GeminiLiveClient(options.geminiOptions);
                socket.twilioStreamSid = event.streamSid;
                
                geminiClient.onReady = () => {
                    socket.geminiClient = geminiClient;
                    this.onGeminiReady?.(socket);
                };

                geminiClient.onClose = () => {
                    socket.close();
                }

                geminiClient.onServerContent = (serverContent) => { this.onServerContent?.(socket, serverContent) }

                socket.onclose = (event) => {
                    if (socket?.geminiClient) {
                        socket.geminiClient.close();
                        delete socket.geminiClient;
                    }
                    this.onClose(socket, event);
                };
            },
            onMedia: this.onMedia
        };
    }

    public onNewCall(socket: Tw2GemSocket) {}

    public onGeminiReady(socket: Tw2GemSocket) {}

    public onMedia(socket: Tw2GemSocket, event: TwilioMediaEvent) {
        if (!socket.geminiClient || event.media?.track !== 'inbound' || !event.media.payload)
            return;

        const base64MulawAudio = event.media.payload;
        const base64PCM16k = AudioConverter.convertBase64MuLawToBase64PCM16k(base64MulawAudio);
        socket.geminiClient.sendRealTime({
            audio: {
                mimeType: 'audio/pcm;rate=16000',
                data: base64PCM16k
            }
        });
    }

    public onServerContent(socket: Tw2GemSocket, serverContent: BidiGenerateContentServerContent) {
        if (!socket.twilioStreamSid || !socket.geminiClient || !serverContent.modelTurn?.parts?.length)
            return;

        const parts = serverContent.modelTurn?.parts;
        
        const inlineData = parts.flatMap(part => part.inlineData)?.filter(item => item?.mimeType === 'audio/pcm;rate=24000' && item?.data);
        if (!inlineData?.length)
            return;

        const base64Mulaws = inlineData.map(lineData => AudioConverter.convertBase64PCM24kToBase64MuLaw8k(lineData!.data));
        for (const audios of base64Mulaws) {
            socket.sendMedia({
                streamSid: socket.twilioStreamSid,
                media: {
                    payload: audios
                }
            });
        }
    }
}