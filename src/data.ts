export const PARTICIPANTES = {
  "Paty": ["Portugal", "Argelia", "Congo", "Usa", "Ghana", "Uruguay", "Iran", "Jordania"],
  "Omar": ["Haiti", "Ecuador", "Belgica", "Costa de Marfil", "Suecia", "Inglaterra", "Chequia", "Arabia Saudita"],
  "Robert": ["Francia", "Alemania", "Croacia", "Korea", "Suiza", "Senegal", "Escocia", "Panama"],
  "Adrian": ["Argentina", "Turquia", "Boznia", "Irak", "Curazao", "Australia", "Sudafrica", "Canada"],
  "Isamar": ["Colombia", "Qatar", "Mexico", "Uzbekistan", "Cabo verde", "Marruecos", "Japón", "Brazil"],
  "Javier": ["España", "Holanda", "Austria", "Egipto", "Paraguay", "Tunez", "Nueva Zelanda", "Noruega"]
};

export const normalizarTexto = (texto: string) => {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

export const EQUIPO_A_PARTICIPANTE = Object.entries(PARTICIPANTES).reduce((acc, [participante, equipos]) => {
  equipos.forEach(equipo => {
    acc[normalizarTexto(equipo)] = participante;
  });
  return acc;
}, {} as Record<string, string>);

export const FLAGS: Record<string, string> = {
  "portugal": "pt", "argelia": "dz", "congo": "cd", "usa": "us", "ghana": "gh", "uruguay": "uy", "iran": "ir", "jordania": "jo",
  "haiti": "ht", "ecuador": "ec", "belgica": "be", "costa de marfil": "ci", "suecia": "se", "inglaterra": "gb-eng", "chequia": "cz", "arabia saudita": "sa",
  "francia": "fr", "alemania": "de", "croacia": "hr", "korea": "kr", "suiza": "ch", "senegal": "sn", "escocia": "gb-sct", "panama": "pa",
  "argentina": "ar", "turquia": "tr", "boznia": "ba", "irak": "iq", "curazao": "cw", "australia": "au", "sudafrica": "za", "canada": "ca",
  "colombia": "co", "qatar": "qa", "mexico": "mx", "uzbekistan": "uz", "cabo verde": "cv", "marruecos": "ma", "japon": "jp", "brazil": "br",
  "espana": "es", "holanda": "nl", "austria": "at", "egipto": "eg", "paraguay": "py", "tunez": "tn", "nueva zelanda": "nz", "noruega": "no"
};

export const TEAM_NAME_TRANSLATIONS: Record<string, string> = {
  "united states": "Usa",
  "spain": "España",
  "netherlands": "Holanda",
  "japan": "Japón",
  "south korea": "Korea",
  "korea republic": "Korea",
  "czechia": "Chequia",
  "czech republic": "Chequia",
  "ivory coast": "Costa de Marfil",
  "cote d'ivoire": "Costa de Marfil",
  "morocco": "Marruecos",
  "germany": "Alemania",
  "france": "Francia",
  "england": "Inglaterra",
  "belgium": "Belgica",
  "switzerland": "Suiza",
  "sweden": "Suecia",
  "saudi arabia": "Arabia Saudita",
  "bosnia and herzegovina": "Boznia",
  "bosnia-herzegovina": "Boznia",
  "south africa": "Sudafrica",
  "algeria": "Argelia",
  "cape verde": "Cabo verde",
  "cape verde islands": "Cabo verde",
  "new zealand": "Nueva Zelanda",
  "norway": "Noruega",
  "turkey": "Turquia",
  "egypt": "Egipto",
  "congo dr": "Congo",
  "dr congo": "Congo",
  "croatia": "Croacia",
  "curacao": "Curazao",
  "iraq": "Irak",
  "jordan": "Jordania",
  "scotland": "Escocia",
  "tunisia": "Tunez"
};

// La búsqueda se hace sin acentos ni mayúsculas para tolerar variantes de la API
// (p.ej. "Curaçao" → "curacao").
export const translateTeamName = (englishName: string) => {
   const norm = normalizarTexto(englishName);
   return TEAM_NAME_TRANSLATIONS[norm] || englishName;
};

export const getFlagUrl = (equipoName: string) => {
  const code = FLAGS[normalizarTexto(equipoName)];
  if (code) return `https://flagcdn.com/w40/${code}.png`;
  return null;
};
