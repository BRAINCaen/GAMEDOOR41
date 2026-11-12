// Point d'entrée de l'éditeur du site gamedoor41.fr
import { render } from 'preact';
import { App } from './App.jsx';
import { etat } from './etat.js';

window.__gdxEtat = etat; // lecture seule, pour le diagnostic
render(<App />, document.getElementById('editeur'));
