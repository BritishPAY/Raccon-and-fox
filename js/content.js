// Course content for two sign languages (ASL, LSM) and two interface
// languages (English, Spanish).
// fingers = expected state of index, middle, ring, pinky (drives coaching);
// point = which way the fingers aim on screen; motion = moved in the air.

const T = (en, es) => ({ en, es });

const BASE = {
  A: { thumb: 'side', fingers: ['down', 'down', 'down', 'down'], how: T('Make a fist. Rest your thumb straight up along the side of your index finger.', 'Cierra el puño. Apoya el pulgar recto a un lado del dedo índice.') },
  B: { thumb: 'tuck', fingers: ['up', 'up', 'up', 'up'], how: T('Hold four fingers straight up and together. Fold your thumb across your palm.', 'Cuatro dedos rectos hacia arriba y juntos. Dobla el pulgar sobre la palma.') },
  C: { thumb: 'curve', fingers: ['curve', 'curve', 'curve', 'curve'], how: T('Curve your fingers and thumb as if you are holding a cup.', 'Curva los dedos y el pulgar como si sostuvieras una taza.') },
  D: { thumb: 'touch', fingers: ['up', 'touch', 'touch', 'touch'], how: T('Point your index finger up. Touch the tips of the other fingers to your thumb.', 'Índice hacia arriba. Junta las puntas de los otros dedos con el pulgar.') },
  E: { thumb: 'tuck', fingers: ['down', 'down', 'down', 'down'], how: T('Bend all four fingers down so the tips rest on your thumb, tucked across your palm.', 'Dobla los cuatro dedos hasta que las puntas descansen sobre el pulgar, cruzado sobre la palma.') },
  F: { thumb: 'touch', fingers: ['touch', 'up', 'up', 'up'], how: T('Touch your index fingertip to your thumb. Keep the other three fingers up and spread.', 'Toca la punta del índice con el pulgar. Los otros tres dedos arriba y separados.') },
  G: { thumb: 'side', fingers: ['up', 'down', 'down', 'down'], point: 'side', how: T('Point your index finger and thumb sideways, parallel, like a little beak. Other fingers in a fist.', 'Índice y pulgar apuntando de lado, paralelos, como un piquito. Los demás dedos cerrados.') },
  H: { thumb: 'across', fingers: ['up', 'up', 'down', 'down'], point: 'side', how: T('Point your index and middle fingers sideways, together. Other fingers folded.', 'Índice y medio juntos apuntando de lado. Los demás dedos doblados.') },
  I: { thumb: 'across', fingers: ['down', 'down', 'down', 'up'], how: T('Make a fist with your thumb across the front, then raise only your pinky.', 'Puño con el pulgar por delante; levanta solo el meñique.') },
  J: { thumb: 'across', fingers: ['down', 'down', 'down', 'up'], motion: true, how: T('Make an I, then draw a J in the air with your pinky: down and hook toward you.', 'Haz la I y dibuja una J en el aire con el meñique: hacia abajo y en curva hacia ti.') },
  K: { thumb: 'between', fingers: ['up', 'up', 'down', 'down'], how: T('Index up, middle finger angled forward, thumb tip touching the middle finger between them.', 'Índice arriba, medio inclinado hacia adelante y la punta del pulgar tocando el medio, entre ambos.') },
  L: { thumb: 'out', fingers: ['up', 'down', 'down', 'down'], how: T('Point your index finger up and your thumb out to the side: an "L" shape.', 'Índice hacia arriba y pulgar hacia el lado: una "L".') },
  M: { thumb: 'under', fingers: ['down', 'down', 'down', 'down'], how: T('Make a fist and tuck your thumb under your first three fingers.', 'Puño con el pulgar metido debajo de los primeros tres dedos.') },
  N: { thumb: 'under', fingers: ['down', 'down', 'down', 'down'], how: T('Make a fist and tuck your thumb under your first two fingers.', 'Puño con el pulgar metido debajo de los primeros dos dedos.') },
  O: { thumb: 'touch', fingers: ['touch', 'touch', 'touch', 'touch'], how: T('Curve all fingers so their tips touch your thumb, making a round "O".', 'Curva todos los dedos hasta que las puntas toquen el pulgar: una "O" redonda.') },
  P: { thumb: 'between', fingers: ['up', 'up', 'down', 'down'], point: 'down', how: T('Make a K, then turn your hand so the fingers point down.', 'Haz una K y gira la mano para que los dedos apunten hacia abajo.') },
  Q: { thumb: 'side', fingers: ['up', 'down', 'down', 'down'], point: 'down', how: T('Make a G, then turn it so index finger and thumb point down.', 'Haz una G y gírala para que índice y pulgar apunten hacia abajo.') },
  R: { thumb: 'across', fingers: ['up', 'up', 'down', 'down'], how: T('Raise your index and middle fingers and cross the middle finger over the index.', 'Levanta índice y medio y cruza el medio sobre el índice.') },
  S: { thumb: 'across', fingers: ['down', 'down', 'down', 'down'], how: T('Make a fist and wrap your thumb across the front of your fingers.', 'Puño con el pulgar cruzado por delante de los dedos.') },
  T: { thumb: 'under', fingers: ['down', 'down', 'down', 'down'], how: T('Make a fist and tuck your thumb between your index and middle fingers.', 'Puño con el pulgar metido entre el índice y el medio.') },
  U: { thumb: 'across', fingers: ['up', 'up', 'down', 'down'], how: T('Raise your index and middle fingers, pressed together. Thumb holds the others down.', 'Índice y medio arriba, juntos. El pulgar sujeta los demás.') },
  V: { thumb: 'across', fingers: ['up', 'up', 'down', 'down'], spread: true, how: T('Raise your index and middle fingers and spread them apart, like "peace".', 'Índice y medio arriba y separados, como "paz".') },
  W: { thumb: 'across', fingers: ['up', 'up', 'up', 'down'], spread: true, how: T('Raise index, middle and ring fingers, spread. Thumb holds your pinky down.', 'Índice, medio y anular arriba y separados. El pulgar sujeta el meñique.') },
  X: { thumb: 'across', fingers: ['hook', 'down', 'down', 'down'], how: T('Make a fist, raise your index finger and bend it into a hook.', 'Puño; levanta el índice y dóblalo como un gancho.') },
  Y: { thumb: 'out', fingers: ['down', 'down', 'down', 'up'], how: T('Make a fist, then stretch out your thumb and pinky.', 'Puño; estira el pulgar y el meñique.') },
  Z: { thumb: 'across', fingers: ['up', 'down', 'down', 'down'], motion: true, how: T('Point your index finger and draw a Z in the air: across, back diagonally, across.', 'Apunta con el índice y dibuja una Z en el aire: de lado, en diagonal de regreso y de lado otra vez.') },
  ILY: { thumb: 'out', fingers: ['up', 'down', 'down', 'up'], label: T('I ♥ You', 'Te quiero'), short: 'ILY', how: T('Thumb, index finger and pinky out; middle and ring fingers down. It combines I, L and Y.', 'Pulgar, índice y meñique estirados; medio y anular doblados. Combina I, L y Y.') },
};

