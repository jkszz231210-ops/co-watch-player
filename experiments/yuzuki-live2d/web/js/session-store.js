/** Private local history: OFF by default, opt-in only. No network. */
import {clampHistory} from './interaction-director.js';
export const STORAGE_KEY='yuzuki-v11-local-history';
export const SETTING_KEY='yuzuki-v11-remember-enabled';
export function loadSaved(storage){
 try {
   if(storage.getItem(SETTING_KEY)!=='yes')return {enabled:false,messages:[]};
   return {enabled:true,messages:clampHistory(JSON.parse(storage.getItem(STORAGE_KEY)||'[]'))};
 } catch{return {enabled:false,messages:[]};}
}
export function saveHistory(storage,enabled,messages){
 try{
  if(!enabled){storage.removeItem(STORAGE_KEY);storage.removeItem(SETTING_KEY);return true;}
  storage.setItem(SETTING_KEY,'yes');storage.setItem(STORAGE_KEY,JSON.stringify(clampHistory(messages)));
  return true;
 }catch{return false;}
}
export function clearHistory(storage){
 try{storage.removeItem(STORAGE_KEY);return true;}catch{return false;}
}
