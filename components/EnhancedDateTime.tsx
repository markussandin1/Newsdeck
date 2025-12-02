'use client';

import { useState, useEffect } from 'react';

interface EnhancedDateTimeProps {
  className?: string;
  showDate?: boolean;
}

export function EnhancedDateTime({ className = '', showDate = true }: EnhancedDateTimeProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const dayOfWeek = currentTime.toLocaleDateString('sv-SE', {
    weekday: 'short',
    timeZone: 'Europe/Stockholm',
  });

  const date = currentTime.toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/Stockholm',
  });

  const time = currentTime.toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Stockholm',
  });

  const isoDateTime = currentTime.toISOString();

  if (!showDate) {
    return (
      <time
        dateTime={isoDateTime}
        className={`text-lg font-display font-semibold tabular-nums text-foreground ${className}`}
      >
        {time}
      </time>
    );
  }

  return (
    <div className={`flex flex-col items-end gap-0.5 ${className}`}>
      <time
        dateTime={isoDateTime}
        className="text-xs text-muted-foreground uppercase tracking-wide"
      >
        {dayOfWeek}
      </time>
      <time dateTime={isoDateTime} className="text-sm font-medium text-foreground">
        {date}
      </time>
      <time
        dateTime={isoDateTime}
        className="text-lg font-display font-semibold tabular-nums text-foreground"
      >
        {time}
      </time>
    </div>
  );
}