// Mexican Sign Language letters that differ from ASL (from Mexican teaching materials).
const LSM_DIFF = {
  G: { thumb: 'side', fingers: ['up', 'down', 'down', 'down'], how: T('Point your index finger up, with your thumb straight up alongside it. Other fingers closed.', 'Índice hacia arriba con el pulgar estirado hacia arriba a su lado. Los demás dedos cerrados.') },
  H: { thumb: 'out', fingers: ['up', 'up', 'down', 'down'], point: 'side', how: T('Index and middle fingers straight and together, pointing sideways; thumb sticks up. Palm faces you.', 'Índice y medio estirados y juntos, apuntando de lado; el pulgar hacia arriba. La palma mira hacia ti.') },
  K: { thumb: 'between', fingers: ['up', 'up', 'down', 'down'], motion: true, how: T('Index and middle up, thumb pad between them. Move your hand upward.', 'Índice y medio arriba, la yema del pulgar entre ellos. Sube la mano.') },
  'Ñ': { thumb: 'under', fingers: ['down', 'down', 'down', 'down'], motion: true, how: T('Make an N (thumb under two fingers) and wiggle your wrist side to side.', 'Haz una N (pulgar bajo dos dedos) y mueve la muñeca de lado a lado.') },
  Q: { thumb: 'curve', fingers: ['curve', 'down', 'down', 'down'], motion: true, how: T('Bend your index finger and thumb into a claw, palm down, and wiggle your wrist side to side.', 'Índice y pulgar en forma de garra, palma hacia abajo, y mueve la muñeca de lado a lado.') },
  X: { thumb: 'curve', fingers: ['curve', 'down', 'down', 'down'], motion: true, how: T('Index finger and thumb in a claw, palm to the side. Move your hand forward and back.', 'Índice y pulgar en forma de garra, palma de lado. Mueve la mano hacia adelante y de regreso.') },
  LL: { thumb: 'out', fingers: ['up', 'down', 'down', 'down'], motion: true, how: T('Make an L and slide it sideways.', 'Haz una L y deslízala hacia un lado.') },
  RR: { thumb: 'across', fingers: ['up', 'up', 'down', 'down'], motion: true, how: T('Make an R (crossed fingers) and wiggle it side to side.', 'Haz una R (dedos cruzados) y muévela de lado a lado.') },
};

