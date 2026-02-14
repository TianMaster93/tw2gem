import { LiveConnectConfig } from "@google/genai";

export interface GeminiServer {
    apiKey?: string;
}

export interface GeminiLiveClientOptions {
    server: GeminiServer;
    params: {
        model: string;
        config: LiveConnectConfig;
    };
}