// voice-ai-agent-base.ts
import { error } from 'console';
import { Session } from '../websocket/session';
import { Timer } from './timer';

/**
 * Base class for all voice AI agents, providing common session and timeout handling.
 */
export abstract class VoiceAIAgentBaseClass {
  protected session: Session;
  protected noInputTimer: Timer;

  /**
   * @param session         WebSocket session for client communication
   * @param noInputCallback Callback to invoke when no input timer elapses
   */
  constructor(session: Session, noInputCallback: () => void, noInputTimeout: number = 30000) {
    this.session = session;
    this.noInputTimer = new Timer(noInputCallback, noInputTimeout);
  }

  /**
   * Process incoming audio buffer.
   */
  abstract processAudio(audioPayload: Uint8Array): Promise<void>;

  /**
   * Send Keep Alive Message to the Agent Platform on Genesys Cloud Ping-Pong
   */
  abstract sendKeepAlive(): Promise<void>;

  /**
   * Handle completion of playback 
   * Default implementation: start no-input timer if agent is connected
   */
  async processPlaybackCompleted(): Promise<void> {
    if (this.isAgentConnected()) {
      console.log(`${new Date().toISOString()}:PlaybackCompleted|Starting no input timer`);
      this.noInputTimer.startTimer();
    }
  }

  /**
   * Close any open resources and cleanup
   */
  abstract close(): Promise<void>;

  /**
   * Returns true if the underlying agent connection (e.g., WebSocket) is open
   */
  protected abstract isAgentConnected(): boolean;


  protected getSystemMessage(): String {
    const promptFileName: String = this.session.getInputVariables().promptName + 'Prompt.md';

    const fileName = "./src/prompts/" + promptFileName;
    try {
      let fileData = VoiceAIAgentBaseClass.readFile(fileName);
      Object.entries(this.session.getInputVariables()).forEach(([key, value]) => {
        fileData = fileData.replace(`{{${key}}}`, value);
      });

      const dateTime = new Date();

      fileData = fileData.replace("{{current_date}}", `${dateTime.getFullYear()}-${dateTime.getMonth()}-${dateTime.getDate()}`);

      return fileData;
    } catch (error) {
      console.error(new Date().toISOString() + ':' + `[OpenAI] Error reading system message from file ${fileName}:`, error);
      return process.env.DEFAULT_PROMPT_INSTRUCTIONS || 'You are a helpful assistant. Please answer the user\'s questions to the best of your ability.';
    }
  }

  private static readFile(filePath: string): String {
    const fs = require('fs');
    try {
      let fileData = fs.readFileSync(filePath, "utf8");
      try {
        return JSON.parse(fileData);
      } catch (jsonErr) {
        console.error(new Date().toISOString() + ':' + `[OpenAI] Error parsing JSON from file ${filePath}:`, jsonErr);
        const errorMessage = (jsonErr instanceof Error) ? jsonErr.message : String(jsonErr);
        throw new Error(`Error parsing JSON from file ${filePath}: ${errorMessage}`);
      }
    } catch (fsErr) {
      let errorMessage = '';
      if (typeof fsErr === 'object' && fsErr !== null && 'code' in fsErr && (fsErr as any).code === 'ENOENT') {
        errorMessage = `[OpenAI] File not found: ${filePath}`;
      } else {
        errorMessage = `[OpenAI] Error reading file ${filePath}:`;
      }
      console.error(new Date().toISOString() + ':' + errorMessage, fsErr);
      throw new Error(errorMessage);
    }
  }

  /**
   * 
   * @returns System Tools for the Agent
   */
  protected getSystemTools(): String[] {
    const toolFileName = this.session.getInputVariables().promptName + 'Tools.json';
    console.log(new Date().toISOString() + ':' + `[OpenAI] Loading system tools from file: ${toolFileName}`);
    const filePath = "./src/prompts/" + toolFileName;
    try {
      const tools = VoiceAIAgentBaseClass.readFile(filePath);
      if (Array.isArray(tools)) {
        return tools;
      } else {
        console.error(new Date().toISOString() + ':' + `[OpenAI] Invalid tools format in file ${filePath}`);
        return [];
      }
    } catch (error) {
      console.error(new Date().toISOString() + ':' + `[OpenAI] Error loading system tools:`, error);
    }
    return [];
  }

}
