// Used to make sure your cloud's timezone didn't do something funny toward your project
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

export const LocalTZ = 'Asia/Jakarta';

export function LocalDate(date?: string | number | Date | dayjs.Dayjs | null) {
  return dayjs(date).tz(LocalTZ);
}
