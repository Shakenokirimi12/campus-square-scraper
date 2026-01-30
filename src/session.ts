import { CampusSquareConfig, Grade, CalendarEvent } from './types';
import { GradesFeature } from './features/grades';
import { CalendarFeature } from './features/calendar';

export class AuthenticatedSession {
  /**
   * 現在の有効なセッションID
   */
  public readonly sid: string;

  constructor(
    sid: string,
    private gradesFeature: GradesFeature,
    private calendarFeature: CalendarFeature
  ) {
    this.sid = sid;
  }

  /**
   * 成績情報を取得します
   */
  async fetchGrades(): Promise<Grade[]> {
    return this.gradesFeature.fetch(this.sid);
  }

  /**
   * カレンダーURLを取得します
   */
  async fetchCalendarUrl(): Promise<{ calendarUrl: string; campusCalendarUrl: string }> {
    return this.calendarFeature.fetchUrl(this.sid);
  }

  /**
   * カレンダーイベントを取得します (認証不要なICS URLを使用)
   */
  async fetchCalendarEvents(icsUrl: string): Promise<CalendarEvent[]> {
    // ICS取得はセッションID不要だが、便宜上ここに含める
    return this.calendarFeature.fetchEvents(icsUrl);
  }
}
