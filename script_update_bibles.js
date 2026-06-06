const fs = require('fs');
const path = require('path');
const dir = 'C:/Users/PROYECTO JA/AppData/Roaming/himnarioadventistapro/src/versionesBiblias';

function getAbbreviation(translation) {
  if (!translation) return 'UNK';
  const transLower = translation.toLowerCase();
  if (transLower.includes('reina-valera') || transLower.includes('reina valera') || transLower.includes('rvr')) {
    if (transLower.includes('1960')) return 'RVR1960';
    if (transLower.includes('1995')) return 'RVR1995';
    if (transLower.includes('1909')) return 'RVR1909';
    if (transLower.includes('2020')) return 'RV2020';
    if (transLower.includes('1989')) return 'RV1989';
    if (transLower.includes('1569')) return 'RV1569';
    if (transLower.includes('gomez') || transLower.includes('rvg')) return 'RVG';
    return 'RV';
  }
  if (transLower.includes('dios habla hoy') || transLower.includes('dhh')) return 'DHH';
  if (transLower.includes('lenguaje actual') || transLower.includes('tla')) return 'TLA';
  if (transLower.includes('nueva version internacional') || transLower.includes('nvi')) return 'NVI';
  if (transLower.includes('nueva traduccion viviente') || transLower.includes('ntv')) return 'NTV';
  if (transLower.includes('latinoamericana')) return 'BLA';
  if (transLower.includes('jerusalen') || transLower.includes('jerusalem')) return 'BJ';
  if (transLower.includes('lbla') || transLower.includes('americas')) return 'LBLA';
  if (transLower.includes('nblh') || transLower.includes('hispanos')) return 'NBLH';
  if (transLower.includes('palabra de dios para todos') || transLower.includes('pdt')) return 'PDT';
  if (transLower.includes('king james')) return 'KJV';
  if (transLower.includes('tanakh') || transLower.includes('hebreo')) return 'Tanakh';
  if (transLower.includes('palabra')) return 'BLP';
  if (transLower.includes('interconfesional')) return 'BTI';
  
  // generic abbreviation logic
  const words = translation.split(/[\s\-]+/);
  let abbr = '';
  for (const w of words) {
    if (w.length > 0 && w[0].toUpperCase() === w[0] && w.toLowerCase() !== 'biblia' && w.toLowerCase() !== 'version' && w.toLowerCase() !== 'la') {
      abbr += w[0].toUpperCase();
    }
  }
  if (!abbr) abbr = translation.substring(0, 3).toUpperCase();
  return abbr;
}

const files = fs.readdirSync(dir);
let count = 0;
for (const file of files) {
  if (file.endsWith('.json')) {
    const filePath = path.join(dir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      
      if (data.translation && !data.abreviacion) {
        data.abreviacion = getAbbreviation(data.translation);
        
        const match = content.match(/"translation"\s*:\s*"[^"]+",/);
        if (match) {
           const insertStr = `\n  "abreviacion": "${data.abreviacion}",`;
           const newContent = content.slice(0, match.index + match[0].length) + insertStr + content.slice(match.index + match[0].length);
           fs.writeFileSync(filePath, newContent, 'utf8');
           console.log('Updated', file, 'with abbr:', data.abreviacion);
           count++;
        } else {
           console.log('Regex failed for', file, 'might need manual addition or already has it.');
        }
      }
    } catch(e) {
      console.log('Error processing', file, e.message);
    }
  }
}
console.log('Total files updated:', count);