export const SIGN_LANGS = {
  asl: { name: T('American Sign Language', 'Lengua de Señas Americana'), short: 'ASL', flag: '🇺🇸' },
  lsm: { name: T('Mexican Sign Language', 'Lengua de Señas Mexicana'), short: 'LSM', flag: '🇲🇽' },
};

export const ALPHABET_BY_LANG = {
  asl: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  lsm: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'LL', 'M', 'N', 'Ñ', 'O', 'P', 'Q', 'R', 'RR', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
};

// Everything the UI needs about one sign, in the chosen languages.
export function sign(id, sl = 'asl', ui = 'en') {
  const src = (sl === 'lsm' && LSM_DIFF[id]) || BASE[id];
  if (!src) return null;
  return { id, ...src, label: src.label ? src.label[ui] : id, short: src.short || id, how: src.how[ui] };
}
export const signIds = (sl) => [...ALPHABET_BY_LANG[sl], ...(sl === 'asl' ? ['ILY'] : [])];

// Split a word into signs (LSM spells LL and RR as one sign each).
export function spell(word, sl = 'asl') {
  const out = [];
  for (let i = 0; i < word.length; i++) {
    const two = word.slice(i, i + 2);
    if (sl === 'lsm' && (two === 'LL' || two === 'RR')) { out.push(two); i++; } else out.push(word[i]);
  }
  return out;
}
export const stepSigns = (step, sl = 'asl') => (step.word ? spell(step.word, sl) : [step.sign]);

