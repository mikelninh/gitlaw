type LogLevel = 'info' | 'warn' | 'error'

function emit(level: LogLevel, obj: Record<string, unknown>) {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, ...obj })
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export const logger = {
  info: (obj: Record<string, unknown>) => emit('info', obj),
  warn: (obj: Record<string, unknown>) => emit('warn', obj),
  error: (obj: Record<string, unknown>) => emit('error', obj),
}
