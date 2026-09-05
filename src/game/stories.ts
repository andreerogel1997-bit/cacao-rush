import type { CharacterDef, CharacterId, WorldId } from "./types.ts";

export type StoryCard = {
  narrator: string;
  kicker: string;
  name: string;
  title: string;
  worldName: string;
  worldTag: string;
  tale: string;
  hook: string;
  power: string;
  invoke: string;
  quote: string;
};

const NARRATOR = "Sol, cronista de la expedición";

type Bio = {
  tale: string;
  invoke: string;
  quote: string;
};

const BIOS: Record<CharacterId, Bio> = {
  maya: {
    tale:
      "Maya se crió entre senderos de niebla. Le gusta el hiking, entrar a pueblos chicos donde nadie pregunta de dónde vienes, y tomarse un café negro mientras el mapa se arruga sobre la mesa. Ama la montaña —el aire fino, el silencio, el camino que no termina— pero guarda un sitio aparte para las islas Galápagos: allí se tira al agua y bucea a pulmón, cuenta las tortugas como quien cuenta amigos, y si hay hambre pesca su propia cena. Recorre mundos nuevos con la mochila ligera y el dash en el pecho, como quien ya aprendió que el salto más largo es el que das cuando el suelo se acaba.",
    invoke:
      "Dash y buceo: en el aire o bajo el agua pulsa J, K, F o Shift. Destello horizontal; bajo el agua apunta con salto o abajo. Maya bucea a pulmón (14 segundos). Los peces restauran el aire — ella pesca para la cena y se llena el pecho. El chocolate caliente también. Trepa muros con WS: pégate y salta hacia la pared para subir.",
    quote: "El café se toma despacio. El vacío, no.",
  },
  teko: {
    tale:
      "Teko dice que un jaguar le enseñó a caer de pie. Creció en la orilla del Napo, cazando frutos y no animales, durmiendo cuando el sol pega y despertando cuando el bosque habla. Le gusta el cacao fresco, el picante que raspa la lengua, y las carreras tontas contra perros de pueblo. Donde otros ven un muro, él ve un trampolín: tres saltos, un gruñido, y ya está más alto que las ceibas. Lleva aretes de semilla y la costumbre de olfatear el viento antes de saltar, como si el aire le debiera un favor.",
    invoke:
      "Super salto: el tercer impulso sale solo en el aire. No hace falta poder. Saltar, saltar, y otra vez. En muros, WS recarga el impulso. El jaguar no pregunta permiso al suelo.",
    quote: "Si el piso se acaba, el cielo todavía no.",
  },
  luma: {
    tale:
      "Luma nació donde el bosque se vuelve nube. Recoge plumas que no son suyas —las deja en ventanas de pueblos altos, como cartas— y canta bajito cuando cruza un abismo. Le gusta el té de muña, las hamacas, y quedarse un día extra en cada pueblo porque alguien le contó una historia. Sus capas no son disfraz: son el recuerdo de un quetzal que una vez le cubrió la lluvia. Planea como quien no tiene prisa, y por eso llega más lejos que los que corren.",
    invoke:
      "Planeo: en el aire mantén el salto (W, arriba o espacio). Caerás despacio, capa abierta. Suelta para caer. También trepa con WS. En el tactil, deja Salto presionado.",
    quote: "El viento no se empuja. Se le pide permiso.",
  },
  rok: {
    tale:
      "Rok fue guardian de un templo antes de ser viajero. Cocina lentejas con ají, repara muros con las manos, y escribe los nombres de los que se perdieron en la piedra para no olvidarlos. Le gusta el silencio de las ruinas, el peso de una buena soga, y las fiestas de pueblo donde nadie le pide que sonría. Cuando golpea el suelo, no es rabia: es un acuerdo con la tierra. Las cajas se rompen, él no. Dice que el cacao crece mejor si alguien se queda a cuidarlo.",
    invoke:
      "Golpe de tierra: en el aire pulsa abajo o Poder (J, K, F, Shift). Aplastas y rompes cajas. Al caer, un instante de impacto. En muros, WS igual que el resto, aunque él baje más pesado.",
    quote: "La tierra aguanta. Yo también.",
  },
  nix: {
    tale:
      "Nix camina de noche porque de día el mundo habla demasiado. Se crió entre faroles de Otavalo y grietas de cerro, con una linterna que casi nunca enciende: ve con las palmas. Le gusta el chocolate amargo, los gatos que no tienen dueño, y dormir en techos. Las cuevas le parecen casas. Las paredes, familias. Donde Maya corre y Teko salta, Nix se pega y sube como una liana que decidió tener opiniones.",
    invoke:
      "Escala maestra: pégate a un muro y mantén el salto para trepar. Hops hacia la pared recargan el doble salto. Su desliz es lento: úsalo. Poder no hace falta; el muro ya es el poder.",
    quote: "El suelo es un rumor. La pared, una promesa.",
  },
};

