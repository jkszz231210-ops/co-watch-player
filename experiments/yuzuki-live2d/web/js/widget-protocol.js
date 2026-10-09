/** Public host-to-avatar protocol. Animation-only commands, never credentials. */
export const WIDGET_PROTOCOL = 'yuzuki:command';
export const WIDGET_EMOTIONS = new Set(['calm','smile','joy','warm','shy','curious','proud','grumpy','focus','tender','sad','surprise','sleepy','daydream','comfort','thinking']);
const finite = (value, min, max) => Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : null;
export function normalizeWidgetCommand(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || input.type !== WIDGET_PROTOCOL) return null;
  switch (input.command) {
    case 'emotion': return WIDGET_EMOTIONS.has(input.emotion) ? {command:'emotion',emotion:input.emotion} : null;
    case 'say': {
      if (typeof input.text !== 'string') return null;
      const text=input.text.trim().slice(0,180);
      return text ? {command:'say',text,emotion:WIDGET_EMOTIONS.has(input.emotion)?input.emotion:'smile'} : null;
    }
    case 'gaze': {
      const x=finite(input.x,-1,1), y=finite(input.y,-1,1);
      return x===null||y===null ? null : {command:'gaze',x,y};
    }
    case 'motion': return typeof input.enabled==='boolean' ? {command:'motion',enabled:input.enabled} : null;
    case 'ping': return {command:'ping'};
    default: return null;
  }
}
export function widgetEvent(event, detail={}) {
  return {type:'yuzuki:event',event,...detail};
}
