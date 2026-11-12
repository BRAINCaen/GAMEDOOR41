// ==========================================================================
// Éditeur du site — PHRASES LISIBLES pour l'historique et la relecture
// (« Texte modifié : … », « Bloc ajouté », « Image remplacée »…). Module PUR.
// ==========================================================================

const court = (s, n = 70) => {
  const t = String(s == null ? '' : s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
};
const nomBloc = (html) => {
  const m = /data-gdb="([a-z0-9-]+)"/.exec(String(html || ''));
  return m ? m[1].replace(/-/g, ' ') : null;
};
const POS = { avant: 'avant', apres: 'après', debut: 'au début de', fin: 'à la fin de' };

export function resumerOperation(op) {
  if (!op || typeof op !== 'object') return 'Modification';
  if (op.libelle) return court(op.libelle, 140);
  switch (op.op) {
    case 'texte': return 'Texte modifié : « ' + court(op.ancien, 50) + ' » → « ' + court(op.valeur, 50) + ' »';
    case 'html': return 'Texte mis en forme : « ' + court(op.html, 80) + ' »';
    case 'attr':
      if (op.nom === 'href') return 'Lien modifié → ' + court(op.valeur, 80);
      if (op.nom === 'alt') return 'Description d’image : « ' + court(op.valeur, 60) + ' »';
      return 'Réglage « ' + op.nom + ' » modifié';
    case 'classe': return 'Mise en forme modifiée';
    case 'style': return 'Style modifié (' + Object.keys(op.styles || {}).map((a) => ({ tous: 'tous écrans', tablette: 'tablette', telephone: 'téléphone', survol: 'survol' })[a] || a).join(', ') + ')';
    case 'inserer': return 'Ajout ' + (nomBloc(op.html) ? '« ' + nomBloc(op.html) + ' »' : 'de contenu') + ' : « ' + court(op.html, 60) + ' »';
    case 'deplacer': return 'Élément déplacé (' + (POS[op.position] || op.position) + ' un autre)';
    case 'dupliquer': return 'Élément dupliqué';
    case 'supprimer': return 'Ajout annulé avant publication';
    case 'image': return 'Image remplacée' + (op.alt ? ' : « ' + court(op.alt, 60) + ' »' : '');
    case 'meta': return [op.titre != null ? 'Titre Google : « ' + court(op.titre, 60) + ' »' : null, op.description != null ? 'Description Google modifiée' : null, op.image ? 'Image de partage modifiée' : null].filter(Boolean).join(' · ') || 'Informations Google modifiées';
    default: return 'Modification';
  }
}