const U = (id, title, emoji, blurb, steps) => ({ id, title, emoji, blurb, steps: steps.map((x) => (typeof x === 'string' ? { sign: x } : x)) });
export const UNITS_BY_LANG = {
  asl: [
    U('u1', T('First letters', 'Primeras letras'), '👋', T('Five easy shapes to warm up.', 'Cinco formas fáciles para empezar.'), ['A', 'B', 'L', 'Y', 'I']),
    U('u2', T('Two fingers up', 'Dos dedos arriba'), '✌️', T('U, V, W and their tricky cousins.', 'U, V, W y sus primas difíciles.'), ['U', 'V', 'W', 'K', 'R']),
    U('u3', T('Round shapes', 'Formas redondas'), '⭕', T('Curves and touches.', 'Curvas y toques.'), ['C', 'O', 'D', 'F', 'E']),
    U('u4', T('The fist family', 'La familia del puño'), '✊', T('Same fist, different thumb.', 'El mismo puño, otro pulgar.'), ['S', 'T', 'N', 'M', 'X']),
    U('u5', T('Sideways & down', 'De lado y hacia abajo'), '👉', T('Turn your hand.', 'Gira la mano.'), ['G', 'H', 'Q', 'P']),
    U('u6', T('Letters that move', 'Letras con movimiento'), '✍️', T('Draw them in the air.', 'Dibújalas en el aire.'), ['J', 'Z']),
    U('u7', T('Words for family', 'Palabras para la familia'), '💛', T('Your first words with your child (ASL spells English words).', 'Tus primeras palabras con tu hijo (en ASL se deletrea en inglés).'), ['ILY', { word: 'MOM' }, { word: 'DAD' }, { word: 'MILK' }, { word: 'HUG' }]),
  ],
  lsm: [
    U('u1', T('First letters', 'Primeras letras'), '👋', T('Five easy shapes to warm up.', 'Cinco formas fáciles para empezar.'), ['A', 'B', 'L', 'Y', 'I']),
    U('u2', T('Two fingers up', 'Dos dedos arriba'), '✌️', T('U, V, W, R and the LSM H.', 'U, V, W, R y la H de LSM.'), ['U', 'V', 'W', 'R', 'H']),
    U('u3', T('Round shapes', 'Formas redondas'), '⭕', T('Curves and touches.', 'Curvas y toques.'), ['C', 'O', 'D', 'F', 'E']),
    U('u4', T('The fist family', 'La familia del puño'), '✊', T('Same fist, different thumb.', 'El mismo puño, otro pulgar.'), ['S', 'T', 'N', 'M']),
    U('u5', T('Up & down', 'Arriba y abajo'), '☝️', T('G points up in LSM; P points down.', 'En LSM la G apunta hacia arriba; la P, hacia abajo.'), ['G', 'P']),
    U('u6', T('Letters that move', 'Letras con movimiento'), '✍️', T('J, Z, K, Q and X move in LSM.', 'En LSM, J, Z, K, Q y X llevan movimiento.'), ['J', 'Z', 'K', 'Q', 'X']),
    U('u7', T('Spanish letters', 'Letras del español'), '🇲🇽', T('Ñ, LL and RR.', 'Ñ, LL y RR.'), ['Ñ', 'LL', 'RR']),
    U('u8', T('Words for family', 'Palabras para la familia'), '💛', T('Your first words with your child.', 'Tus primeras palabras con tu hijo.'), [{ word: 'MAMA' }, { word: 'PAPA' }, { word: 'LECHE' }, { word: 'AGUA' }, { word: 'NIÑA' }]),
  ],
};

