import React from 'react';

interface ConnectionStatusProps {
  status: 'connected' | 'connecting' | 'disconnected';
}

const statusConfig = {
  connected: {
    color: 'bg-emerald-500',
    label: 'Live',
    animate: true,
  },
  connecting: {
    color: 'bg-amber-500',
    label: 'Uppdaterar...',
    animate: true,
  },
  disconnected: {
    color: 'bg-red-500',
    label: 'Återansluter',
    animate: false,
  },
};

export function ConnectionStatus({ status }: ConnectionStatusProps) {
  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div
          className={`w-2 h-2 rounded-full ${config.color} ${
            config.animate ? 'animate-pulse' : ''
          }`}
        />
        {config.animate && (
          <div
            className={`absolute inset-0 rounded-full ${config.color} opacity-75 animate-ping`}
          />
        )}
      </div>
      <span className="text-xs font-body font-medium text-muted-foreground">
        {config.label}
      </span>
    </div>
  );
}