const HOOKS: Record<CharacterId, Record<WorldId, string>> = {
  maya: {
    selva:
      "Esta selva le huele a primer café. Maya marca el sendero como quien escribe un diario: cada liana es un pueblo que todavía no conoce.",
    ruinas:
      "En las ruinas se queda más de la cuenta, leyendo piedras como menús de pueblo. Dice que aquí alguien ya caminó con la misma sed.",
    rio:
      "El río le recuerda los días en que pescaba para cenar. Maya cruza balsas como quien entra al agua sin miedo: el dash es su brazada.",
    volcan:
      "Montaña de fuego. Ella, que ama la ladera, se toma el calor como un café demasiado cargado: un sorbo, y sigue.",
    templo:
      "El cacao de oro es la excusa. El templo es el pueblo más viejo del mapa, y Maya no se va sin saludar a las paredes.",
    glaciar:
      "Chimborazo es la montaña que soñaba. El hielo le pide otro tipo de senderismo: pasos cortos, dash medido, café imaginario en la cumbre.",
    cueva:
      "Explorar cuevas es su vicio callado. Maya cuenta los ecos como pueblos bajo tierra y usa el dash para no quedarse en la oscuridad.",
    isabela:
      "Aquí se le abre el pecho. Los Túneles, cerca de Puerto Villamil: buceo a pulmón entre leones marinos y tiburones martillo (Sphyrnidae), el cefalofolio plano como un martillo de verdad. Maya pesca para la cena y cuenta las burbujas.",
    amazonia:
      "Otro mundo, otra vereda. Maya entra a la Amazonía como entra a un pueblo nuevo: despacio, con hambre, lista para saltar el río.",
    llamas:
      "Hiking con llamas. Maya habla con ellas como con arrieros de pueblo, y busca al explorador como se busca a un amigo en la feria.",
    quito:
      "El casco le huele a chocolate caliente y a incienso. Maya sube las gradas de San Francisco con la cabeza inclinada —el abanico obliga a la reverencia— y se pierde en el oro de La Compañía como quien entra a un pueblo que ya era centro del mundo: Qui-To.",
    museo:
      "El museo es el pueblo más quieto que ha visitado. Maya deja el café afuera, camina entre vitrinas como entre casas, y se queda delante del Sol de Oro el tiempo que un sendero merece: sin prisa, con las manos en la mochila.",
    cascada:
      "El destello del tótem la trajo detrás de la cortina. Maya bucea la cueva como quien entra a un pueblo que solo existe cuando llueve, y pesca en la poza como si ya fuera hora de cenar.",
    fernandina:
      "Isla joven, lava todavía tibia. Maya rodea Fernandina a pulmón, saluda a los leones y no toca al tiburón: aquí el mapa todavía se está escribiendo.",
    pueblo:
      "Un caserío entre lomas, café en la ventana, nadie pregunta de dónde vienes. Maya se queda más de la cuenta, como siempre.",
    gruta:
      "Una boca chica en la ladera. Maya entra de lado, cuenta los ecos y deja el dash para el tramo que no tiene suelo.",
    risco:
      "Esto sí es hiking. Maya lee las piedras que caen como quien lee un mapa: un paso, un hop, un dash cuando la canaleta se estrecha.",
  },
  teko: {
    selva:
      "La selva es su patio. Teko olfatea el cacao y ya está tres ramas más arriba, riendo como si el tutorial fuera un juego de gatos.",
    ruinas:
      "En la piedra antigua se aburre si no hay altura. Salta las trampas como un jaguar que aprendió a no tocar el piso sagrado.",
    rio:
      "El río hirviendo le parece un reto de feria. Tres saltos sobre balsas y ya está al otro lado, mojado de orgullo.",
    volcan:
      "El calor le gusta. Dice que el jaguar de las brasas vive aquí, y que un super salto vale más que cualquier puente de lava.",
    templo:
      "En el templo se contiene. Un poco. Luego salta el altar porque el cacao de oro está demasiado alto para un humano serio.",
    glaciar:
      "El hielo no perdona las patas. Teko salta de bloque a bloque, orejas atrás, como si el glaciar fuera un lomo enorme.",
    cueva:
      "Oscuridad de jaguar. Teko ve mejor de lo que admite y usa los tres saltos para no pisar lo que brilla raro.",
    isabela:
      "Las islas le pican. Quiere cazar cangrejos —solo para mirarlos— y nadar las mareas como charcos de pueblo, aunque el martillo del tiburón le robe un gruñido.",
    amazonia:
      "Casa. Serpientes, ceibos, el río. Teko no explora: vuelve. Cada super salto es un saludo a los que se quedaron.",
    llamas:
      "Las llamas le caen bien porque no corren de más. Él sí. Sube el páramo a saltos y busca al explorador como a un hermano mayor.",
    quito:
      "Teko entra al Centro Histórico como a una selva de piedra. Siete cruces en García Moreno, tres saltos en las gradas de San Francisco, y el Gallito de la Catedral le parece un jaguar de hierro que también sabe volar.",
    museo:
      "El Sol de Oro le parece un jaguar que aprendió a ser sol. Teko no toca el vidrio: salta las alarmas, olfatea el metal y gruñe bajito, como quien saluda a un hermano mayor de La Tolita.",
    cascada:
      "Detrás del agua hay otro patio. Teko salta las pozas, gruñe a las boas y trata la cueva como un lomo mojado.",
    fernandina:
      "Isla sin permiso. Teko corre la lava joven, salta las mareas y le saca la lengua al tiburón que patrulla demasiado serio.",
    pueblo:
      "Los techos del caserío son trampolines. Teko no pide café: pide altura, y el pueblo se la da.",
    gruta:
      "Oscuridad de jaguar otra vez. Tres saltos, un gruñido, y la cueva chica ya no es chica.",
    risco:
      "Rocas que caen son gatos torpes. Teko las esquiva de un salto y se ríe en la chimenea, tres impulsos más alto que el volcán.",
  },
  luma: {
    selva:
      "Luma entra a la selva cantando bajito. Las lianas son pentagramas. El planeo le deja tiempo para mirar el cacao de cerca.",
    ruinas:
      "Las ruinas le recuerdan nidos de piedra. Planea sobre las sierras como quien no quiere despertar a nadie.",
    rio:
      "Sobre el río de chocolate abre la capa y se queda un segundo más en el aire, como si el cacao oliera a té de muña.",
    volcan:
      "El aire caliente la sostiene. Luma planea de roca en roca y deja una pluma en cada plataforma, por si alguien vuelve.",
    templo:
      "El templo es una iglesia de viento. Ella cruza el vacío sin prisa: el cacao de oro puede esperar a quien sabe caer despacio.",
    glaciar:
      "El viento de Chimborazo es una carta. Luma la lee con la capa abierta y se niega a caer donde el hielo manda.",
    cueva:
      "En la cueva el canto se vuelve eco. Planea entre cristales y no toca el suelo hasta que el suelo se lo pide.",
    isabela:
      "Las islas le recuerdan que las aves también nadan con la mirada. Luma planea sobre Los Túneles y saluda a los leones marinos como a primas que eligieron el mar.",
    amazonia:
      "El dosel es su catedral. Sobre las boas abre las alas y cruza como quien visita a una tía que vive lejos.",
    llamas:
      "El páramo es nido alto. Luma planea junto a las llamas —ellas no vuelan, ella sí— y busca al explorador con una canción.",
    quito:
      "Luma entra a La Compañía y el oro le parece un atardecer quieto. Planea el vacío de las naves, deja una pluma en el cuadro del Infierno, y en las gradas de San Francisco baja la mirada como pedía el abanico.",
    museo:
      "Los rayos del Sol de Oro le parecen plumas de luz. Luma planea el atrio, no toca las vitrinas, y deja el silencio como se deja una canción: a medio terminar, para que el oro la acabe.",
    cascada:
      "La cortina de agua es una lira. Luma planea detrás, deja una pluma en la piedra húmeda y cruza la cueva sin prisa.",
    fernandina:
      "Sobre Fernandina el viento es nuevo. Luma saluda a los cormoranes que eligieron no volar, y ella vuela por ellos.",
    pueblo:
      "Un pueblo alto es un nido. Luma se queda un día extra porque alguien le contó una historia junto al fogón.",
    gruta:
      "El canto se vuelve eco otra vez. Planea el techo bajo y no toca el hielo hasta que el hielo se lo pide.",
    risco:
      "El viento de la canaleta es una carta urgente. Luma planea entre las piedras y deja una pluma en cada saliente, por si alguien vuelve.",
  },
  rok: {
    selva:
      "Rok pisa la selva como quien repara un camino. Cada caja que rompe era un obstáculo para los que vienen detrás.",
    ruinas:
      "Casa vieja. Rok lee los muros, respeta las trampas y golpea solo lo que debe caer. El templo le habla en pesado.",
    rio:
      "El río le parece un trabajo. Plataformas, balsas, un golpe a tiempo. Dice que el cacao líquido también merece un guardian.",
    volcan:
      "El fuego no le asusta: él cocina con ají. Baja como un yunque y sale ileso, dejando el camino más simple.",
    templo:
      "Este es su oficio. El cacao de oro no se roba: se cuida. Rok llega al altar como quien vuelve al turno de la noche.",
    glaciar:
      "El hielo es piedra fría. Rok avanza lento, golpea cuando hay que romper, y no se disculpa por el peso.",
    cueva:
      "En la cueva repara con la mirada. Cada golpe de tierra es un «estoy aquí» para el que se perdió en la oscuridad.",
    isabela:
      "Las islas le parecen templos de sal. Rok no nada de gala: camina las rocas, deja a los leones en paz, y respeta al martillo que patrulla Los Túneles.",
    amazonia:
      "La Amazonía le pide paciencia. Rok no corre de las serpientes: espera, pisa firme, y abre paso a los demás.",
    llamas:
      "Cargar un explorador es trabajo de guardian. Rok camina con las llamas, rompe lo que tapa el sendero, y no deja a nadie atrás.",
    quito:
      "Rok entra al casco como a un templo que todavía tiene turno. Cuidar el oro de La Compañía, no tocar la piedra de Cantuña, y romper solo la caja que tapa el pasadizo: oficio de guardian. Hasta la vuelta, Señor.",
    museo:
      "Aquí el oro no se guarda: se visita. Rok camina las salas como un turno de noche, espera las alarmas, y se detiene ante el Sol de Oro sin alargar la mano. El metal ya tiene guardianes.",
    cascada:
      "Una cueva detrás del agua también pide guardian. Rok pisa la piedra mojada, no corre, y deja el camino más simple para quien venga.",
    fernandina:
      "Lava nueva, templo de sal. Rok respeta al volcán joven: camina las rocas, deja a los leones, y no golpea lo que todavía está naciendo.",
    pueblo:
      "Un caserío es un templo con chimenea. Rok repara el muro que nadie pidió y se sienta cuando el trabajo termina.",
    gruta:
      "Cueva chica, oficio igual. Cada golpe de tierra es un «estoy aquí» para el que se perdió en la ladera.",
    risco:
      "La canaleta pide peso. Rok espera la piedra, pisa cuando pasa, y sube como quien repara un camino vertical.",
  },
  nix: {
    selva:
      "Nix se pega a los primeros muros como quien saluda. La selva de día le parece ruidosa; aun así, sube.",
    ruinas:
      "Piedra antigua, grietas buenas. Nix trepa las ruinas de noche interior, aunque el sol esté alto.",
    rio:
      "Sobre el río busca paredes, no balsas. Donde no hay muro, espera. Donde hay, desaparece hacia arriba.",
    volcan:
      "El volcán es una pared caliente. Nix se desliza despacio, hop a hop, como si la lava fuera un rumor abajo.",
    templo:
      "El templo tiene columnas que son familia. Nix las recorre todas antes de tocar el cacao, por educación.",
    glaciar:
      "Hielo vertical. Su sitio. Nix trepa Chimborazo por el costado que nadie mira y se ríe del viento.",
    cueva:
      "Casa. La Cueva del Cóndor le queda al dedo: oscuridad, agarres, silencio. Aquí no corre: vive.",
    isabela:
      "Los acantilados de Isabela son muros con sal. Nix los sube, mira Los Túneles como una cueva mojada, y no le pide permiso al tiburón.",
    amazonia:
      "Ceibos como catedrales verticales. Nix se pega a la corteza y deja que las serpientes pasen por el suelo, que es de otros.",
    llamas:
      "En el páramo busca farallones. Las llamas caminan; ella trepa. El explorador, dice, se perdió por no mirar las paredes.",
    quito:
      "Nix nace para las criptas. Túneles bajo el adoquín, catacumbas de San Agustín, la piedra que Cantuña dejó sin tocar. Trepa las siete cruces de García Moreno como un rosario vertical y le guiña al Gallito.",
    museo:
      "El atrio es un farallón de madera y oro. Nix trepa las columnas, espera el parpadeo de las alarmas y mira el Sol de Oro desde arriba, que es como se mira al sol de verdad.",
    cascada:
      "Detrás de la cortina hay paredes mojadas. Nix se pega, sube, y trata la cueva como una casa con lluvia adentro.",
    fernandina:
      "Acantilados nuevos, sal reciente. Nix los trepa antes de que el mapa les ponga nombre.",
    pueblo:
      "Los muros del caserío son familia. Nix los recorre de noche interior, aunque el fogón esté encendido.",
    gruta:
      "Casa chica. Nix entra de lado, trepa el hielo y se ríe del viento que se quedó afuera.",
    risco:
      "Paredes de verdad. Nix se pega a la chimenea, deja que las rocas pasen a un palmo y sube como si el risco fuera familia gruñona.",
  },
};

