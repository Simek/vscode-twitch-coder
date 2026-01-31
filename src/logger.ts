import { type OutputChannel } from 'vscode';

import { LogLevel } from './enums';

export type log = {
  (message: string, ...optionalParams: any[]): void;
  (level: LogLevel, message?: string, ...optionalParams: any[]): void;
};

export class Logger {
  private readonly _channel?: OutputChannel;

  constructor(outputChannel?: OutputChannel, thisArgs?: any) {
    this._channel = outputChannel;
    this.log = this.log.bind(thisArgs ?? this);
  }

  private appendPrefix(value: number): string {
    return value < 10 ? `0${value}` : `${value}`;
  }

  public log(message: string, ...optionalParams: any[]): void;
  public log(levelOrMessage: LogLevel | string, message?: string, ...optionalParams: any[]): void {
    const captains: any = console;

    let resolvedLevel: LogLevel;
    let resolvedMessage: string | undefined;

    if (typeof levelOrMessage === 'string') {
      resolvedLevel = LogLevel.Information;
      resolvedMessage = levelOrMessage;
    } else {
      resolvedLevel = levelOrMessage;
      resolvedMessage = message;
    }

    const getTime = (): {
      hours: string;
      minutes: string;
      seconds: string;
    } => {
      const date = new Date();
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const seconds = date.getSeconds();
      return {
        hours: this.appendPrefix(hours),
        minutes: this.appendPrefix(minutes),
        seconds: this.appendPrefix(seconds),
      };
    };

    const { hours, minutes, seconds } = getTime();
    const log = `[${hours}:${minutes}:${seconds}] ${resolvedMessage}`;

    captains[resolvedLevel](log, ...optionalParams);

    if (this._channel && resolvedLevel !== (LogLevel.Debug as LogLevel)) {
      this._channel.appendLine(log);
    }
  }
}
