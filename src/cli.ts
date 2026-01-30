#!/usr/bin/env node
import { CampusSquareService } from './index';
// import { version } from '../package.json';
const version = '1.0.0';

const args = process.argv.slice(2);
const help = `
Campus Square Scraper CLI v${version}

Usage:
  campus-square-scraper <command> [options]

Commands:
  login     Login and output Session ID
  grades    Fetch grades as JSON
  calendar  Fetch calendar URL and events as JSON

Options:
  -u, --user <id>      User ID (Required)
  -p, --pass <pass>    Password (Required)
  --url <url>          Base URL (Default: https://csweb.u-aizu.ac.jp/campusweb)
  --sid <sid>          Session ID (Skip login if provided)
  --json               Output JSON only (for scripts)
  --help               Show this help

Examples:
  campus-square-scraper grades -u s1234567 -p mypassword
  campus-square-scraper calendar -u s1234567 -p mypassword --json
`;

function parseArgs(args: string[]) {
  const options: Record<string, string | boolean> = {
    url: 'https://csweb.u-aizu.ac.jp/campusweb',
    json: false
  };
  let command = '';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('-')) {
      if (arg === '--help') options.help = true;
      else if (arg === '--json') options.json = true;
      else if (arg === '-u' || arg === '--user') options.user = args[++i];
      else if (arg === '-p' || arg === '--pass') options.pass = args[++i];
      else if (arg === '--url') options.url = args[++i];
      else if (arg === '--sid') options.sid = args[++i];
    } else if (!command) {
      command = arg;
    }
  }
  return { command, options };
}

async function main() {
  const { command, options } = parseArgs(args);

  if (options.help || !command) {
    console.log(help);
    process.exit(0);
  }

  const service = new CampusSquareService({
    baseUrl: String(options.url),
    debugNotify: options.json ? async () => {} : undefined // JSONモードならログ抑制
  });

  try {
    let session;
    if (options.sid) {
      session = service.fromSessionId(String(options.sid));
    } else {
      if (!options.user || !options.pass) {
        console.error('Error: User ID (-u) and Password (-p) are required.');
        process.exit(1);
      }
      if (!options.json) console.error('Logging in...');
      session = await service.login(String(options.user), String(options.pass));
    }

    if (command === 'login') {
      if (options.json) {
        console.log(JSON.stringify({ sid: session.sid }));
      } else {
        console.log(`Session ID: ${session.sid}`);
      }
    } else if (command === 'grades') {
      if (!options.json) console.error('Fetching grades...');
      const grades = await session.fetchGrades();
      console.log(JSON.stringify(grades, null, 2));
    } else if (command === 'calendar') {
      if (!options.json) console.error('Fetching calendar...');
      const { calendarUrl } = await session.fetchCalendarUrl();
      const events = await session.fetchCalendarEvents(calendarUrl);
      console.log(JSON.stringify({ calendarUrl, events }, null, 2));
    } else {
      console.error(`Unknown command: ${command}`);
      console.log(help);
      process.exit(1);
    }
  } catch (error: any) {
    if (options.json) {
      console.error(JSON.stringify({ error: error.message }));
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

main();