export function getBio(id: CharacterId): Bio {
  return BIOS[id];
}

export type DossierFact = { id: string; label: string; body: string };

export type Dossier = {
  brief: string;
  powerHow: string;
  extra: string;
  facts: DossierFact[];
  quote: string;
  tale: string;
};

const DOSSIERS: Record<CharacterId, Omit<Dossier, "quote" | "tale">> = {
  maya: {
    brief:
      "Exploradora de senderos y pueblos chicos. Corre con el mapa en el pecho: un dash cuando se acaba el suelo, y bajo el agua aguanta el doble que el resto.",
    powerHow:
      "Pulsa J, K, F o Shift para el dash. En el aire es un destello horizontal. Bajo el agua apunta con salto o abajo.",
    extra:
      "Bucea 14 segundos. Los peces le devuelven el aire —pesca para la cena—. El chocolate caliente también llena el pecho. Trepa muros con WS: pégate y salta hacia la pared.",
    facts: [
      { id: "hiking", label: "Hiking", body: "Marca senderos como un diario. El aire fino y el silencio de la montaña le bastan para seguir." },
      { id: "islas", label: "Galápagos", body: "Bucea a pulmón en Los Túneles, cuenta las tortugas como quien cuenta amigos y pesca si hay hambre." },
      { id: "cafe", label: "Café", body: "Negro, en pueblos donde nadie pregunta de dónde vienes. El mapa se arruga sobre la mesa." },
      { id: "muros", label: "Muros", body: "Pégate a la pared (A o D) y salta hacia ella para subir. Cada hop recarga el doble salto." },
    ],
  },
  teko: {
    brief:
      "Jaguar del Napo. Donde otros ven un muro, él ve un trampolín: tres saltos y ya está más alto que las ceibas.",
    powerHow:
      "El tercer salto sale solo en el aire. No hace falta pulsar Poder. Saltar, saltar, y otra vez.",
    extra:
      "En muros, WS recarga el impulso. El jaguar no pregunta permiso al suelo. Corre un poco más ligero que Maya.",
    facts: [
      { id: "napo", label: "Napo", body: "Creció en la orilla, cazando frutos y no animales. Duerme cuando el sol pega y despierta cuando el bosque habla." },
      { id: "cacao", label: "Cacao", body: "Le gusta fresco, el picante que raspa la lengua, y las carreras tontas contra perros de pueblo." },
      { id: "salto", label: "Tres saltos", body: "El primero y el segundo son normales. El tercero —el del jaguar— sale solo. En la pared se recarga." },
      { id: "viento", label: "Viento", body: "Olfatea el aire antes de saltar, como si el cielo le debiera un favor. Aretes de semilla, siempre." },
    ],
  },
  luma: {
    brief:
      "Nació donde el bosque se vuelve nube. Planea sin prisa y por eso llega más lejos que los que corren.",
    powerHow:
      "En el aire mantén el salto (W, flecha arriba o espacio). Caerás despacio, capa abierta. Suelta para caer de verdad.",
    extra:
      "En el tactil, deja Salto presionado. También trepa con WS. Su gravedad es más suave: flota un poco más.",
    facts: [
      { id: "plumas", label: "Plumas", body: "Recoge plumas que no son suyas y las deja en ventanas de pueblos altos, como cartas." },
      { id: "muna", label: "Té de muña", body: "Le gusta el té, las hamacas, y quedarse un día extra en cada pueblo porque alguien le contó una historia." },
      { id: "capa", label: "Capa", body: "No es disfraz: es el recuerdo de un quetzal que una vez le cubrió la lluvia." },
      { id: "viento", label: "Viento", body: "El viento no se empuja. Se le pide permiso. Por eso cruza abismos cantando bajito." },
    ],
  },
  rok: {
    brief:
      "Guardian de templo antes que viajero. Pesa más, cae más firme, y las cajas se rompen: él no.",
    powerHow:
      "En el aire pulsa abajo o Poder (J, K, F, Shift). Aplastas y rompes cajas. Al caer hay un instante de impacto.",
    extra:
      "Trepa con WS igual que el resto, aunque baje más pesado. Camina más lento. Úsalo para abrir paso, no para huir.",
    facts: [
      { id: "templo", label: "Templo", body: "Cocina lentejas con ají, repara muros con las manos, y escribe en la piedra los nombres de los que se perdieron." },
      { id: "tierra", label: "Tierra", body: "Cuando golpea el suelo no es rabia: es un acuerdo. Las cajas se rompen. El camino queda más simple." },
      { id: "cacao", label: "Cacao", body: "Dice que crece mejor si alguien se queda a cuidarlo. El cacao de oro no se roba: se cuida." },
      { id: "fiesta", label: "Pueblo", body: "Le gusta el silencio de las ruinas, el peso de una buena soga, y las fiestas donde nadie le pide que sonría." },
    ],
  },
  nix: {
    brief:
      "Camina de noche porque de día el mundo habla demasiado. Donde Maya corre y Teko salta, Nix se pega y sube.",
    powerHow:
      "Pégate a un muro y mantén el salto para trepar. Cada hop hacia la pared recarga el doble salto. El desliz es lento: úsalo.",
    extra:
      "Poder no hace falta; el muro ya es el poder. Su escala es la más fina del grupo. Busca paredes, no puentes.",
    facts: [
      { id: "otavalo", label: "Otavalo", body: "Se crió entre faroles y grietas de cerro, con una linterna que casi nunca enciende: ve con las palmas." },
      { id: "noche", label: "Noche", body: "Le gusta el chocolate amargo, los gatos que no tienen dueño, y dormir en techos." },
      { id: "cuevas", label: "Cuevas", body: "Le parecen casas. Las paredes, familias. La Cueva del Cóndor le queda al dedo." },
      { id: "muros", label: "Muros", body: "Donde no hay muro, espera. Donde hay, desaparece hacia arriba como una liana con opiniones." },
    ],
  },
};

