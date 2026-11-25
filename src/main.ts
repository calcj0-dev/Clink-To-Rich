import './style.css';
import { setLocale } from './i18n';
import { createApp } from './ui/app';
import { playScreen } from './ui/screens/play';
import { resultScreen } from './ui/screens/result';
import { titleScreen } from './ui/screens/title';

setLocale('ja');

const root = document.querySelector<HTMLElement>('#app');
if (root) {
  const app = createApp(root, { title: titleScreen, play: playScreen, result: resultScreen });
  // 開発用：?screen=play で遊ぶ画面を直接開く（公開版では無視する）
  const screen = import.meta.env.DEV ? new URLSearchParams(location.search).get('screen') : null;
  app.go(screen === 'play' ? 'play' : 'title');
}
