import './style.css';
import { initAnalytics } from './analytics';
import { unlockAudio } from './audio';
import { setLocale } from './i18n';
import { createApp } from './ui/app';
import { playScreen } from './ui/screens/play';
import { resultScreen } from './ui/screens/result';
import { titleScreen } from './ui/screens/title';

setLocale('ja');
initAnalytics();
// iOS では利用者が触ったときに音を鳴らせるようにする
document.addEventListener('pointerdown', unlockAudio, { capture: true });
document.addEventListener('keydown', unlockAudio, { capture: true });

const root = document.querySelector<HTMLElement>('#app');
if (root) {
  const app = createApp(root, { title: titleScreen, play: playScreen, result: resultScreen });
  // 開発用：?screen=play で遊ぶ画面、?screen=image・og で画像を直接開く（公開版では無視する）
  const q = import.meta.env.DEV ? new URLSearchParams(location.search) : null;
  const screen = q?.get('screen');
  if (q && (screen === 'image' || screen === 'og')) {
    void import('./dev/preview').then((m) =>
      screen === 'og'
        ? m.previewOg()
        : m.previewResultImage(Number(q.get('seed') ?? 3), Number(q.get('drops') ?? 300), Number(q.get('buy') ?? 0)),
    );
  } else app.go(screen === 'play' ? 'play' : 'title');
}
