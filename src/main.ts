import './style.css';
import { setLocale } from './i18n';
import { createApp } from './ui/app';
import { titleScreen } from './ui/screens/title';

setLocale('ja');

const root = document.querySelector<HTMLElement>('#app');
if (root) createApp(root, { title: titleScreen }).go('title');
