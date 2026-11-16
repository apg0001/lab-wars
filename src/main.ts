import './style.css';
import { App } from './ui/app';

const app = document.querySelector<HTMLDivElement>('#app')!;
const stage = document.createElement('div');
stage.className = 'stage';
app.append(stage);

void new App(stage).start();
