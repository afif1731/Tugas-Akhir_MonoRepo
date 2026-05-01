import { useEffect, useState } from 'react';

const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
const ampm = ['AM', 'PM'] as const;

type TimeValue = {
  hour: string;
  minute: string;
  ampm: 'AM' | 'PM';
};

function to12HourFormat(time24: string): string {
  const match = time24.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
  if (!match) return '12:00 AM';

  let hour = Number.parseInt(match[1], 10);
  const minute = match[2];
  const ampm = hour >= 12 ? 'PM' : 'AM';

  if (hour === 0) hour = 12;
  else if (hour > 12) hour -= 12;

  return `${hour.toString().padStart(2, '0')}:${minute} ${ampm}`;
}

function to24HourFormat(val: string): string {
  const match = val.match(/^(\d{2}):(\d{2})\s?(AM|PM)?$/i);
  if (!match) return '';

  let hour = Number.parseInt(match[1], 10);
  const minute = match[2];
  const ampm = match[3]?.toUpperCase();

  if (ampm === 'PM' && hour < 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;

  return `${hour.toString().padStart(2, '0')}:${minute}`;
}

export function GridTimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [temp, setTemp] = useState<TimeValue>({
    hour: '12',
    minute: '00',
    ampm: 'AM',
  });

  useEffect(() => {
    if (value) {
      const time12 = to12HourFormat(value);
      const match = time12.match(/^(\d{2}):(\d{2})\s?(AM|PM)$/i);
      if (match) {
        setTemp({
          hour: match[1],
          minute: match[2],
          ampm: match[3]?.toUpperCase() as 'AM' | 'PM',
        });
      }
    }
  }, [value]);

  function handleSelect(col: keyof TimeValue, val: string) {
    const updated = { ...temp, [col]: val };
    setTemp(updated);

    const time12 = `${updated.hour}:${updated.minute} ${updated.ampm}`;
    const time24 = to24HourFormat(time12);
    onChange(time24);
  }

  return (
    <div className="flex w-fit justify-center gap-4 rounded">
      <div className="scroll-bar flex max-h-44 flex-col gap-1 overflow-y-auto">
        {hours.map((val) => (
          <button
            key={val}
            className={`w-10 rounded py-1 text-center ${
              temp.hour === val
                ? 'bg-teal-500/70 font-bold text-teal-950'
                : 'bg-transparent text-teal-950 hover:bg-teal-500'
            } transition`}
            onClick={() => handleSelect('hour', val)}
            type="button"
          >
            {val}
          </button>
        ))}
      </div>
      <div className="scroll-bar flex max-h-44 flex-col gap-1 overflow-y-auto">
        {minutes.map((val) => (
          <button
            key={val}
            className={`w-10 rounded py-1 text-center ${
              temp.minute === val
                ? 'bg-teal-500/70 font-bold text-teal-950'
                : 'bg-transparent text-teal-950 hover:bg-teal-500'
            } transition`}
            onClick={() => handleSelect('minute', val)}
            type="button"
          >
            {val}
          </button>
        ))}
      </div>
      <div className="scroll-bar flex max-h-48 flex-col gap-1 overflow-y-auto">
        {ampm.map((val) => (
          <button
            key={val}
            className={`w-10 rounded py-1 text-center ${
              temp.ampm === val
                ? 'bg-teal-500/70 font-bold text-teal-950'
                : 'bg-transparent text-teal-950 hover:bg-teal-500'
            } transition`}
            onClick={() => handleSelect('ampm', val)}
            type="button"
          >
            {val}
          </button>
        ))}
      </div>
      <style>{`
        .scroll-bar::-webkit-scrollbar {
          width: 0px;
          height: 0;
        }
        .scroll-bar {
            -ms-overflow-style: none;
        }
      `}</style>
    </div>
  );
}
