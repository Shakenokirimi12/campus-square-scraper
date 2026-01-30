import { CampusSquareConfig } from '../types';

export class Logger {
  constructor(private config: Required<CampusSquareConfig>) {}

  async notify(title: string, message: string, tags: string = "info") {
    console.log(`[${title}] ${message}`);
    await this.config.debugNotify(title, message, tags);
  }

  async error(step: string, error: any, sid: string = "None") {
    const errorMsg = `Step: ${step}\nSID: ${sid.substring(0, 8)}\nError: ${error.message}`;
    await this.notify("CRITICAL_FAILURE", errorMsg, "skull");
  }
}
