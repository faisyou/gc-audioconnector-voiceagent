import { ClientMessage } from '../../../protocol/message';
import { Session } from '../../session';
import { MessageHandler } from '../message-handler';

export class PlaybackCompletedMessageHandler implements MessageHandler {
    handleMessage(message: ClientMessage, session: Session) {
        console.log('Received a Playback Completed Message.');
        session.playbackCompleted();
    }
}