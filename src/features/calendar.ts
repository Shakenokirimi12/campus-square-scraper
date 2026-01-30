import { CampusSquareConfig, CalendarEvent } from '../types';
import { CampusSession } from '../core/session';
import { Logger } from '../utils/logger';

export class CalendarFeature {
  constructor(
    private config: Required<CampusSquareConfig>,
    private session: CampusSession,
    private logger: Logger
  ) {}

  /**
   * 指定されたセッションIDを使用してカレンダーURLを取得します
   */
  async fetchUrl(sid: string): Promise<{ calendarUrl: string; campusCalendarUrl: string }> {
    let currentStep = "INIT";

    try {
      // STEP 3.5: Tab Bridge
      currentStep = "STEP 3.5: Tab Bridge";
      await this.session.fetch(`${this.config.baseUrl}/campusportal.do?page=main&tabId=po`, sid, {
        headers: { 'Referer': `${this.config.baseUrl}/campusportal.do?page=main` }
      });
      await new Promise(r => setTimeout(r, 300));

      // STEP 4: Access Calendar Page
      currentStep = "STEP 4: Calendar Page (POW2401000-flow)";
      const res4 = await this.session.fetch(`${this.config.baseUrl}/campussquare.do?_flowId=POW2401000-flow`, sid, {
        headers: {
          'Referer': `${this.config.baseUrl}/campusportal.do?page=main&tabId=po`,
          'sec-fetch-dest': 'iframe'
        }
      });

      const calendarHtml = await res4.text();
      const calendarUrlMatch = calendarHtml.match(/id="calendarNm"[^>]*value="([^"]+)"/i);
      const campusCalendarUrlMatch = calendarHtml.match(/id="comonCalendarNm"[^>]*value="([^"]+)"/i);

      const calendarUrl = calendarUrlMatch?.[1] || "";
      const campusCalendarUrl = campusCalendarUrlMatch?.[1] || "";

      if (!calendarUrl) {
        throw new Error("Could not find calendar URL in HTML");
      }

      return { calendarUrl, campusCalendarUrl };

    } catch (error: any) {
      await this.logger.error(currentStep, error, sid);
      throw error;
    }
  }

  async fetchEvents(icsUrl: string): Promise<CalendarEvent[]> {
    try {
      const response = await fetch(icsUrl, {
        headers: { 'User-Agent': this.config.userAgent }
      });

      if (!response.ok) {
        throw new Error(`ICS fetch failed: ${response.status}`);
      }

      const icsText = await response.text();
      return this.parseICS(icsText);

    } catch (error: any) {
      await this.logger.notify("ICS_FETCH_FAILED", error.message, "x");
      throw error;
    }
  }

  private parseICS(icsText: string): CalendarEvent[] {
    const events: CalendarEvent[] = [];
    const eventBlocks = icsText.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/gi) || [];

    eventBlocks.forEach(block => {
      try {
        const getField = (name: string): string => {
          const regex = new RegExp(`^${name}[;:](.*)`, 'im');
          const match = block.match(regex);
          return match ? match[1].replace(/\\n/g, '\n').replace(/\\,/g, ',').trim() : '';
        };

        const uid = getField('UID');
        const summary = getField('SUMMARY');
        const location = getField('LOCATION');
        const description = getField('DESCRIPTION');
        const rrule = getField('RRULE');
        const dtstartRaw = getField('DTSTART');
        const dtendRaw = getField('DTEND');

        const parseICSDate = (raw: string): Date => {
          const cleaned = raw.replace(/^[^:]*:/, '');
          const match = cleaned.match(/(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?(\d{2})?/);
          if (match) {
            const [, y, m, d, h = '0', min = '0', s = '0'] = match;
            return new Date(+y, +m - 1, +d, +h, +min, +s);
          }
          return new Date(raw);
        };

        if (summary && dtstartRaw) {
          events.push({
            uid: uid || `event-${events.length}`,
            summary,
            dtstart: parseICSDate(dtstartRaw),
            dtend: dtendRaw ? parseICSDate(dtendRaw) : parseICSDate(dtstartRaw),
            location: location || undefined,
            description: description || undefined,
            rrule: rrule || undefined
          });
        }
      } catch (e) {
        console.warn('Failed to parse VEVENT:', e);
      }
    });

    return events;
  }
}