const say = (who, en, es) => ({ who, text: T(en, es) });
const ask = (en, es, step, note) => ({ who: 'you', prompt: T(en, es), ...step, ...(note ? { note } : {}) });
export const QUESTS_BY_LANG = {
  asl: [
    {
      id: 'q1', title: T('Good morning, Mia', 'Buenos días, Mia'), emoji: '🥣', needs: 'u3',
      blurb: T('Breakfast with your daughter. She can only continue when you answer.', 'Desayuno con tu hija. Ella solo sigue cuando le respondes.'),
      script: [
        say('narrator', 'Mia is 3. She was born deaf, and the two of you are learning to talk with your hands.', 'Mia tiene 3 años. Nació sorda y ustedes están aprendiendo a hablar con las manos.'),
        say('mia', '*Mia climbs onto her chair and rubs her tummy.*', '*Mia se sube a su silla y se frota la pancita.*'),
        ask('Ask her if she wants FOOD.', 'Pregúntale si quiere comida: FOOD.', { word: 'FOOD' }, T('In ASL, FOOD has its own sign. Fingerspelling it works while you learn.', 'En ASL, FOOD tiene su propia seña. Deletrearla sirve mientras aprendes.')),
        say('mia', '*She nods hard and points at the cereal box with a cow on it.*', '*Asiente con fuerza y señala la caja de cereal con una vaca.*'),
        ask('Name the animal on the box.', 'Di el nombre del animal: COW (vaca).', { word: 'COW' }),
        say('mia', '*She pushes her empty cup toward you.*', '*Te acerca su vaso vacío.*'),
        ask('Ask if she wants MILK.', 'Pregúntale si quiere leche: MILK.', { word: 'MILK' }),
        say('mia', '*Mia giggles, holds up her spoon and waits for you.*', '*Mia se ríe, levanta su cuchara y te espera.*'),
        ask('Tell her you love her.', 'Dile que la quieres.', { sign: 'ILY' }),
        say('mia', '*She drops the spoon and signs I-love-you right back.* 💛', '*Suelta la cuchara y te responde "te quiero".* 💛'),
      ],
    },
    {
      id: 'q2', title: T('Park day', 'Día de parque'), emoji: '🛝', needs: 'u5',
      blurb: T('A trip to the park. Keep the conversation going.', 'Un paseo al parque. Sigue la conversación.'),
      script: [
        say('narrator', 'Saturday. Mia has her shoes on before you have your coffee.', 'Sábado. Mia ya tiene los zapatos puestos antes de tu café.'),
        say('mia', '*She points out the window at a big yellow vehicle.*', '*Señala por la ventana un vehículo grande y amarillo.*'),
        ask('Tell her what it is.', 'Dile qué es: BUS (autobús).', { word: 'BUS' }),
        say('mia', '*At the park she slides down the tallest slide and looks at you, eyes wide.*', '*En el parque baja por la resbaladilla más alta y te mira con los ojos muy abiertos.*'),
        ask('Show her how impressed you are.', 'Muéstrale cuánto te impresiona: WOW.', { word: 'WOW' }),
        say('mia', '*She signs "where?" and looks around for someone.*', '*Hace la seña de "¿dónde?" y busca a alguien.*'),
        ask("Tell her who's coming to pick you up.", 'Dile quién viene por ustedes: DAD (papá).', { word: 'DAD' }),
        say('mia', '*Mia runs to you with her arms wide open.*', '*Mia corre hacia ti con los brazos abiertos.*'),
        ask('Ask for a HUG.', 'Pídele un abrazo: HUG.', { word: 'HUG' }),
        say('mia', '*She hugs your leg. Best park day ever.*', '*Te abraza la pierna. El mejor día de parque.*'),
      ],
    },
  ],
  lsm: [
    {
      id: 'q1', title: T('Good morning, Mia', 'Buenos días, Mia'), emoji: '🥣', needs: 'u3',
      blurb: T('Breakfast with your daughter, in LSM. She can only continue when you answer.', 'Desayuno con tu hija, en LSM. Ella solo sigue cuando le respondes.'),
      script: [
        say('narrator', 'Mia is 3. She was born deaf, and the two of you are learning to talk with your hands.', 'Mia tiene 3 años. Nació sorda y ustedes están aprendiendo a hablar con las manos.'),
        say('mia', '*Mia climbs onto her chair and rubs her tummy.*', '*Mia se sube a su silla y se frota la pancita.*'),
        ask('Ask her if she wants COMIDA (food).', 'Pregúntale si quiere COMIDA.', { word: 'COMIDA' }, T('In LSM, COMIDA has its own sign. Fingerspelling it works while you learn.', 'En LSM, COMIDA tiene su propia seña. Deletrearla sirve mientras aprendes.')),
        say('mia', '*She nods hard and points at the cereal box with a cow on it.*', '*Asiente con fuerza y señala la caja de cereal con una vaca.*'),
        ask('Name the animal: VACA (cow).', 'Di el nombre del animal.', { word: 'VACA' }),
        say('mia', '*She pushes her empty cup toward you.*', '*Te acerca su vaso vacío.*'),
        ask('Ask if she wants LECHE (milk).', 'Pregúntale si quiere LECHE.', { word: 'LECHE' }),
        say('mia', '*Mia giggles and leans toward you.*', '*Mia se ríe y se acerca a ti.*'),
        ask('Give her a BESO (kiss).', 'Dale un BESO.', { word: 'BESO' }),
        say('mia', '*She kisses you back on the cheek.* 💛', '*Te devuelve un beso en la mejilla.* 💛'),
      ],
    },
    {
      id: 'q2', title: T('Park day', 'Día de parque'), emoji: '🛝', needs: 'u6',
      blurb: T('A trip to the park, in LSM. Keep the conversation going.', 'Un paseo al parque, en LSM. Sigue la conversación.'),
      script: [
        say('narrator', 'Saturday. Mia has her shoes on before you have your coffee.', 'Sábado. Mia ya tiene los zapatos puestos antes de tu café.'),
        say('mia', '*She points out the window at a big yellow vehicle.*', '*Señala por la ventana un vehículo grande y amarillo.*'),
        ask('Tell her what it is: CAMION (bus).', 'Dile qué es: CAMION.', { word: 'CAMION' }),
        say('mia', '*At the park a dog runs past and Mia points at it.*', '*En el parque pasa corriendo un perro y Mia lo señala.*'),
        ask('Tell her it is a PERRO (dog). Notice the RR!', 'Dile que es un PERRO. ¡Ojo con la RR!', { word: 'PERRO' }),
        say('mia', '*She signs "where?" and looks around for someone.*', '*Hace la seña de "¿dónde?" y busca a alguien.*'),
        ask("Tell her who's coming: PAPA.", 'Dile quién viene: PAPA.', { word: 'PAPA' }),
        say('mia', '*Mia runs to you with her arms wide open.*', '*Mia corre hacia ti con los brazos abiertos.*'),
        ask('Ask for an ABRAZO (hug).', 'Pídele un ABRAZO.', { word: 'ABRAZO' }),
        say('mia', '*She hugs your leg. Best park day ever.*', '*Te abraza la pierna. El mejor día de parque.*'),
      ],
    },
  ],
};

