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
        className={`text-sm font-normal tabular-nums text-gray-500 dark:text-gray-400 ${className}`}
      >
        {time}
      </time>
    );
  }

  return (
    <time
      dateTime={isoDateTime}
      className={`text-sm font-normal tabular-nums text-gray-500 dark:text-gray-400 ${className}`}
    >
      {dayOfWeek}. {date} {time}
    </time>
  );
}
