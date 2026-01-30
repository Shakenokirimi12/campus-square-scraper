import { CampusSquareConfig, LoginResult } from '../types';
import { Logger } from '../utils/logger';

export class CampusSession {
  private config: Required<CampusSquareConfig>;
  private logger: Logger;

  constructor(config: Required<CampusSquareConfig>, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * 共通のログインフローを実行し、認証済みセッションIDを取得します。
   */
  async login(uid: string, pass: string): Promise<LoginResult> {
    let currentStep = "INIT";
    let lastSid = "None";

    try {
      await new Promise(r => setTimeout(r, 200));

      // STEP 1: Landing
      currentStep = "STEP 1: Landing";
      const res1 = await fetch(`${this.config.baseUrl}/campusportal.do?locale=ja_JP`, {
        headers: { 'User-Agent': this.config.userAgent },
        credentials: 'omit'
      });

      if (!res1.ok) {
        await this.logger.notify(currentStep, `HTTP Error: ${res1.status}`, "x");
      }

      const text1 = await res1.text();
      const rwfHash = text1.match(/'rwfHash'\s*:\s*'([a-f0-9]+)'/)?.[1] || "";
      const initialSid = res1.headers.get('set-cookie')?.match(/JSESSIONID=([A-Z0-9]+)/)?.[1] || "";
      lastSid = initialSid;

      if (!rwfHash) await this.logger.notify(currentStep, "rwfHash not found in HTML", "question");

      // STEP 2: Login POST
      currentStep = "STEP 2: Login POST";
      const postBody = `wfId=nwf_PTW0000002_login&userName=${uid}&password=${pass}&locale=ja_JP&undefined=&action=rwf&tabId=home&page=&rwfHash=${rwfHash}`;
      const res2 = await fetch(`${this.config.baseUrl}/campusportal.do`, {
        method: 'POST',
        body: postBody,
        headers: {
          'User-Agent': this.config.userAgent,
          'Cookie': `JSESSIONID=${initialSid}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': `${this.config.baseUrl}/campusportal.do?locale=ja_JP`,
          'Origin': new URL(this.config.baseUrl).origin
        },
        credentials: 'omit'
      });

      const authenticatedSid = res2.headers.get('set-cookie')?.match(/JSESSIONID=([A-Z0-9]+)/)?.[1] || initialSid;
      lastSid = authenticatedSid;

      // STEP 3: Stabilization (Check login success)
      currentStep = "STEP 3: page=main";
      const res3 = await fetch(`${this.config.baseUrl}/campusportal.do?page=main`, {
        headers: {
          'User-Agent': this.config.userAgent,
          'Cookie': `JSESSIONID=${authenticatedSid}`,
          'Referer': `${this.config.baseUrl}/campusportal.do`
        },
        credentials: 'omit'
      });
      const mainHtml = await res3.text();

      if (!mainHtml.includes('ログアウト') && !mainHtml.includes('Logout')) {
        await this.logger.notify("LOGIN_FAILED", `Marker missing. SID: ${authenticatedSid.substring(0, 8)}`, "unlock");
        throw new Error("Login Marker Missing");
      }

      return { sid: authenticatedSid };

    } catch (error: any) {
      await this.logger.error(currentStep, error, lastSid);
      throw error;
    }
  }

  /**
   * 認証済みセッションを使用してリクエストを行います。
   */
  async fetch(url: string, sid: string, options: RequestInit = {}): Promise<Response> {
    const headers = {
      'User-Agent': this.config.userAgent,
      'Cookie': `JSESSIONID=${sid}`,
      ...options.headers,
    };

    return fetch(url, {
      ...options,
      headers,
      credentials: 'omit'
    });
  }
}