export const ACHIEVEMENTS = {
  first: { emoji: '🌱', title: T('First sign', 'Primera seña'), desc: T('Show your first sign to the camera.', 'Muestra tu primera seña a la cámara.') },
  ten: { emoji: '🔟', title: T('Ten signs', 'Diez señas'), desc: T('Get 10 signs right.', 'Haz bien 10 señas.') },
  unit: { emoji: '📗', title: T('Lesson done', 'Lección terminada'), desc: T('Finish a lesson.', 'Termina una lección.') },
  quest: { emoji: '📖', title: T('Storyteller', 'Cuentacuentos'), desc: T('Finish a story quest.', 'Termina una historia.') },
  sprint: { emoji: '⚡', title: T('Quick hands', 'Manos rápidas'), desc: T('Score 1,000+ in Sign Sprint.', 'Haz 1,000+ puntos en Sign Sprint.') },
  streak3: { emoji: '🔥', title: T('On a roll', 'En racha'), desc: T('Practice 3 days in a row.', 'Practica 3 días seguidos.') },
  perfect10: { emoji: '✨', title: T('Perfect snaps', 'Señas perfectas'), desc: T('Make 10 "Perfect Snap" signs (90%+ precision).', 'Logra 10 señas "Perfect Snap" (90%+ de precisión).') },
  daily: { emoji: '☀️', title: T('Warm-up done', 'Calentamiento listo'), desc: T('Finish a 5-minute daily warm-up.', 'Termina un calentamiento diario de 5 minutos.') },
  gold: { emoji: '🥇', title: T('Gold league', 'Liga de oro'), desc: T('Earn 400 XP in one week.', 'Gana 400 XP en una semana.') },
  family: { emoji: '🏠', title: T('Family Communicator', 'Comunicador familiar'), desc: T('Finish the "Words for family" lesson.', 'Termina la lección "Palabras para la familia".') },
  alphabet: { emoji: '🏅', title: T('Alphabet hero', 'Héroe del alfabeto'), desc: T('Sign every letter of the alphabet correctly at least once.', 'Haz bien cada letra del alfabeto al menos una vez.') },
};

