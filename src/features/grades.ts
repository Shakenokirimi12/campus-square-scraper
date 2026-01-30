import { CampusSquareConfig, Grade } from '../types';
import { CampusSession } from '../core/session';
import { Logger } from '../utils/logger';

export class GradesFeature {
  constructor(
    private config: Required<CampusSquareConfig>,
    private session: CampusSession,
    private logger: Logger
  ) {}

  /**
   * 指定されたセッションIDを使用して成績を取得します
   */
  async fetch(sid: string): Promise<Grade[]> {
    let currentStep = "INIT";

    try {
      // STEP 3.5: Tab Bridge
      currentStep = "STEP 3.5: Tab Bridge";
      await this.session.fetch(`${this.config.baseUrl}/campusportal.do?page=main&tabId=si`, sid, {
        headers: { 'Referer': `${this.config.baseUrl}/campusportal.do?page=main` }
      });
      await new Promise(r => setTimeout(r, 300));

      // STEP 4: Entry (FlowKey 捕獲)
      currentStep = "STEP 4: Entry (Iframe)";
      const res4 = await this.session.fetch(`${this.config.baseUrl}/campussquare.do?_flowId=SIW0001200-flow`, sid, {
        headers: {
          'Referer': `${this.config.baseUrl}/campusportal.do?page=main&tabId=si`,
          'sec-fetch-dest': 'iframe'
        },
        redirect: 'manual'
      });

      let flowKey = "";
      if (res4.status === 302) {
        flowKey = res4.headers.get('location')?.match(/_flowExecutionKey=([a-zA-Z0-9_-]+)/)?.[1] || "";
      } else {
        const squareHtml = await res4.text();
        flowKey = squareHtml.match(/_flowExecutionKey" value="([a-zA-Z0-9_-]+)"/i)?.[1] || "";
      }

      if (!flowKey) throw new Error("Could not find flow key");

      // STEP 5: Result POST
      currentStep = "STEP 5: Grade POST";
      const res5 = await this.session.fetch(`${this.config.baseUrl}/campussquare.do`, sid, {
        method: 'POST',
        body: `_flowExecutionKey=${flowKey}&_eventId=display`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': `${this.config.baseUrl}/campussquare.do?_flowId=SIW0001200-flow&_flowExecutionKey=${flowKey}`
        }
      });

      const finalHtml = await res5.text();
      return this.parseGrades(finalHtml);

    } catch (error: any) {
      await this.logger.error(currentStep, error, sid);
      throw error;
    }
  }

  private parseGrades(html: string): Grade[] {
    const grades: Grade[] = [];
    const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
    rows.forEach(row => {
      const cols = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
      if (cols && cols.length >= 8) {
        const clean = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
        const subject = clean(cols[4]);
        const score = clean(cols[6]);
        const grade = clean(cols[7]);
        if (subject && (score || grade)) {
          grades.push({ subject, score, grade: grade || '履修中' });
        }
      }
    });
    return grades;
  }
}
