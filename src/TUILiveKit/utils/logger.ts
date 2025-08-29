export class Logger {
  private prefix: string;

  constructor(options: Record<string, any>) {
    this.prefix = options.prefix;
  }

  log(...args: any[]):void {
    const param: any[] = Array.from(args);
    console.log?.apply(console, [this.getTime(), this.prefix, ...param]);
  }

  info(...args: any[]):void {
    const param: any[] = Array.from(args);
    console.info?.apply(console, [this.getTime(), this.prefix, ...param]);
  }

  warn(...args: any[]):void {
    const param: any[] = Array.from(args);
    console.warn?.apply(console, [this.getTime(), this.prefix, ...param]);
  }

  error(...args: any[]):void {
    const param: any[] = Array.from(args);
    console.error?.apply(console, [this.getTime(), this.prefix, ...param]);
  }

  debug(...args: any[]):void {
    const param: any[] = Array.from(args);
    console.debug?.apply(console, [this.getTime(), this.prefix, ...param]);
  }

  private getTime(): string {
    const date = new Date();

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0');

    return `${hours}:${minutes}:${seconds}:${milliseconds}`;
  }

  private getTime2(): string {
    const date = new Date();
    return `${date.toLocaleTimeString('en-US', {
      hourCycle: 'h23',
    } as Intl.DateTimeFormatOptions)}.${String(date.getMilliseconds()).padStart(3, '0')}`;
  }
}

const logger = new Logger({ prefix: '[LiveKit]' });

export default logger;
