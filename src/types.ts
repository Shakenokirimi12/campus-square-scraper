export interface Grade {
  subject: string;
  score: string;
  grade: string;
}

export interface CalendarEvent {
  uid: string;          // イベントID
  summary: string;      // 科目名/イベント名
  dtstart: Date;        // 開始日時
  dtend: Date;          // 終了日時
  location?: string;    // 教室
  description?: string; // 詳細
  rrule?: string;       // 繰り返しルール（授業の場合）
}

export interface CampusSquareConfig {
  baseUrl: string;
  userAgent?: string;
  debugNotify?: (title: string, message: string, tags?: string) => Promise<void>;
}

export interface LoginResult {
  sid: string; // Session ID (JSESSIONID)
}
