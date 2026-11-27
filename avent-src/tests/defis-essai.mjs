// 24 défis factices pour les essais (les vrais défis ne sont pas dans le dépôt).
export function defisDEssai() {
  const univers = ['gav', 'quiz', '80s', 'psy'];
  return Array.from({ length: 24 }, (_, i) => {
    const j = i + 1;
    const base = { j, univers: j === 24 ? 'final' : univers[i % 4], gros: [6, 13, 20, 24].includes(j), titre: 'Défi ' + j, intro: 'Intro ' + j, question: 'Question ' + j + ' ?', explication: 'Explication ' + j, prod: 'Rien.' };
    return j % 5 === 0 ? { ...base, type: 'code', longueur: 3, code: '1' + String(j).padStart(2, '0') } : { ...base, type: 'qcm', choix: ['A', 'B', 'C', 'D'], bonne: j % 4 };
  });
}
