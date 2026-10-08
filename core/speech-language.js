// Mixed accepts either language. Forcing Bengali corrupts English speech.
export function recognitionLanguage(preference){return ['en','bn'].includes(preference)?preference:'auto';}
