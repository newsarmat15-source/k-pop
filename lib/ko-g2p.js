// Транскрипция корейского: ре-экспорт для серверного кода.
//
// Сами правила лежат в public/ko-g2p.js — он обязан быть в public/, потому что
// его же грузит браузер (<script src="/ko-g2p.js"> перед app.js). Файл написан
// так, что он одновременно валидный ES-модуль для Node и обычный скрипт для
// браузера: наружу отдаёт globalThis.KoG2P.
//
// Импорт-путь для сервера НЕ менялся: api/song.js как импортировал
// "../lib/ko-g2p.js", так и импортирует. Второй копии правил нет — расхождение
// между тем, что читает сервер, и тем, что показывает тетрадь, невозможно.

import "../public/ko-g2p.js";

const G = globalThis.KoG2P;

export const pronounce = G.pronounce;
export const transcribe = G.transcribe;
export const transcribeLatin = G.transcribeLatin;
export const transcribeCyrillic = G.transcribeCyrillic;