export function getDossier(id: CharacterId): Dossier {
  const bio = BIOS[id];
  const card = DOSSIERS[id];
  return { ...card, quote: bio.quote, tale: bio.tale };
}


export function splitSpeech(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function characterScript(ch: CharacterDef): string[] {
  const bio = BIOS[ch.id];
  return [
    `Notas de campo. Sol, cronista de la expedición. ${ch.name}, ${ch.title}.`,
    ...splitSpeech(bio.tale),
    bio.quote,
  ];
}

export function voiceBio(ch: CharacterDef): string {
  return characterScript(ch).join(" ");
}

export function fieldScript(story: StoryCard): string[] {
  return [`${story.kicker}. ${story.name}, ${story.title}.`, ...splitSpeech(story.hook), story.quote];
}

export function voiceField(story: StoryCard): string {
  return fieldScript(story).join(" ");
}


export function getStory(ch: CharacterDef, worldId: WorldId, worldName: string, worldTag: string): StoryCard {
  const bio = BIOS[ch.id];
  const hook = HOOKS[ch.id][worldId];
  return {
    narrator: NARRATOR,
    kicker: "Nota de campo",
    name: ch.name,
    title: ch.title,
    worldName,
    worldTag,
    tale: bio.tale,
    hook: hook ?? "",
    power: ch.power,
    invoke: bio.invoke,
    quote: bio.quote,
  };
}
