import Emittery from 'emittery'
import logger from '../lib/logger';

// turn on emittery debug manually using DEBUG since it won't be available in the browser
// https://github.com/sindresorhus/emittery#isdebugenabled
Emittery.isDebugEnabled = process.env.DEBUG === 'emittery' || process.env.DEBUG === '*';
export const emitteryDebugLogger = (name?: string) => {
  return (type: string, debugName: string, eventName: any, eventData: any) => {
    const logData = JSON.stringify(eventData, (_, v) => typeof v === 'bigint' ? v.toString() : v)
    const currentTime = new Date();
    const logTime = `${currentTime.getHours()}:${currentTime.getMinutes()}:${currentTime.getSeconds()}.${currentTime.getMilliseconds()}`;
    logger.debug(
      `[${logTime}][emittery:${
        name ?? debugName
      }][${type}] ${eventName?.toString()}\n${logData}`
    )
  }
}