// ---------- Grammar & Deaf culture ("Beyond the hands") ----------
// Kept short and practical for hearing parents. Facts are general to ASL and
// LSM unless marked with `only`.
export const CULTURE = {
  face: [
    { icon: '🤨', drill: 'raise', title: T('Yes/no questions: raise your eyebrows', 'Preguntas de sí o no: levanta las cejas'),
      text: T('In ASL and LSM the question is on your face. Raised eyebrows (and often a slight forward lean) turn "YOU HUNGRY" into "Are you hungry?".', 'En ASL y LSM la pregunta está en tu cara. Las cejas levantadas (y a menudo inclinarte un poco hacia adelante) convierten "TÚ HAMBRE" en "¿Tienes hambre?".') },
    { icon: '😠', drill: 'furrow', title: T('Who, what, where: furrow your brows', 'Quién, qué, dónde: frunce el ceño'),
      text: T('In ASL, questions with WHO, WHAT, WHERE, WHY use lowered, squeezed eyebrows. It is grammar, not anger. LSM also marks questions with the face.', 'En ASL, las preguntas con QUIÉN, QUÉ, DÓNDE, POR QUÉ llevan las cejas bajas y juntas. Es gramática, no enojo. La LSM también marca las preguntas con la cara.') },
    { icon: '🙅', drill: 'shake', title: T('"No" is a head shake', 'El "no" es mover la cabeza'),
      text: T('Shaking your head while you sign makes the sentence negative, in both ASL and LSM. Sometimes the head shake alone is enough.', 'Mover la cabeza de lado a lado mientras haces señas vuelve negativa la oración, en ASL y en LSM. A veces basta con mover la cabeza.') },
    { icon: '😮', only: 'asl', title: T('The mouth shows size and manner', 'La boca muestra tamaño y manera'),
      text: T('ASL uses mouth shapes as grammar: puffed cheeks mean "huge" or "a lot", pressed lips (MM) mean "normally, with ease", and CHA means "really big".', 'ASL usa formas de la boca como gramática: mejillas infladas significan "enorme" o "mucho", labios apretados (MM) significan "normal, con calma" y CHA significa "muy grande".') },
    { icon: '😮', only: 'lsm', title: T('The face shows intensity', 'La cara muestra intensidad'),
      text: T('In LSM, facial expression and head movement are part of the grammar too: they add intensity and mark questions, negation and doubt.', 'En LSM, la expresión facial y el movimiento de la cabeza también son gramática: añaden intensidad y marcan preguntas, negación y duda.') },
  ],
  grammar: [
    { icon: '🔀', title: T('Not English or Spanish on the hands', 'No es inglés ni español con las manos'),
      text: T('Sign languages are full languages with their own grammar and word order. Don\'t translate word by word.', 'Las lenguas de señas son lenguas completas, con su propia gramática y orden de palabras. No traduzcas palabra por palabra.') },
    { icon: '⏰', only: 'asl', title: T('Time first, then the topic', 'Primero el tiempo, luego el tema'),
      text: T('ASL often sets the time and the topic first, then says something about it: TOMORROW STORE, I GO.', 'ASL suele poner primero el tiempo y el tema, y luego lo que se dice de él: MAÑANA TIENDA, YO IR.') },
    { icon: '📍', title: T('Space is grammar', 'El espacio es gramática'),
      text: T('Place a person or thing at a spot in front of you, then point to that spot to talk about them again.', 'Coloca a una persona o cosa en un punto frente a ti y luego señala ese punto para volver a hablar de ella.') },
    { icon: '🔤', title: T('Fingerspelling is for names', 'El deletreo es para nombres'),
      text: T('Most words have their own sign. Fingerspelling is for names, places and new words, and it is where every learner starts.', 'La mayoría de las palabras tienen su propia seña. El deletreo es para nombres, lugares y palabras nuevas, y es donde todos empiezan.') },
  ],
  culture: [
    { icon: '🤟', title: T('Deaf with a capital D', 'Sordo con S mayúscula'),
      text: T('"Deaf" with a capital D means a cultural and linguistic community with its own language, history and humor. Many Deaf people don\'t see deafness as something to fix.', '"Sordo" con mayúscula habla de una comunidad cultural y lingüística, con su propia lengua, historia y humor. Muchas personas Sordas no ven la sordera como algo que hay que arreglar.') },
    { icon: '👋', title: T('Getting attention', 'Cómo llamar la atención'),
      text: T('Wave where they can see you, tap a shoulder gently, or flick the lights. Shouting or grabbing is rude.', 'Saluda con la mano donde te vean, toca suavemente el hombro o prende y apaga la luz. Gritar o jalar es de mala educación.') },
    { icon: '👀', title: T('Keep eye contact', 'Mantén el contacto visual'),
      text: T('Looking away while someone signs is like covering your ears.', 'Mirar a otro lado mientras alguien hace señas es como taparse los oídos.') },
    { icon: '🏷️', title: T('Name signs are given', 'La seña personal se recibe'),
      text: T('A name sign is given to you by Deaf people. You don\'t invent your own.', 'La seña de tu nombre te la dan las personas Sordas. No te la inventas tú.') },
    { icon: '🍽️', title: T('Nobody left out at dinner', 'Nadie excluido en la cena'),
      text: T('Deaf people call it "dinner table syndrome": everyone talks, nobody signs, the deaf child misses everything. Sign at the table, even between hearing family members.', 'Las personas Sordas lo llaman "síndrome de la mesa": todos hablan, nadie hace señas y el niño sordo se pierde todo. Haz señas en la mesa, incluso entre familiares oyentes.') },
    { icon: '🌱', title: T('Language from day one', 'Lengua desde el primer día'),
      text: T('Early access to a full language matters for a child\'s development. You don\'t need to be fluent to start: learn together and meet Deaf adults.', 'El acceso temprano a una lengua completa es importante para el desarrollo de un niño. No necesitas dominarla para empezar: aprendan juntos y conozcan a adultos Sordos.') },
    { icon: '🗣️', title: T('Three languages are a gift', 'Tres idiomas son un regalo'),
      text: T('Sign language, English and Spanish can all live in one home. Being multilingual is an asset, not a problem.', 'Lengua de señas, inglés y español pueden convivir en un mismo hogar. Ser multilingüe es una ventaja, no un problema.') },
  ],
  resources: {
    asl: [
      { name: 'American Society for Deaf Children', url: 'https://deafchildren.org' },
      { name: 'Hands & Voices', url: 'https://handsandvoices.org' },
      { name: 'Laurent Clerc National Deaf Education Center (Gallaudet)', url: 'https://clerccenter.gallaudet.edu' },
    ],
    lsm: [
      { name: T('Mexican Sign Language dictionary (Mexico City)', 'Diccionario de Lengua de Señas Mexicana (CDMX)'), url: 'https://pdh.cdmx.gob.mx/storage/app/media/banner/Dic_LSM%202.pdf' },
      { name: 'Hands & Voices', url: 'https://handsandvoices.org' },
    ],
  },
  lsmNote: T('LSM has been officially recognized as a national language in Mexico since 2005.', 'La LSM es reconocida oficialmente como lengua nacional en México desde 2005.'),
};
