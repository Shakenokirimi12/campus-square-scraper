import { CampusSquareConfig, Grade, CalendarEvent, LoginResult } from './types';
import { CampusSession } from './core/session';
import { GradesFeature } from './features/grades';
import { CalendarFeature } from './features/calendar';
import { Logger } from './utils/logger';
import { AuthenticatedSession } from './session';

export * from './types';
export * from './session';

export class CampusSquareService {
  private config: Required<CampusSquareConfig>;
  private session: CampusSession;
  private logger: Logger;

  private gradesFeature: GradesFeature;
  private calendarFeature: CalendarFeature;

  /**
   * 個別に機能を利用したい場合は、以下のプロパティからアクセスできますが、
   * 基本的には login() で AuthenticatedSession を取得して利用することを推奨します。
   */
  public grades: GradesFeature;
  public calendar: CalendarFeature;

  constructor(config: CampusSquareConfig) {
    this.config = {
      baseUrl: config.baseUrl.replace(/\/$/, ''),
      userAgent: config.userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
      debugNotify: config.debugNotify || (async () => {})
    };

    this.logger = new Logger(this.config);
    this.session = new CampusSession(this.config, this.logger);

    this.gradesFeature = new GradesFeature(this.config, this.session, this.logger);
    this.calendarFeature = new CalendarFeature(this.config, this.session, this.logger);
    
    // 公開プロパティへのマッピング（互換性/直接利用のため）
    this.grades = this.gradesFeature;
    this.calendar = this.calendarFeature;
  }

  /**
   * ログインを実行し、認証済みセッションオブジェクトを返します。
   * このセッションオブジェクトを使用して、成績取得などをSIDを再利用して実行できます。
   */
  async login(uid: string, pass: string): Promise<AuthenticatedSession> {
    const { sid } = await this.session.login(uid, pass);
    return new AuthenticatedSession(sid, this.gradesFeature, this.calendarFeature);
  }

  /**
   * 既存のセッションIDから認証済みセッションオブジェクトを生成します。
   * セッションの有効性は確認しません。
   */
  fromSessionId(sid: string): AuthenticatedSession {
    return new AuthenticatedSession(sid, this.gradesFeature, this.calendarFeature);
  }

  // --- 互換性のためのショートカットメソッド ---

  /**
   * [非推奨] 毎回ログインして成績を取得します。
   * パフォーマンスが悪いため、login() を使用してセッションを使い回すことを推奨します。
   */
  async fetchGrades(uid: string, pass: string): Promise<Grade[]> {
    const session = await this.login(uid, pass);
    return session.fetchGrades();
  }

  /**
   * [非推奨] 毎回ログインしてカレンダーURLを取得します。
   */
  async fetchCalendarUrl(uid: string, pass: string): Promise<{ calendarUrl: string; campusCalendarUrl: string }> {
    const session = await this.login(uid, pass);
    return session.fetchCalendarUrl();
  }

  async fetchCalendarEvents(icsUrl: string): Promise<CalendarEvent[]> {
    return this.calendarFeature.fetchEvents(icsUrl);
  }
}
